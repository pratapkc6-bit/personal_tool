"use client";

import Link from "next/link";
import { FormEvent,useMemo,useState } from "react";
import { Search,X } from "lucide-react";

type Results={
  emails:Array<{id:string;subject:string|null;sender:string|null;classification:string}>;
  tasks:Array<{id:string;title:string;status:string}>;
  followups:Array<{id:string;subject:string;personCompany:string|null}>;
  reminders:Array<{id:string;title:string;status:string;remindAt:string}>;
  approvals:Array<{id:string;title:string;status:string;actionType:string}>;
  context:Array<{id:string;label:string;kind:string;summary:string|null}>;
  events:Array<{id:string;title:string|null;start:string|null}>;
};

const empty:Results={emails:[],tasks:[],followups:[],reminders:[],approvals:[],context:[],events:[]};

export function GlobalSearch(){
  const [q,setQ]=useState("");
  const [results,setResults]=useState<Results|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  async function search(e:FormEvent){
    e.preventDefault();
    const term=q.trim();if(!term)return;
    setBusy(true);setError("");
    try{
      const res=await fetch(`/api/search?q=${encodeURIComponent(term)}`,{cache:"no-store"});
      if(!res.ok)throw new Error(res.status===401?"Sign in through Connections to search your data.":"Search is temporarily unavailable.");
      setResults(await res.json());
    }catch(err){setResults(empty);setError(err instanceof Error?err.message:"Search failed.");}
    finally{setBusy(false)}
  }

  const total=useMemo(()=>results?Object.values(results).reduce((n,rows)=>n+rows.length,0):0,[results]);
  return <div className="professional-search">
    <form onSubmit={search} className="professional-search-bar">
      <Search size={18}/>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder='Try "Andrew", "medicine", "October", "approval"…' aria-label="Search everything"/>
      {q&&<button type="button" onClick={()=>{setQ("");setResults(null);setError("")}} aria-label="Clear search"><X size={16}/></button>}
      <button className="professional-primary" disabled={busy||!q.trim()}>{busy?"Searching…":"Search"}</button>
    </form>

    {error&&<p className="professional-search-error" role="alert">{error}</p>}
    {results&&<div className="professional-search-summary"><strong>{total}</strong><span>matches across Zoro</span></div>}
    {results&&<div className="professional-search-grid">
      <Group title="Emails" href="/inbox" rows={results.emails.map(x=>({id:x.id,title:x.subject||"(no subject)",sub:x.sender||x.classification}))}/>
      <Group title="Tasks" href="/tasks" rows={results.tasks.map(x=>({id:x.id,title:x.title,sub:x.status}))}/>
      <Group title="Follow-ups" href="/tasks" rows={results.followups.map(x=>({id:x.id,title:x.subject,sub:x.personCompany||"Waiting"}))}/>
      <Group title="Reminders" href="/notifications" rows={results.reminders.map(x=>({id:x.id,title:x.title,sub:new Date(x.remindAt).toLocaleString("en-AU")}))}/>
      <Group title="Approvals" href="/core" rows={results.approvals.map(x=>({id:x.id,title:x.title,sub:`${x.actionType} · ${x.status}`}))}/>
      <Group title="Memory" href="/core" rows={results.context.map(x=>({id:x.id,title:x.label,sub:x.summary||x.kind}))}/>
      <Group title="Calendar" href="/calendar" rows={results.events.map(x=>({id:x.id,title:x.title||"Untitled event",sub:x.start?new Date(x.start).toLocaleString("en-AU"):""}))}/>
    </div>}
  </div>;
}

function Group({title,href,rows}:{title:string;href:string;rows:Array<{id:string;title:string;sub:string}>}){
  return <section className="professional-search-group">
    <div className="professional-search-group-head"><h2>{title}</h2><Link href={href}>Open</Link></div>
    <div>{rows.length===0?<p className="professional-search-empty">No matches.</p>:rows.slice(0,8).map(row=><Link href={href} key={row.id} className="professional-search-row"><strong>{row.title}</strong><span>{row.sub}</span></Link>)}</div>
  </section>;
}