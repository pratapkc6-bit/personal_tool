"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Clock3, Plus, Search, RotateCcw } from "lucide-react";
type Task = { id: string; title: string; category: string; priority: string; status: string; dueAt: string | null; nextAction: string | null };
const filters = ["ALL", "OPEN", "WAITING", "COMPLETED", "OVERDUE"];
const rank: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
export function TaskBoard({ initialTasks, initialShowAdd = false }: { initialTasks: Task[]; initialShowAdd?: boolean }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [filter, setFilter] = useState("OPEN");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(initialShowAdd);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueAt, setDueAt] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [step, setStep] = useState("");
  useEffect(() => setTasks(initialTasks), [initialTasks]);
  useEffect(() => { setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(timer); }, []);
  const overdue = (task: Task) => task.status !== "COMPLETED" && task.status !== "NO_LONGER_RELEVANT" && !!task.dueAt && Date.parse(task.dueAt) < now;
  const matches = (task: Task, tab: string) => tab === "ALL" || (tab === "OVERDUE" ? overdue(task) : task.status === tab);
  const visible = tasks.filter(task => matches(task, filter) && `${task.title} ${task.nextAction || ""}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => Number(overdue(b)) - Number(overdue(a)) || (rank[a.priority] ?? 4) - (rank[b.priority] ?? 4) || (a.dueAt ? Date.parse(a.dueAt) : Infinity) - (b.dueAt ? Date.parse(b.dueAt) : Infinity));
  async function write(id: string | null, body: object) {
    if (saving.current) return false;
    saving.current = true; setBusy(true); setMessage("");
    try {
      const res = await fetch(id ? `/api/tasks/${id}` : "/api/tasks", { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(res.status === 401 ? "Sign in through Setup to manage your missions." : "The change could not be verified. Refresh Tasks before retrying.");
      const updated: Task = await res.json();
      setTasks(current => id ? current.map(task => task.id === id ? updated : task) : [updated, ...current]);
      setMessage(id ? "Mission updated." : "Mission captured."); return true;
    } catch (error) { setMessage(error instanceof Error ? error.message : "Connection interrupted. Refresh to verify before retrying."); return false; }
    finally { saving.current = false; setBusy(false); }
  }
  async function create(event: React.FormEvent) {
    event.preventDefault(); if (!title.trim()) return;
    if (await write(null, { title: title.trim(), priority, category: "PERSONAL", dueAt: dueAt ? new Date(dueAt).toISOString() : null, nextAction: nextAction.trim() || title.trim(), source: "Mission board" })) { setTitle(""); setNextAction(""); setDueAt(""); setShowAdd(false); setFilter("OPEN"); }
  }
  return <div className="mission-board">
    <div className="mission-toolbar"><label className="mission-search"><Search size={17} /><span className="sr-only">Search missions</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Find your next move…" /></label><button className="hub-primary" onClick={() => setShowAdd(value => !value)} aria-expanded={showAdd}><Plus size={17} />New mission</button></div>
    <div className="mission-filters" aria-label="Filter missions">{filters.map(tab => <button key={tab} aria-pressed={filter === tab} onClick={() => setFilter(tab)}>{tab === "ALL" ? "All missions" : tab[0] + tab.slice(1).toLowerCase()}<span>{tasks.filter(task => matches(task, tab)).length}</span></button>)}</div>
    <p role="status" className="hub-feedback">{message}</p>
    {showAdd && <form className="mission-create" onSubmit={create}><h2>Turn an intention into a mission.</h2><label htmlFor="mission-title">Outcome</label><input id="mission-title" maxLength={180} required value={title} disabled={busy} onChange={event => setTitle(event.target.value)} placeholder="What does done look like?" /><label htmlFor="mission-step">Next action</label><input id="mission-step" maxLength={1000} value={nextAction} disabled={busy} onChange={event => setNextAction(event.target.value)} placeholder="The first small step" /><div className="mission-fields"><div><label htmlFor="mission-priority">Priority</label><select id="mission-priority" value={priority} disabled={busy} onChange={event => setPriority(event.target.value)}>{Object.keys(rank).map(value => <option key={value}>{value}</option>)}</select></div><div><label htmlFor="mission-due">Due (your device timezone)</label><input id="mission-due" type="datetime-local" value={dueAt} disabled={busy} onChange={event => setDueAt(event.target.value)} /></div></div><button type="submit" className="hub-primary" disabled={busy || !title.trim()}>{busy ? "Saving…" : "Create mission"}</button></form>}
    <div className="mission-grid">{visible.map(task => <article key={task.id} className={`mission-card ${task.status === "COMPLETED" ? "mission-complete" : ""}`}><div className="mission-card-top"><span className={`mission-priority priority-${task.priority.toLowerCase()}`}>{task.priority}</span><span className="mission-state">{task.status.replaceAll("_", " ")}</span></div><h2>{task.title}</h2><p>{task.nextAction || "Choose one small step to get moving."}</p>{task.dueAt && <div className={`mission-deadline ${overdue(task) ? "is-overdue" : ""}`}><Clock3 size={14} />{overdue(task) ? "Overdue · " : "Due · "}{new Date(task.dueAt).toLocaleString("en-AU")}</div>}<div className="mission-card-actions">{task.status !== "COMPLETED" && <button disabled={busy} onClick={() => void write(task.id, { status: "COMPLETED" })}><Check size={15} />Complete</button>}{task.status === "OPEN" && <button disabled={busy} onClick={() => void write(task.id, { status: "WAITING" })}><Clock3 size={15} />Wait</button>}{task.status !== "OPEN" && <button disabled={busy} onClick={() => void write(task.id, { status: "OPEN" })}><RotateCcw size={15} />Reopen</button>}<button disabled={busy} onClick={() => { setEditing(editing === task.id ? null : task.id); setStep(task.nextAction || ""); }}>Edit step</button></div>{editing === task.id && <form className="mission-step-form" onSubmit={async event => { event.preventDefault(); if (await write(task.id, { nextAction: step.trim() || null })) setEditing(null); }}><label htmlFor={`step-${task.id}`}>Edit the next action</label><input id={`step-${task.id}`} value={step} maxLength={1000} disabled={busy} onChange={event => setStep(event.target.value)} /><button disabled={busy} className="hub-primary">Save step</button></form>}</article>)}</div>
    {!visible.length && <div className="mission-empty"><Check size={28} /><h2>{search ? "No matching missions." : "Nothing in this lane."}</h2><p>Capture a goal or choose another filter.</p></div>}<p className="hub-footnote">Showing {visible.length} of {tasks.length} loaded tasks. Up to 100 tasks are loaded on this page.</p>
  </div>;
}
