"use client";

import { useEffect, useRef } from "react";

export function playZoroAlarm(seconds=3){
  if(typeof window==="undefined"||seconds<=0)return;
  try{
    const AudioContextClass=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
    if(!AudioContextClass)return;
    const ctx=new AudioContextClass(),osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type="sine";osc.frequency.value=880;gain.gain.setValueAtTime(0.0001,ctx.currentTime);
    const duration=Math.min(10,Math.max(.5,seconds));
    for(let t=0;t<duration;t+=.42){
      gain.gain.setValueAtTime(.0001,ctx.currentTime+t);
      gain.gain.exponentialRampToValueAtTime(.16,ctx.currentTime+t+.04);
      gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+Math.min(duration,t+.25));
    }
    osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+duration);
    window.setTimeout(()=>void ctx.close(),(duration+.25)*1000);
    navigator.vibrate?.([180,90,180,90,180]);
  }catch{}
}

type ReminderItem={id:string;title:string;remindAt:string;snoozedUntil?:string|null;status:string;ringSeconds?:number};

export function NotificationRuntime(){
  const firing=useRef(new Set<string>());

  useEffect(()=>{
    if("serviceWorker" in navigator)void navigator.serviceWorker.register("/zoro-sw.js").catch(()=>undefined);
    const onMessage=(event:MessageEvent)=>{
      if(event.data?.type!=="ZORO_PUSH")return;
      const seconds=Number(event.data?.payload?.alarmSeconds||0);
      if(seconds>0)playZoroAlarm(seconds);
    };
    navigator.serviceWorker?.addEventListener("message",onMessage);
    return()=>navigator.serviceWorker?.removeEventListener("message",onMessage);
  },[]);

  useEffect(()=>{
    let stopped=false;
    async function check(){
      if(stopped||document.visibilityState!=="visible")return;
      try{
        const res=await fetch("/api/reminders",{cache:"no-store"});if(!res.ok)return;
        const data=await res.json() as {reminders?:ReminderItem[]},now=Date.now();
        for(const reminder of data.reminders||[]){
          if(reminder.status!=="OPEN"||firing.current.has(reminder.id))continue;
          const due=new Date(reminder.snoozedUntil||reminder.remindAt).getTime();
          if(!Number.isFinite(due)||due>now||now-due>5*60_000)continue;
          firing.current.add(reminder.id);
          const fire=await fetch("/api/reminders/fire",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:reminder.id})});
          const result=await fire.json().catch(()=>({})) as {pushed?:number;alarmSeconds?:number};
          if(fire.ok&&Number(result.pushed||0)===0){
            playZoroAlarm(Number(result.alarmSeconds||reminder.ringSeconds||3));
            if("Notification" in window&&Notification.permission==="granted")new Notification("⏰ "+reminder.title,{body:"Your Zoro reminder is due now."});
          }
          window.setTimeout(()=>firing.current.delete(reminder.id),30_000);
        }
      }catch{}
    }
    void check();const timer=window.setInterval(()=>void check(),30_000);
    const visible=()=>{if(document.visibilityState==="visible")void check()};
    document.addEventListener("visibilitychange",visible);
    return()=>{stopped=true;window.clearInterval(timer);document.removeEventListener("visibilitychange",visible)};
  },[]);

  return null;
}
