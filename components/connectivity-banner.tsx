"use client";

import { useEffect,useState } from "react";
import { CloudOff,Wifi } from "lucide-react";

export function ConnectivityBanner(){
  const [online,setOnline]=useState(true);
  const [restored,setRestored]=useState(false);

  useEffect(()=>{
    setOnline(navigator.onLine);
    let timer:number|undefined;
    const onOffline=()=>{setOnline(false);setRestored(false)};
    const onOnline=()=>{
      setOnline(true);setRestored(true);
      if(timer)window.clearTimeout(timer);
      timer=window.setTimeout(()=>setRestored(false),3500);
    };
    window.addEventListener("offline",onOffline);
    window.addEventListener("online",onOnline);
    return()=>{window.removeEventListener("offline",onOffline);window.removeEventListener("online",onOnline);if(timer)window.clearTimeout(timer)};
  },[]);

  if(online&&!restored)return null;
  return <div className={"connectivity-banner "+(online?"is-restored":"is-offline")} role="status">
    {online?<Wifi size={16}/>:<CloudOff size={16}/>}
    <div>
      <strong>{online?"Connection restored":"You’re offline"}</strong>
      <span>{online?"Zoro can sync live data again.":"You can still read loaded screens, but network actions and fresh data are paused."}</span>
    </div>
  </div>;
}