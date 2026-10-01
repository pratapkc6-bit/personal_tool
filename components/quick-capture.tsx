"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, CheckSquare2, Plus, Sparkles, WandSparkles, X, Zap } from "lucide-react";

type CaptureMode="task"|"reminder";
type Interpretation={
  mode:CaptureMode;title:string;priority:"URGENT"|"HIGH"|"MEDIUM"|"LOW";category:string;
  dueAt:string|null;remindAt:string|null;recurrence:"NONE"|"DAILY";recurrenceTime:string|null;
  confidence:number;notes:string[];
};

function localInput(date:Date){
  const pad=(n:number)=>String(n).padStart(2,"0");
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function defaultReminderTime(){
  const d=new Date(Date.now()+60*60*1000);
  d.setMinutes(Math.ceil(d.getMinutes()/15)*15,0,0);
  return localInput(d);
}

export function QuickCapture() {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const saving = useRef(false);
  const [mode,setMode]=useState<CaptureMode>("task");
  const [smartText,setSmartText]=useState("");
  const [interpreting,setInterpreting]=useState(false);
  const [interpretation,setInterpretation]=useState<Interpretation|null>(null);
  const [title, setTitle] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [category,setCategory]=useState("PERSONAL");
  const [dueAt,setDueAt]=useState("");
  const [remindAt,setRemindAt]=useState(defaultReminderTime);
  const [daily,setDaily]=useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(()=>{
    const open=(event:Event)=>{
      const detail=(event as CustomEvent<{mode?:CaptureMode}>).detail;
      if(detail?.mode)setMode(detail.mode);
      setMessage("");
      dialog.current?.showModal();
    };
    window.addEventListener("zoro:open-capture",open);
    return()=>window.removeEventListener("zoro:open-capture",open);
  },[]);

  function reset(){
    setSmartText("");setInterpretation(null);setTitle("");setNextAction("");setPriority("MEDIUM");
    setCategory("PERSONAL");setDueAt("");setRemindAt(defaultReminderTime());setDaily(false);
  }

  async function interpret(){
    if(smartText.trim().length<2)return;
    setInterpreting(true);setMessage("");
    try{
      const response=await fetch("/api/capture/interpret",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:smartText.trim()})});
      const data=await response.json();
      if(!response.ok)throw new Error(data?.error||"Could not interpret that.");
      const parsed=data as Interpretation;
      setInterpretation(parsed);setMode(parsed.mode);setTitle(parsed.title);setPriority(parsed.priority);setCategory(parsed.category);
      if(parsed.dueAt)setDueAt(localInput(new Date(parsed.dueAt)));
      if(parsed.remindAt)setRemindAt(localInput(new Date(parsed.remindAt)));
      setDaily(parsed.recurrence==="DAILY");
      setMessage(parsed.notes.length?parsed.notes.join(" "):"Ready to review.");
    }catch(error){setMessage(error instanceof Error?error.message:"Could not interpret that.");}
    finally{setInterpreting(false)}
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving.current || !title.trim()) return;
    saving.current = true; setBusy(true); setMessage("");
    try {
      const isTask=mode==="task";
      const response = await fetch(isTask?"/api/tasks":"/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isTask
          ? { title: title.trim(), nextAction: nextAction.trim() || title.trim(), priority, category, dueAt:dueAt?new Date(dueAt).toISOString():null, source: "Smart capture" }
          : { title:title.trim(), remindAt:new Date(remindAt).toISOString(), ringSeconds:3, recurrence:daily?"DAILY":"NONE", recurrenceTime:daily?remindAt.slice(11,16):undefined, timezone:"Australia/Darwin" }
        )
      });
      if (!response.ok) {
        const body=await response.json().catch(()=>null);
        throw new Error(body?.error || (response.status === 401 ? "Sign in through Connections to save this." : "Could not verify the save. Please try again."));
      }
      reset();
      setMessage(isTask?"Captured. Your task is ready in Tasks.":daily?"Daily reminder created.":"Reminder created.");
      window.dispatchEvent(new Event(isTask?"zoro:task-created":"zoro:reminder-created"));
      window.dispatchEvent(new Event("zoro:data-changed"));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Connection interrupted. Please retry.");
    } finally { saving.current = false; setBusy(false); }
  }

  return <><button className="hub-capture" onClick={() => { setMessage(""); dialog.current?.showModal(); }}><Plus size={17} /><span>Capture</span></button>
    <dialog className="hub-dialog smart-capture-dialog" ref={dialog} aria-labelledby="capture-heading" onCancel={event => { if (saving.current) event.preventDefault(); }}>
      <div className="hub-dialog-heading">
        <div><p className="hub-kicker">SMART CAPTURE</p><h2 id="capture-heading">Get it out of your head.</h2></div>
        <button disabled={busy} onClick={() => dialog.current?.close()} aria-label="Close capture"><X size={20} /></button>
      </div>

      <section className="smart-capture-natural">
        <div className="smart-capture-natural-head"><span><WandSparkles size={16}/> Natural language</span><small>Optional</small></div>
        <textarea value={smartText} onChange={e=>setSmartText(e.target.value)} maxLength={500} placeholder='Try: "Remind me to call the clinic tomorrow at 2pm" or "urgent submit assignment Friday"'/>
        <button type="button" onClick={()=>void interpret()} disabled={interpreting||smartText.trim().length<2}><Sparkles size={15}/>{interpreting?"Understanding…":"Understand this"}</button>
        {interpretation&&<div className="smart-capture-understood"><strong>{Math.round(interpretation.confidence*100)}% understood</strong><span>{interpretation.mode} · {interpretation.category.toLowerCase()} · {interpretation.priority.toLowerCase()}</span></div>}
      </section>

      <div className="smart-capture-tabs" role="tablist" aria-label="Capture type">
        <button type="button" role="tab" aria-selected={mode==="task"} className={mode==="task"?"selected":""} onClick={()=>{setMode("task");setMessage("")}}><CheckSquare2 size={16}/> Task</button>
        <button type="button" role="tab" aria-selected={mode==="reminder"} className={mode==="reminder"?"selected":""} onClick={()=>{setMode("reminder");setMessage("")}}><BellRing size={16}/> Reminder</button>
      </div>

      <form onSubmit={submit}>
        <label htmlFor="capture-title">{mode==="task"?"What needs doing?":"What should Zoro remind you about?"}</label>
        <input autoFocus id="capture-title" required maxLength={180} value={title} disabled={busy} onChange={event => setTitle(event.target.value)} placeholder={mode==="task"?"One clear outcome…":"Take medicine, call someone…"} />

        {mode==="task"?<>
          <label htmlFor="capture-action">First small step (optional)</label>
          <input id="capture-action" maxLength={1000} value={nextAction} disabled={busy} onChange={event => setNextAction(event.target.value)} placeholder="Make the next action obvious" />
          <div className="smart-capture-two">
            <div><label htmlFor="capture-priority">Priority</label><select id="capture-priority" value={priority} disabled={busy} onChange={event => setPriority(event.target.value)}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></select></div>
            <div><label htmlFor="capture-category">Category</label><select id="capture-category" value={category} disabled={busy} onChange={event=>setCategory(event.target.value)}><option>PERSONAL</option><option>WORK</option><option>STUDY</option><option>COMMUNICATION</option><option>FINANCE</option><option>HEALTH</option></select></div>
          </div>
          <label htmlFor="capture-due">Due date (optional)</label>
          <input id="capture-due" type="datetime-local" value={dueAt} disabled={busy} onChange={event=>setDueAt(event.target.value)}/>
        </>:<>
          <label htmlFor="capture-remind-at">When?</label>
          <input id="capture-remind-at" type="datetime-local" required value={remindAt} disabled={busy} onChange={event=>setRemindAt(event.target.value)}/>
          <label className="smart-capture-check" htmlFor="capture-daily">
            <input id="capture-daily" type="checkbox" checked={daily} disabled={busy} onChange={event=>setDaily(event.target.checked)}/>
            <span><strong>Repeat every day</strong><small>Zoro schedules the next occurrence after you mark it done.</small></span>
          </label>
        </>}

        <button className="hub-primary" disabled={busy || !title.trim() || (mode==="reminder"&&!remindAt)} type="submit">
          <Zap size={16} />{busy ? "Saving…" : mode==="task" ? "Save task" : daily ? "Create daily reminder" : "Create reminder"}
        </button>
      </form>
      <p role="status" className="hub-feedback">{message}</p>
    </dialog></>;
}