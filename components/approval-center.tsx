"use client";
import { useEffect,useState } from "react";
import { Check,RefreshCw,ShieldCheck,X,Zap } from "lucide-react";
type Proposal={id:string;title:string;rationale?:string|null;actionType:string;risk:string;status:string;createdAt:string};
type Event={id:string;type:string;source:string;status:string;observedAt:string};
export function ApprovalCenter(){
 const [data,setData]=useState<{proposals:Proposal[];events:Event[];pending:number}|null>(null),[busy,setBusy]=useState("");
 async function load(){const r=await fetch("/api/core",{cache:"no-store"});if(r.ok)setData(await r.json())}
 useEffect(()=>{void load()},[]);
 async function decide(id:string,operation:"approve"|"reject"){setBusy(id);await fetch("/api/core",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({operation,id})});setBusy("");await load()}
 return <div className="space-y-5">
  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.18em] text-cyan-700">Human in control</p><h2 className="mt-1 text-2xl font-black">Approval Center</h2><p className="mt-1 text-sm text-slate-600">{data?.pending??0} actions waiting for your decision.</p></div><button onClick={()=>void load()} className="rounded-2xl border p-3" aria-label="Refresh"><RefreshCw size={18}/></button></div></section>
  <section className="space-y-3">{data?.proposals.filter(x=>x.status==="PROPOSED").map(p=><article key={p.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card"><div className="flex gap-3"><ShieldCheck/><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><b>{p.title}</b><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black">{p.risk} RISK</span></div><p className="mt-2 text-sm text-slate-600">{p.rationale||"Zoro prepared this action for review."}</p><p className="mt-2 text-xs text-slate-400">{p.actionType.replaceAll("_"," ")}</p><div className="mt-4 flex gap-2"><button disabled={busy===p.id} onClick={()=>void decide(p.id,"approve")} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"><Check className="mr-1 inline" size={15}/>Approve & execute</button><button disabled={busy===p.id} onClick={()=>void decide(p.id,"reject")} className="rounded-xl border px-4 py-2 text-sm font-bold"><X className="mr-1 inline" size={15}/>Reject</button></div></div></div></article>)}{data&&!data.pending&&<div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No actions need approval. Zoro is behaving itself. Suspiciously well, even.</div>}</section>
  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card"><div className="flex items-center gap-2"><Zap size={18}/><h2 className="font-bold">Recent observations</h2></div><div className="mt-3 divide-y">{data?.events.slice(0,8).map(e=><div key={e.id} className="py-3"><b className="text-sm">{e.type.replaceAll("_"," ")}</b><p className="text-xs text-slate-500">{e.source} · {new Date(e.observedAt).toLocaleString()}</p></div>)}</div></section>
 </div>
}
