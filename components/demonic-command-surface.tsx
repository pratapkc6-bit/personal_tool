"use client";
import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { Search, X } from "lucide-react";

type SearchResults={
  emails:Array<{id:string;subject:string|null;sender:string|null;classification:string}>;
  tasks:Array<{id:string;title:string;status:string}>;
  followups:Array<{id:string;subject:string;personCompany:string|null}>;
  events:Array<{id:string;title:string|null;start:string|null}>;
};

const hotspot=(href:string,label:string,cls:string)=><Link href={href} aria-label={label} title={label} className={"approved-hotspot "+cls}><span>{label}</span></Link>;

export function DemonicCommandSurface({stamp,name}:{stamp:string;name:string}){
 const [query,setQuery]=useState("");
 const [results,setResults]=useState<SearchResults|null>(null);
 const [busy,setBusy]=useState(false);
 const [searchOpen,setSearchOpen]=useState(false);
 const inputRef=useRef<HTMLInputElement>(null);

 async function runSearch(e:FormEvent){
   e.preventDefault();
   const q=query.trim();if(!q)return;
   setBusy(true);
   try{
     const res=await fetch(`/api/search?q=${encodeURIComponent(q)}`,{cache:"no-store"});
     setResults(res.ok?await res.json():{emails:[],tasks:[],followups:[],events:[]});
   }finally{setBusy(false)}
 }
 function openSearch(){setSearchOpen(true);window.setTimeout(()=>inputRef.current?.focus(),30)}
 function closeSearch(){setSearchOpen(false);setResults(null)}

 const groups=results?[
   {title:"Emails",href:"/inbox",rows:results.emails.map(x=>({id:x.id,title:x.subject||"(no subject)",sub:x.sender||x.classification}))},
   {title:"Missions",href:"/tasks",rows:results.tasks.map(x=>({id:x.id,title:x.title,sub:x.status}))},
   {title:"Waiting",href:"/tasks",rows:results.followups.map(x=>({id:x.id,title:x.subject,sub:x.personCompany||"Waiting"}))},
   {title:"Timeline",href:"/calendar",rows:results.events.map(x=>({id:x.id,title:x.title||"Untitled event",sub:x.start?new Date(x.start).toLocaleString("en-AU"):""}))}
 ]:[];

 return <section className="demonic-command-surface approved-home-surface" aria-label={"Zoro home for "+name}>
   <div className="approved-home-art" role="img" aria-label="Zoro Dark Realm command interface">
     <div className="approved-meta" aria-hidden="true"><span>{stamp}</span></div>
     {hotspot("/","Home","hot-home-mark")}

     <form className={"approved-live-search "+(searchOpen?"is-open":"")} onSubmit={runSearch} role="search">
       <Search className="approved-search-icon" size={22}/>
       <input ref={inputRef} value={query} onFocus={()=>setSearchOpen(true)} onChange={e=>setQuery(e.target.value)} placeholder="Search or run a command" aria-label="Search Zoro" autoComplete="off"/>
       {searchOpen&&<button type="button" onClick={closeSearch} aria-label="Close search"><X size={18}/></button>}
     </form>

     {searchOpen&&<div className="approved-search-results" role="region" aria-label="Search results">
       {!results&&!busy&&<div className="approved-search-hint"><b>Search your world</b><span>Gmail · Missions · Follow-ups · Calendar</span></div>}
       {busy&&<div className="approved-search-hint"><b>Zoro is searching…</b><span>Checking connected sources.</span></div>}
       {results&&<div className="approved-search-groups">
         {groups.map(group=><section key={group.title}>
           <header><b>{group.title}</b><small>{group.rows.length}</small></header>
           {group.rows.slice(0,4).map(row=><Link key={row.id} href={group.href} onClick={closeSearch}><strong>{row.title}</strong><span>{row.sub}</span></Link>)}
           {!group.rows.length&&<p>No matches.</p>}
         </section>)}
       </div>}
     </div>}

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