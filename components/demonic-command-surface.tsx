"use client";
import Link from "next/link";

const hotspot=(href:string,label:string,cls:string)=><Link href={href} aria-label={label} title={label} className={"approved-hotspot "+cls}><span>{label}</span></Link>;

export function DemonicCommandSurface({stamp,name}:{stamp:string;name:string}){
 return <section className="demonic-command-surface approved-home-surface" aria-label={"Zoro home for "+name}>
   <div className="approved-home-art" role="img" aria-label="Zoro Dark Realm command interface">
     <div className="approved-meta" aria-hidden="true"><span>{stamp}</span></div>
     {hotspot("/","Home","hot-home-mark")}
     {hotspot("/search","Search or run a command","hot-search")}
     {hotspot("/notifications","Notifications","hot-notifications")}
     {hotspot("/settings","Settings","hot-settings")}
     {hotspot("/assistant","Zoro assistant","hot-profile")}
     {hotspot("/assistant","Talk to Zoro","hot-zoro-core")}
     {hotspot("/tasks","Missions","hot-missions")}
     {hotspot("/calendar","Timeline","hot-timeline")}
     {hotspot("/inbox","Intelligence","hot-intel")}
     {hotspot("/today","Today","hot-today")}
     {hotspot("/reminders","Reminders","hot-ritual")}
     <nav className="approved-art-nav" aria-label="Zoro visual navigation">
       {hotspot("/","Home","nav-home")}
       {hotspot("/calendar","Timeline","nav-timeline")}
       {hotspot("/assistant","Zoro","nav-zoro")}
       {hotspot("/intelligence","Intel","nav-intel")}
       {hotspot("/settings","More","nav-more")}
     </nav>
   </div>
 </section>
}