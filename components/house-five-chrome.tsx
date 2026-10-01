"use client";

import Link from "next/link";
import { Bell, CalendarDays, ChevronLeft, ChevronRight, CloudSun, ExternalLink, Moon, Sun, X } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

type PatroDay={year:number;month:number;day:number;dayNp:string;ad:string;weekdayNp:string;weekdayEn:string;tithiName?:string;tithiNameNp?:string;paksha?:string;nakshatraName?:string;nakshatraNameNp?:string;yogaName?:string;yogaNameNp?:string;karanaName?:string;karanaNameNp?:string;holidays?:string[];events?:string[];isHoliday?:boolean};
type Weather={icon:string;max:number|null;min:number|null;rainChance:number|null;rainMm:number|null;windMax:number|null};
type NtHoliday={title:string;kind:string};
type PatroMonth={year:number;yearNp:string;month:number;monthNameNp:string;monthNameEn:string;totalDays:number;startWeekday:number;minYear:number;maxYear:number;today:{year:number;month:number;day:number};days:PatroDay[];weather:Record<string,Weather>;ntHolidays:Record<string,NtHoliday[]>;source?:string};
type CalendarEvent={id?:string;title?:string;start?:string;allDay?:boolean;extendedProps?:{category?:string;description?:string}};

const DARK_REALM_SNOW=Array.from({length:38},(_,i)=>({
  id:i,
  style:{
    "--snow-left":`${((i*37.17)%100).toFixed(2)}%`,
    "--snow-size":`${(2.5+(i%7)*.68).toFixed(2)}px`,
    "--snow-duration":`${(9+(i%11)*.93).toFixed(2)}s`,
    "--snow-delay":`${(-((i*1.47)%18)).toFixed(2)}s`,
    "--snow-drift":`${(-28+((i*17)%57)).toFixed(1)}px`,
    "--snow-opacity":`${(.34+(i%8)*.075).toFixed(2)}`
  } as CSSProperties
}));

function addDays(date:string,delta:number){const d=new Date(date+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10)}
function eventDate(event:CalendarEvent){const value=event.start||"";if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;const d=new Date(value);if(Number.isNaN(d.getTime()))return "";return new Intl.DateTimeFormat("en-CA",{timeZone:"Australia/Darwin",year:"numeric",month:"2-digit",day:"2-digit"}).format(d)}
function weatherLabel(w?:Weather){if(!w)return "";const hi=Number.isFinite(Number(w.max))?Math.round(Number(w.max))+"°":"";return [w.icon||"🌦️",hi].filter(Boolean).join(" ")}
function selectedTitle(day:PatroDay|null,month:PatroMonth|null){if(!day)return "Calendar reminder";const nt=month?.ntHolidays?.[day.ad]?.[0]?.title;return nt||day.holidays?.[0]||day.events?.[0]||`Nepali calendar · ${day.dayNp} ${month?.monthNameNp||""}`}

