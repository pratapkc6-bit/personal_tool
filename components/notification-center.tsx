"use client";

import { BellRing, Check, Clock3, History, MoonStar, Plus, Send, Smartphone, Volume2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { playZoroAlarm } from "@/components/notification-runtime";

type Category="ntHolidays"|"nepaliCalendar"|"importantGmail"|"deadlines"|"followups"|"calendar"|"weather"|"personalReminders";
type Settings={
  masterEnabled:boolean;pushEnabled:boolean;inAppEnabled:boolean;alarmEnabled:boolean;alarmSeconds:number;
  quietHours:{enabled:boolean;start:string;end:string;allowUrgent:boolean};categories:Record<Category,boolean>
};
type SettingsResponse={settings:Settings;push:{configured:boolean;publicKey:string;subscriptions:number}};
type Reminder={id:string;title:string;remindAt:string;status:string;ringSeconds:number;snoozedUntil?:string|null};
type Notice={id:string;category:string;priority:string;title:string;body:string;source?:string|null;readAt?:string|null;createdAt:string;metadata?:unknown};

const categoryRows:Array<{key:Category;title:string;copy:string;icon:string}>=[
  {key:"personalReminders",title:"Reminders & alarms",copy:"Your Zoro reminders, including the 3-second alarm.",icon:"⏰"},
  {key:"importantGmail",title:"Important Gmail",copy:"Action-required High or Urgent email intelligence.",icon:"📧"},
  {key:"deadlines",title:"Tasks & deadlines",copy:"Due-soon and overdue missions.",icon:"🎯"},
  {key:"followups",title:"Waiting & follow-ups",copy:"Things you are waiting to hear back about.",icon:"👀"},
  {key:"calendar",title:"Calendar commitments",copy:"Upcoming linked Google Calendar events.",icon:"📅"},
  {key:"ntHolidays",title:"NT & Darwin holidays",copy:"Darwin Show Day, Picnic Day and NT public holidays.",icon:"🇦🇺"},
  {key:"nepaliCalendar",title:"Nepali Patro days",copy:"Festivals plus Purnima, Aunsi and Ekadashi.",icon:"🇳🇵"},
  {key:"weather",title:"Darwin weather watch",copy:"High-rain, strong-wind and thunderstorm conditions.",icon:"⛈️"},
];

function base64ToUint8Array(base64:string){
  const padding="=".repeat((4-base64.length%4)%4),base64Safe=(base64+padding).replace(/-/g,"+").replace(/_/g,"/");
  const raw=window.atob(base64Safe);return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}
function localInputValue(date=new Date(Date.now()+60*60_000)){
  const offset=date.getTimezoneOffset()*60_000;return new Date(date.getTime()-offset).toISOString().slice(0,16);
}
function pretty(value:string){try{return new Intl.DateTimeFormat("en-AU",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value))}catch{return value}}

