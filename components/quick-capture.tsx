"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, CheckSquare2, Plus, X, Zap } from "lucide-react";

type CaptureMode="task"|"reminder";

function defaultReminderTime(){
  const d=new Date(Date.now()+60*60*1000);
  d.setMinutes(Math.ceil(d.getMinutes()/15)*15,0,0);
  const pad=(n:number)=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function QuickCapture() {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const saving = useRef(false);
  const [mode,setMode]=useState<CaptureMode>("task");
  const [title, setTitle] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [remindAt,setRemindAt]=useState(defaultReminderTime);
  const [daily,setDaily]=useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function reset(){
    setTitle("");setNextAction("");setPriority("MEDIUM");setRemindAt(defaultReminderTime());setDaily(false);
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
          ? { title: title.trim(), nextAction: nextAction.trim() || title.trim(), priority, category: "PERSONAL", source: "Quick capture" }
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
          <label htmlFor="capture-priority">Priority</label>
          <select id="capture-priority" value={priority} disabled={busy} onChange={event => setPriority(event.target.value)}>
            <option value="LOW">Low · whenever there is room</option>
            <option value="MEDIUM">Medium · normal priority</option>
            <option value="HIGH">High · important</option>
            <option value="URGENT">Urgent · needs attention</option>
          </select>
        </>:<>
          <label htmlFor="capture-remind-at">When?</label>
          <input id="capture-remind-at" type="datetime-local" required value={remindAt} disabled={busy} onChange={event=>setRemindAt(event.target.value)}/>
          <label className="smart-capture-check" htmlFor="capture-daily">
            <input id="capture-daily" type="checkbox" checked={daily} disabled={busy} onChange={event=>setDaily(event.target.checked)}/>
            <span><strong>Repeat every day</strong><small>Zoro will schedule the next occurrence after you mark it done.</small></span>
          </label>
        </>}

        <button className="hub-primary" disabled={busy || !title.trim() || (mode==="reminder"&&!remindAt)} type="submit">
          <Zap size={16} />{busy ? "Saving…" : mode==="task" ? "Save task" : daily ? "Create daily reminder" : "Create reminder"}
        </button>
      </form>
      <p role="status" className="hub-feedback">{message}</p>
    </dialog></>;
}