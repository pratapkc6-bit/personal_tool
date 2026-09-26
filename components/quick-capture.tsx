"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Zap } from "lucide-react";

export function QuickCapture() {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const saving = useRef(false);
  const [title, setTitle] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving.current || !title.trim()) return;
    saving.current = true; setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title.trim(), nextAction: nextAction.trim() || title.trim(), priority, category: "PERSONAL", source: "Quick capture" }) });
      if (!response.ok) throw new Error(response.status === 401 ? "Sign in through Connections to save tasks." : "Could not verify the save. Check Tasks before trying again.");
      setTitle(""); setNextAction(""); setMessage("Captured. Your task is ready in Tasks.");
      window.dispatchEvent(new Event("zoro:task-created")); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Connection interrupted. Check Tasks before retrying."); }
    finally { saving.current = false; setBusy(false); }
  }
  return <><button className="hub-capture" onClick={() => { setMessage(""); dialog.current?.showModal(); }}><Plus size={17} /><span>Capture</span></button>
    <dialog className="hub-dialog" ref={dialog} aria-labelledby="capture-heading" onCancel={event => { if (saving.current) event.preventDefault(); }}>
      <div className="hub-dialog-heading"><div><p className="hub-kicker">INSTANT CAPTURE</p><h2 id="capture-heading">Get it out of your head.</h2></div><button disabled={busy} onClick={() => dialog.current?.close()} aria-label="Close capture"><X size={20} /></button></div>
      <form onSubmit={submit}><label htmlFor="capture-title">What needs doing?</label><input autoFocus id="capture-title" required maxLength={180} value={title} disabled={busy} onChange={event => setTitle(event.target.value)} placeholder="One clear outcome…" /><label htmlFor="capture-action">First small step (optional)</label><input id="capture-action" maxLength={1000} value={nextAction} disabled={busy} onChange={event => setNextAction(event.target.value)} placeholder="Make the next action obvious" /><label htmlFor="capture-priority">Priority</label><select id="capture-priority" value={priority} disabled={busy} onChange={event => setPriority(event.target.value)}><option value="LOW">Low · whenever there is room</option><option value="MEDIUM">Medium · normal priority</option><option value="HIGH">High · important</option><option value="URGENT">Urgent · needs attention</option></select><button className="hub-primary" disabled={busy || !title.trim()} type="submit"><Zap size={16} />{busy ? "Saving…" : "Save task"}</button></form>
      <p role="status" className="hub-feedback">{message}</p>
    </dialog></>;
}