export function NotificationCenter(){
  const [data,setData]=useState<SettingsResponse|null>(null),[reminders,setReminders]=useState<Reminder[]>([]),[history,setHistory]=useState<Notice[]>([]);
  const [status,setStatus]=useState(""),[busy,setBusy]=useState(false),[title,setTitle]=useState(""),[when,setWhen]=useState(localInputValue()),[ring,setRing]=useState(true);
  const permission=typeof Notification==="undefined"?"unsupported":Notification.permission;
  const unread=useMemo(()=>history.filter(item=>!item.readAt).length,[history]);

  async function load(){
    const [s,r,h]=await Promise.all([
      fetch("/api/notifications/settings",{cache:"no-store"}),
      fetch("/api/reminders",{cache:"no-store"}),
      fetch("/api/notifications/history?limit=60",{cache:"no-store"})
    ]);
    if(s.ok)setData(await s.json());if(r.ok)setReminders((await r.json()).reminders||[]);if(h.ok)setHistory((await h.json()).notifications||[]);
  }
  useEffect(()=>{void load()},[]);

  async function saveSettings(next:Settings){
    if(!data)return;setData({...data,settings:next});setStatus("Saving preferences…");
    const res=await fetch("/api/notifications/settings",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(next)});
    const body=await res.json().catch(()=>({}));
    setStatus(res.ok?"Notification preferences saved.":body.error||"Could not save preferences.");
    if(res.ok)setData(current=>current?{...current,settings:body.settings}:current);
  }
  function patchSettings(patch:Partial<Settings>){if(data)void saveSettings({...data.settings,...patch})}
  function toggleCategory(key:Category){if(data)void saveSettings({...data.settings,categories:{...data.settings.categories,[key]:!data.settings.categories[key]}})}

  async function enablePush(){
    if(!data)return;setBusy(true);setStatus("Enabling notifications…");
    try{
      if(!("Notification" in window)||!("serviceWorker" in navigator))throw new Error("This browser does not support web push.");
      const allowed=await Notification.requestPermission();if(allowed!=="granted")throw new Error("Notification permission was not granted.");
      if(!data.push.configured||!data.push.publicKey)throw new Error("Push is ready in the app, but VAPID keys still need to be added in Vercel.");
      const registration=await navigator.serviceWorker.register("/zoro-sw.js");
      const existing=await registration.pushManager.getSubscription();
      const subscription=existing||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:base64ToUint8Array(data.push.publicKey)});
      const res=await fetch("/api/notifications/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(subscription.toJSON())});
      const body=await res.json().catch(()=>({}));if(!res.ok)throw new Error(body.error||"Could not register this device.");
      setStatus("Notifications enabled on this device.");await load();
    }catch(error){setStatus(error instanceof Error?error.message:"Could not enable notifications.")}
    finally{setBusy(false)}
  }
  async function disablePush(){
    setBusy(true);
    try{
      const registration=await navigator.serviceWorker?.getRegistration("/zoro-sw.js"),subscription=await registration?.pushManager.getSubscription();
      if(subscription){await fetch("/api/notifications/subscribe",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({endpoint:subscription.endpoint})});await subscription.unsubscribe()}
      setStatus("Push disabled on this device.");await load();
    }finally{setBusy(false)}
  }
  async function test(){
    playZoroAlarm(3);setStatus("Playing the 3-second local alarm and sending a test alert…");
    const res=await fetch("/api/notifications/test",{method:"POST"}),body=await res.json().catch(()=>({}));
    setStatus(res.ok?(body.pushed?(`Test push sent to ${body.pushed} device${body.pushed===1?"":"s"}.`):"Alarm tested. No push device is currently registered."):(body.error||"Test failed."));
    await load();
  }
  async function addReminder(){
    if(!title.trim())return setStatus("Give the reminder a title.");
    setBusy(true);
    try{
      const date=new Date(when);if(Number.isNaN(date.getTime()))throw new Error("Choose a valid reminder date and time.");
      const res=await fetch("/api/reminders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:title.trim(),remindAt:date.toISOString(),ringSeconds:ring?3:0})});
      const body=await res.json().catch(()=>({}));if(!res.ok)throw new Error(body.error||"Could not create reminder.");
      setTitle("");setWhen(localInputValue());setStatus("Reminder created.");await load();
    }catch(error){setStatus(error instanceof Error?error.message:"Could not create reminder.")}
    finally{setBusy(false)}
  }
  async function reminderAction(id:string,action:"done"|"snooze",minutes?:number){
    const res=await fetch("/api/reminders",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,action,minutes})});
    const body=await res.json().catch(()=>({}));setStatus(res.ok?(action==="done"?"Reminder completed.":(`Snoozed for ${minutes} minutes.`)):(body.error||"Could not update reminder."));await load();
  }
  async function markAllRead(){
    await fetch("/api/notifications/history",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"read-all"})});await load();
  }

  if(!data)return <section className="notification-control-shell"><div className="notification-loading">Zoro is loading your alert controls…</div></section>;
  const s=data.settings;
  return <div className="notification-control-shell">
    <section className="notification-hero">
      <div><span className="nexus-kicker">ZORO ALERT ENGINE</span><h1>Tell Zoro what is allowed to interrupt you.</h1><p>Push notifications, personal reminders, Darwin/NT holidays, Nepali Patro, Gmail intelligence, deadlines and watches all live here.</p></div>
      <div className="notification-status-orb"><BellRing size={28}/><b>{data.push.subscriptions}</b><small>push device{data.push.subscriptions===1?"":"s"}</small></div>
    </section>

    <section className="notification-grid">
      <div className="notification-panel notification-device">
        <div className="notification-panel-head"><div><Smartphone size={18}/><span><b>This device</b><small>Permission: {permission}</small></span></div><span className={data.push.configured?"notify-dot ready":"notify-dot"}>{data.push.configured?"server ready":"needs VAPID"}</span></div>
        <div className="notification-actions"><button onClick={enablePush} disabled={busy}>Enable notifications</button><button onClick={disablePush} disabled={busy}>Disable on this device</button><button onClick={test}><Volume2 size={15}/> Test 3-sec alarm</button></div>
        {!data.push.configured&&<p className="notification-note">The app code is push-ready. Add VAPID keys in Vercel to enable lock-screen Web Push. In-app reminders and alarms still work without them.</p>}
      </div>

      <div className="notification-panel">
        <div className="notification-panel-head"><div><MoonStar size={18}/><span><b>Delivery rules</b><small>Control when Zoro is allowed to make noise.</small></span></div></div>
        <label className="notify-switch"><span><b>Master notifications</b><small>Turn the entire alert engine on or off.</small></span><input type="checkbox" checked={s.masterEnabled} onChange={()=>patchSettings({masterEnabled:!s.masterEnabled})}/></label>
        <label className="notify-switch"><span><b>Push notifications</b><small>Lock Screen / Notification Center when Web Push is connected.</small></span><input type="checkbox" checked={s.pushEnabled} onChange={()=>patchSettings({pushEnabled:!s.pushEnabled})}/></label>
        <label className="notify-switch"><span><b>3-second alarm</b><small>Urgent reminders ring while Zoro is active; background uses the system notification sound.</small></span><input type="checkbox" checked={s.alarmEnabled} onChange={()=>patchSettings({alarmEnabled:!s.alarmEnabled})}/></label>
        <label className="notify-switch"><span><b>Quiet hours</b><small>Urgent reminders can still break through.</small></span><input type="checkbox" checked={s.quietHours.enabled} onChange={()=>void saveSettings({...s,quietHours:{...s.quietHours,enabled:!s.quietHours.enabled}})}/></label>
        {s.quietHours.enabled&&<div className="quiet-grid"><label><span>From</span><input type="time" value={s.quietHours.start} onChange={e=>void saveSettings({...s,quietHours:{...s.quietHours,start:e.target.value}})}/></label><label><span>Until</span><input type="time" value={s.quietHours.end} onChange={e=>void saveSettings({...s,quietHours:{...s.quietHours,end:e.target.value}})}/></label></div>}
      </div>
    </section>

    <section className="notification-panel">
      <div className="notification-section-title"><div><Send size={18}/><span><b>What may notify me?</b><small>Every source can be controlled independently.</small></span></div></div>
      <div className="notification-category-grid">{categoryRows.map(row=><label className="notification-category" key={row.key}><span className="notification-category-icon">{row.icon}</span><span><b>{row.title}</b><small>{row.copy}</small></span><input type="checkbox" checked={s.categories[row.key]} onChange={()=>toggleCategory(row.key)}/></label>)}</div>
    </section>

    <section className="notification-grid">
      <div className="notification-panel">
        <div className="notification-section-title"><div><Plus size={18}/><span><b>Create reminder</b><small>Zoro will keep it until it fires, is snoozed or completed.</small></span></div></div>
        <div className="reminder-form"><label><span>Reminder</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Take medicine, call someone, submit form…"/></label><label><span>Date & time</span><input type="datetime-local" value={when} onChange={e=>setWhen(e.target.value)}/></label><label className="notify-switch compact"><span><b>Ring for 3 seconds</b><small>While the app is active.</small></span><input type="checkbox" checked={ring} onChange={()=>setRing(!ring)}/></label><button onClick={addReminder} disabled={busy}><Clock3 size={15}/> Set reminder</button></div>
      </div>

      <div className="notification-panel">
        <div className="notification-section-title"><div><Clock3 size={18}/><span><b>Upcoming reminders</b><small>{reminders.length} active</small></span></div></div>
        <div className="reminder-list">{reminders.length?reminders.map(item=><div className={"reminder-row "+(item.status==="FIRED"?"fired":"")} key={item.id}><div><b>{item.title}</b><small>{item.status==="FIRED"?"Waiting for you":pretty(item.snoozedUntil||item.remindAt)}</small></div><div><button onClick={()=>reminderAction(item.id,"snooze",10)}>10m</button><button onClick={()=>reminderAction(item.id,"snooze",30)}>30m</button><button onClick={()=>reminderAction(item.id,"done")}><Check size={14}/></button></div></div>):<p className="notification-empty">No active reminders.</p>}</div>
      </div>
    </section>

    <section className="notification-panel">
      <div className="notification-section-title"><div><History size={18}/><span><b>Notification history</b><small>{unread} unread · why Zoro interrupted you, preserved.</small></span></div><button onClick={markAllRead}>Mark all read</button></div>
      <div className="notification-history">{history.length?history.map(item=><article className={"notification-history-row "+(!item.readAt?"unread":"")+" "+item.priority.toLowerCase()} key={item.id}><span className="history-priority">{item.priority==="CRITICAL"?"!":item.priority==="IMPORTANT"?"•":"·"}</span><div><div><b>{item.title}</b><small>{item.source||item.category} · {pretty(item.createdAt)}</small></div><p>{item.body}</p></div></article>):<p className="notification-empty">Nothing here yet. Zoro has been merciful.</p>}</div>
    </section>
    {status&&<div className="notification-toast" role="status">{status}</div>}
  </div>
}
