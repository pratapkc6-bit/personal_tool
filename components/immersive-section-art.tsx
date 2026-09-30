"use client";
import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { Search, X } from "lucide-react";

type Hotspot={href:string;label:string;className:string};
type Results={
  emails:Array<{id:string;subject:string|null;sender:string|null;classification:string}>;
  tasks:Array<{id:string;title:string;status:string}>;
  followups:Array<{id:string;subject:string;personCompany:string|null}>;
  events:Array<{id:string;title:string|null;start:string|null}>;
};

export function ImmersiveSectionArt({
  src,alt,kind,hotspots,
}:{
  src:string;alt:string;kind:"timeline"|"intel"|"today"|"settings";hotspots:Hotspot[];
}){
  const [query,setQuery]=useState("");
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [results,setResults]=useState<Results|null>(null);
  const inputRef=useRef<HTMLInputElement>(null);

  async function search(e:FormEvent){
    e.preventDefault();
    const q=query.trim(); if(!q)return;
    setBusy(true);
    try{
      const res=await fetch(`/api/search?q=${encodeURIComponent(q)}`,{cache:"no-store"});
      setResults(res.ok?await res.json():{emails:[],tasks:[],followups:[],events:[]});
    }finally{setBusy(false)}
  }
  function close(){setOpen(false);setResults(null)}
  const groups=results?[
    {title:"Emails",href:"/inbox",rows:results.emails.map(x=>({id:x.id,title:x.subject||"(no subject)",sub:x.sender||x.classification}))},
    {title:"Missions",href:"/tasks",rows:results.tasks.map(x=>({id:x.id,title:x.title,sub:x.status}))},
    {title:"Waiting",href:"/tasks",rows:results.followups.map(x=>({id:x.id,title:x.subject,sub:x.personCompany||"Waiting"}))},
    {title:"Timeline",href:"/calendar",rows:results.events.map(x=>({id:x.id,title:x.title||"Untitled event",sub:x.start?new Date(x.start).toLocaleString("en-AU"):""}))}
  ]:[];

  return <section className={"immersive-section-art immersive-"+kind} aria-label={alt}>
    <img src={src} alt={alt} className="immersive-section-image"/>
    <form className={"immersive-live-search "+(open?"is-open":"")} onSubmit={search} role="search">
      <Search size={20}/>
      <input ref={inputRef} value={query} onFocus={()=>setOpen(true)} onChange={e=>setQuery(e.target.value)} placeholder="Search or run a command" aria-label="Search Zoro" autoComplete="off"/>
      {open&&<button type="button" onClick={close} aria-label="Close search"><X size={16}/></button>}
    </form>
    {open&&<div className="immersive-search-results">
      {!results&&!busy&&<div className="immersive-search-hint"><b>Search your world</b><span>Gmail · Missions · Follow-ups · Calendar</span></div>}
      {busy&&<div className="immersive-search-hint"><b>Zoro is searching…</b><span>Checking connected sources.</span></div>}
      {results&&<div className="immersive-search-groups">
        {groups.map(group=><section key={group.title}><header><b>{group.title}</b><small>{group.rows.length}</small></header>
          {group.rows.slice(0,4).map(row=><Link key={row.id} href={group.href} onClick={close}><strong>{row.title}</strong><span>{row.sub}</span></Link>)}
          {!group.rows.length&&<p>No matches.</p>}
        </section>)}
      </div>}
    </div>}
    <div className="immersive-hotspots">
      {hotspots.filter(x=>x.className!=="hs-top-search").map(x=><Link key={x.className+x.href} href={x.href} className={"immersive-hotspot "+x.className} aria-label={x.label} title={x.label}><span>{x.label}</span></Link>)}
    </div>
  </section>
}