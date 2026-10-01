"use client";

import { useState } from "react";
import { Check,Clock3,RotateCcw } from "lucide-react";

type WaitingItem={
  id:string;subject:string;personCompany:string|null;expectedResponse:string|null;
  nextFollowupAt:string|null;lastUpdate:string;ageDays:number;waitingDays:number;source:string;
};
type Section={title:string;empty:string;items:WaitingItem[];tone:"danger"|"today"|"upcoming"|"quiet"};

export function WaitingRadarClient({sections}:{sections:Section[]}){
  const [busy,setBusy]=useState<string|null>(null);
  const [hidden,setHidden]=useState<Set<string>>(new Set());

  async function act(id:string,action:"complete"|"postpone"|"reopen",days?:number){
    setBusy(id+action);
    try{
      const res=await fetch("/api/followups",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,action,days})});
      if(!res.ok)throw new Error("Update failed");
      if(action==="complete")setHidden(current=>new Set(current).add(id));
      window.dispatchEvent(new Event("zoro:data-changed"));
    }finally{setBusy(null)}
  }

  return <div className="waiting-radar-grid">
    {sections.map(section=><section className={"waiting-section tone-"+section.tone} key={section.title}>
      <header><div><strong>{section.title}</strong><span>{section.items.filter(x=>!hidden.has(x.id)).length}</span></div></header>
      <div>
        {section.items.filter(x=>!hidden.has(x.id)).length===0?<p className="professional-empty">{section.empty}</p>:
          section.items.filter(x=>!hidden.has(x.id)).map(item=><article className="waiting-item" key={item.id}>
            <div className="waiting-item-main">
              <strong>{item.subject}</strong>
              <span>{item.personCompany||"No person/company set"}</span>
              {item.expectedResponse&&<p>{item.expectedResponse}</p>}
              <small>{item.nextFollowupAt?new Date(item.nextFollowupAt).toLocaleString("en-AU"):"No follow-up date"} · waiting {item.waitingDays} day{item.waitingDays===1?"":"s"}</small>
            </div>
            <div className="waiting-item-actions">
              <button disabled={busy!==null} onClick={()=>void act(item.id,"postpone",1)}><Clock3 size={14}/> Tomorrow</button>
              <button disabled={busy!==null} onClick={()=>void act(item.id,"postpone",3)}><RotateCcw size={14}/> +3 days</button>
              <button disabled={busy!==null} className="is-done" onClick={()=>void act(item.id,"complete")}><Check size={14}/> Done</button>
            </div>
          </article>)}
      </div>
    </section>)}
  </div>;
}