"use client";
import Link from "next/link";
import { CalendarDays, Inbox, ListTodo, Sparkles, SunMedium } from "lucide-react";

const portals=[
  {href:"/tasks",label:"Missions",Icon:ListTodo,cls:"missions"},
  {href:"/calendar",label:"Timeline",Icon:CalendarDays,cls:"timeline"},
  {href:"/inbox",label:"Intel",Icon:Inbox,cls:"intel"},
  {href:"/today",label:"Today",Icon:SunMedium,cls:"today"},
];

export function DemonicCommandSurface({stamp,name}:{stamp:string;name:string}){
 return <section className="demonic-command-surface" aria-label="Zoro ritual command surface">
   <div className="demonic-sky" aria-hidden="true"><i className="demonic-moon"/><i className="demonic-dragon"/><i className="demonic-runes left"/><i className="demonic-runes right"/></div>
   <div className="demonic-status"><span>{stamp}</span><small>{name}&apos;s realm</small></div>
   <div className="demonic-portal-grid">
     {portals.map(({href,label,Icon,cls})=><Link key={href} href={href} className={"demonic-portal "+cls} aria-label={label}><span className="demonic-portal-art"><Icon size={24}/></span><small>{label}</small></Link>)}
     <Link href="/assistant" className="demonic-core" aria-label="Talk to Zoro"><img src="/assets/zoro-oni-core.svg" alt=""/><span><Sparkles size={18}/> Zoro</span></Link>
   </div>
   <div className="demonic-ritual-line" aria-hidden="true"><i/><b/><i/></div>
 </section>
}