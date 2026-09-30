"use client";

import { AlarmClock, Check, Clock3, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type Reminder={id:string;title:string;remindAt:string;status:string;ringSeconds:number;snoozedUntil?:string|null};

function localInputValue(date=new Date(Date.now()+60*60_000)){
  const offset=date.getTimezoneOffset()*60_000;
  return new Date(date.getTime()-offset).toISOString().slice(0,16);
}
function pretty(value:string){
  try{return new Intl.DateTimeFormat("en-AU",{dateStyle:"full",timeStyle:"short"}).format(new Date(value))}
  catch{return value}
}

export function ReminderManager(){
  const [reminders,setReminders]=useState<Reminder[]>([]);
  const [title,setTitle]=useState("");
  const [when,setWhen]=useState(localInputValue());
  const [ring,setRing]=useState(true);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState("");

  async function load(){
    const res=await fetch("/api/reminders",{cache:"no-store"});
    if(res.ok)setReminders((await res.json()).reminders||[]);
  }
  useEffect(()=>{void load()},[]);

  async function create(){
    if(!title.trim())return setStatus("Give the reminder a title.");
    setBusy(true);
    try{
      const date=new Date(when);
      if(Number.isNaN(date.getTime()))throw new Error("Choose a valid date and time.");
      const res=await fetch("/api/reminders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:title.trim(),remindAt:date.toISOString(),ringSeconds:ring?3:0})});
      const body=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(body.error||"Could not create reminder.");
      setTitle("");setWhen(localInputValue());setStatus("Reminder set. Zoro has it.");await load();
    }catch(error){setStatus(error instanceof Error?error.message:"Could not create reminder.")}
    finally{setBusy(false)}
  }

  async function action(id:string,action:"done"|"snooze",minutes?:number){
    const res=await fetch("/api/reminders",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,action,minutes})});
    const body=await res.json().catch(()=>({}));
    setStatus(res.ok?(action==="done"?"Reminder completed.":`Snoozed for ${minutes} minutes.`):(body.error||"Could not update reminder."));
    await load();
  }

  async function remove(id:string){
    if(!window.confirm("Delete this reminder?"))return;
    const res=await fetch("/api/reminders",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
    const body=await res.json().catch(()=>({}));
    setStatus(res.ok?"Reminder deleted.":(body.error||"Could not delete reminder."));
    await load();
  }

  return <div className="notification-control-shell">
    <section className="notification-hero">
      <div><span className="nexus-kicker">ZORO REMINDER ENGINE</span><h1>Reminders</h1><p>Set it once. Zoro keeps watch so your brain does not have to pretend it is a calendar.</p></div>
      <div className="notification-status-orb"><AlarmClock size={28}/><b>{reminders.length}</b><small>active</small></div>
    </section>

    <section className="notification-grid">
      <div className="notification-panel">
        <div className="notification-section-title"><div><Plus size={18}/><span><b>Set a reminder</b><small>Choose exactly what and when.</small></span></div></div>
        <div className="reminder-form">
          <label><span>Remind me to</span><input value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void create()}} placeholder="Take medicine, call someone, submit a form…"/></label>
          <label><span>Date & time</span><input type="datetime-local" value={when} onChange={e=>setWhen(e.target.value)}/></label>
          <label className="notify-switch compact"><span><b>Ring for 3 seconds</b><small>Plays while Zoro is active. Push notification settings control background alerts.</small></span><input type="checkbox" checked={ring} onChange={()=>setRing(!ring)}/></label>
          <button onClick={create} disabled={busy}><Clock3 size={15}/>{busy?"Setting…":"Set reminder"}</button>
        </div>
      </div>

      <div className="notification-panel">
        <div className="notification-section-title"><div><Clock3 size={18}/><span><b>Upcoming</b><small>{reminders.length} active reminder{reminders.length===1?"":"s"}</small></span></div></div>
        <div className="reminder-list">
          {reminders.length?reminders.map(item=><div className={"reminder-row "+(item.status==="FIRED"?"fired":"")} key={item.id}>
            <div><b>{item.title}</b><small>{item.status==="FIRED"?"Waiting for you · ":""}{pretty(item.snoozedUntil||item.remindAt)}</small></div>
            <div>
              <button title="Snooze 10 minutes" onClick={()=>action(item.id,"snooze",10)}>10m</button>
              <button title="Snooze 30 minutes" onClick={()=>action(item.id,"snooze",30)}>30m</button>
              <button title="Complete" onClick={()=>action(item.id,"done")}><Check size={14}/></button>
              <button title="Delete" onClick={()=>remove(item.id)}><Trash2 size={14}/></button>
            </div>
          </div>):<p className="notification-empty">No active reminders. Suspiciously organised.</p>}
        </div>
      </div>
    </section>
    {status&&<div className="notification-toast" role="status">{status}</div>}
  </div>
}