export function HouseFiveChrome(){
  const [theme,setTheme]=useState<"normal"|"dark">("normal");
  const [open,setOpen]=useState(false);
  const [loading,setLoading]=useState(false);
  const [month,setMonth]=useState<PatroMonth|null>(null);
  const [selected,setSelected]=useState<PatroDay|null>(null);
  const [events,setEvents]=useState<CalendarEvent[]>([]);
  const [status,setStatus]=useState("");
  const [realmFlash,setRealmFlash]=useState(false);

  useEffect(()=>{const stored=localStorage.getItem("zoro-house-five-theme");const next=stored==="dark"?"dark":"normal";setTheme(next);document.documentElement.dataset.theme=next},[]);
  function toggleTheme(){
    const next=theme==="dark"?"normal":"dark";
    setTheme(next);localStorage.setItem("zoro-house-five-theme",next);document.documentElement.dataset.theme=next;
    if(next==="dark"){setRealmFlash(true);window.setTimeout(()=>setRealmFlash(false),1150)}
  }

  async function enrichDay(day:PatroDay){try{const res=await fetch(`/api/patro?year=${day.year}&month=${day.month}&day=${day.day}`,{cache:"no-store"});const data=await res.json();if(res.ok&&data.detail)setSelected(data.detail)}catch{}}
  async function loadPatro(year?:number,monthNo?:number,keepDay?:number){
    setLoading(true);setStatus("");
    try{
      const q=new URLSearchParams();if(year)q.set("year",String(year));if(monthNo)q.set("month",String(monthNo));
      const res=await fetch("/api/patro?"+q.toString(),{cache:"no-store"});const data=await res.json();if(!res.ok)throw new Error(data.error||"Patro unavailable");
      const m=data.calendar as PatroMonth;setMonth(m);
      const first=m.days[0]?.ad,last=m.days[m.days.length-1]?.ad;
      if(first&&last){const ev=await fetch(`/api/calendar/events?start=${encodeURIComponent(first+"T00:00:00+09:30")}&end=${encodeURIComponent(addDays(last,1)+"T00:00:00+09:30")}`,{cache:"no-store"});if(ev.ok)setEvents(await ev.json())}
      const wanted=keepDay||((m.today.year===m.year&&m.today.month===m.month)?m.today.day:0);const local=m.days.find(d=>d.day===wanted)||null;setSelected(local);if(local)void enrichDay(local)
    }catch(e){setStatus(e instanceof Error?e.message:"Patro unavailable")}finally{setLoading(false)}
  }
  function openPatro(){setOpen(true);if(!month)void loadPatro()}
  function move(delta:number){if(!month)return;let y=month.year,m=month.month+delta;if(m<1){m=12;y--}if(m>12){m=1;y++}if(y<month.minYear||y>month.maxYear)return;void loadPatro(y,m)}
  const eventsByDate=useMemo(()=>{const map:Record<string,CalendarEvent[]>={};for(const ev of events){const d=eventDate(ev);if(!d)continue;(map[d]||=[]).push(ev)}return map},[events]);

  async function createReminder(preset:"same"|"day"){
    if(!selected)return;setStatus("Creating reminder…");
    const date=preset==="day"?addDays(selected.ad,-1):selected.ad;const start=`${date}T08:00:00+09:30`,end=`${date}T08:30:00+09:30`;const summary="Reminder: "+selectedTitle(selected,month);
    const res=await fetch("/api/calendar/events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({summary,description:`Created from Zoro Nepali Patro for ${selected.ad}.`,start,end,category:"REMINDER",confirmed:true})});
    const data=await res.json().catch(()=>({}));setStatus(res.ok?"Reminder added to Google Calendar.":(data.error||"Could not create reminder."));if(res.ok&&month)void loadPatro(month.year,month.month,selected.day)
  }

  const selectedWeather=selected&&month?month.weather?.[selected.ad]:undefined;
  const selectedNt=selected&&month?month.ntHolidays?.[selected.ad]||[]:[];
  const selectedGoogle=selected?eventsByDate[selected.ad]||[]:[];

  return <>
    <div className={theme==="dark"?"snowfall-layer active":"snowfall-layer"} aria-hidden="true">
      {DARK_REALM_SNOW.map(f=><i key={f.id} className="snowflake" style={f.style}/>) }
    </div>
    <div className={realmFlash?"realm-transition show":"realm-transition"} aria-hidden="true">
      <div className="realm-transition-art"/><div className="realm-transition-copy"><small>ZORO NEXUS</small><b>ENTERING DARK REALM</b><span>हिमरात्रि · THE MOUNTAIN IS AWAKE</span></div>
    </div>
    <div className="hf-shell-controls">
      <Link href="/notifications" className="hf-notification-toggle" aria-label="Open Zoro alerts" title="Alerts"><Bell size={17}/></Link>
      <button className="hf-patro-toggle" onClick={openPatro} aria-label="Open Nepali Patro" title="नेपाली पात्रो"><span>पात्रो</span><b>ने</b></button>
      <button className="hf-theme-toggle" onClick={toggleTheme} aria-label={theme==="dark"?"Switch to normal mode":"Enter Dark Realm"} title={theme==="dark"?"Normal mode":"Dark Realm"}>{theme==="dark"?<Sun size={17}/>:<Moon size={17}/>}</button>
    </div>

    {open&&<div className="hf-patro-backdrop" onClick={()=>setOpen(false)}>
      <section className="hf-patro-modal" onClick={e=>e.stopPropagation()} aria-label="Nepali Patro">
        <header className="hf-patro-head"><div className="hf-patro-brand"><span>पात्रो</span><div><strong>नेपाली पात्रो</strong><small>Personal calendar · Darwin</small></div></div><button onClick={()=>setOpen(false)} aria-label="Close Patro"><X size={18}/></button></header>
        {loading&&!month?<div className="hf-patro-loading"><span>पात्रो</span><b>Loading Nepali calendar…</b></div>:month&&<>
          <div className="hf-patro-monthbar"><button onClick={()=>move(-1)} aria-label="Previous month"><ChevronLeft size={19}/></button><div><strong>{month.monthNameNp} {month.yearNp}</strong><small>{month.monthNameEn} {month.year}</small></div><button onClick={()=>move(1)} aria-label="Next month"><ChevronRight size={19}/></button></div>
          <div className="hf-patro-weekdays">{["आइत","सोम","मंगल","बुध","बिहि","शुक्र","शनि"].map(x=><span key={x}>{x}</span>)}</div>
          <div className="hf-patro-grid">
            {Array.from({length:month.startWeekday}).map((_,i)=><i key={"b"+i}/>)}
            {month.days.map(day=>{const today=month.today.year===day.year&&month.today.month===day.month&&month.today.day===day.day;const nt=month.ntHolidays?.[day.ad]||[],w=month.weather?.[day.ad],ev=eventsByDate[day.ad]||[];return <button key={day.day} onClick={()=>{setSelected(day);void enrichDay(day)}} className={[today?"today":"",day.isHoliday||nt.length?"holiday":"",selected?.day===day.day?"selected":""].join(" ")}><strong>{day.dayNp}</strong><small>{new Date(day.ad+"T00:00:00Z").getUTCDate()}</small><em>{day.holidays?.[0]||day.events?.[0]||nt[0]?.title||""}</em><span className="hf-cell-signals">{w&&<i>{weatherLabel(w)}</i>}{nt.length>0&&<i>🇦🇺</i>}{ev.length>0&&<i>📅{ev.length}</i>}</span></button>})}
          </div>
          {selected&&<div className="hf-patro-detail">
            <div className="hf-patro-detail-title"><div><span className="hf-kicker">DAY INTELLIGENCE</span><h3>{selected.weekdayNp} · {selected.dayNp} {month.monthNameNp}</h3><p>{selected.weekdayEn} · {selected.ad}</p></div>{selectedWeather&&<div className="hf-weather-badge"><span>{selectedWeather.icon}</span><b>{Math.round(Number(selectedWeather.max||0))}°</b><small>Darwin</small></div>}</div>
            {(selected.holidays?.length||selected.events?.length)?<div className="hf-patro-feature"><b>🎉 नेपाल · पर्व / विशेष दिन</b>{[...(selected.holidays||[]),...(selected.events||[])].map((x,i)=><span key={i}>{x}</span>)}</div>:null}
            {selectedNt.length>0&&<div className="hf-patro-feature"><b>🇦🇺 NT / Darwin</b>{selectedNt.map((x,i)=><span key={i}>{x.title}{x.kind==="part-day"?" · 7 pm–midnight":x.kind==="regional"?" · regional":""}</span>)}</div>}
            {selectedWeather&&<div className="hf-weather-row"><span><CloudSun size={15}/> {selectedWeather.icon} {Math.round(Number(selectedWeather.max||0))}° / {Math.round(Number(selectedWeather.min||0))}°</span><span>Rain {selectedWeather.rainChance??0}% · {selectedWeather.rainMm??0} mm</span><span>Wind {selectedWeather.windMax??0} km/h</span></div>}
            {selectedGoogle.length>0&&<div className="hf-patro-feature"><b>📅 YOUR GOOGLE CALENDAR</b>{selectedGoogle.map((x,i)=><span key={x.id||i}>{x.title||"Calendar event"}</span>)}</div>}
            <div className="hf-panchang"><div><span>तिथि</span><b>{selected.tithiNameNp||selected.tithiName||"—"}</b><small>{selected.tithiName||""}</small></div><div><span>पक्ष</span><b>{selected.paksha==="Shukla"?"शुक्ल पक्ष":selected.paksha==="Krishna"?"कृष्ण पक्ष":selected.paksha||"—"}</b></div><div><span>नक्षत्र</span><b>{selected.nakshatraNameNp||selected.nakshatraName||"—"}</b><small>{selected.nakshatraName||""}</small></div><div><span>योग</span><b>{selected.yogaNameNp||selected.yogaName||"—"}</b></div><div><span>करण</span><b>{selected.karanaNameNp||selected.karanaName||"—"}</b></div></div>
            <div className="hf-patro-actions"><button onClick={()=>void createReminder("day")}><Bell size={15}/> Day-before reminder</button><button onClick={()=>void createReminder("same")}><Bell size={15}/> Same-day reminder</button><Link href="/calendar" onClick={()=>setOpen(false)}><CalendarDays size={15}/> Full calendar <ExternalLink size={12}/></Link></div>
            {status&&<p className="hf-patro-status">{status}</p>}
          </div>}
        </>}
        {status&&!selected&&<p className="hf-patro-status">{status}</p>}
      </section>
    </div>}
  </>;
}
