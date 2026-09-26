"use client";

import Link from "next/link";
import { APP_VERSION } from "@/lib/release";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, AudioLines, CalendarDays, ChevronRight, Command, Focus, Radio, RefreshCw, Sparkles, Zap } from "lucide-react";
import { fitFocusSessions, type buildCommandCenter } from "@/lib/intelligence/command-center";

type Snapshot = ReturnType<typeof buildCommandCenter>;
export function CommandCenter({ name }: { name: string }) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(0);
  const [minutes, setMinutes] = useState(25);
  const [buffer, setBuffer] = useState(5);
  const [focusTitle, setFocusTitle] = useState("Your next meaningful step");
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    fetch("/api/command-center", { signal: controller.signal, cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error(response.status === 401 ? "Sign in through Connections to load your command center." : "Unable to refresh your briefing. Please retry."); return response.json(); })
      .then(snapshot => { if (!controller.signal.aborted) setData(snapshot); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const interval = window.setInterval(tick, 1000);
    const foreground = () => { if (document.visibilityState === "visible") { tick(); setRevision(value => value + 1); } };
    document.addEventListener("visibilitychange", foreground);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", foreground); };
  }, []);
  useEffect(() => {
    const open = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); dialog.current?.showModal(); }
    };
    window.addEventListener("keydown", open);
    return () => window.removeEventListener("keydown", open);
  }, []);

  const stale = Boolean(data && now - Date.parse(data.generatedAt) > 5 * 60_000);
  const canPlan = Boolean(data?.verified && !stale && !error && !loading);
  const sessions = canPlan ? fitFocusSessions(data!.windows, minutes, buffer, now) : [];
  const seconds = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : remaining ?? minutes * 60;
  const finished = endsAt !== null && seconds === 0;
  const clock = (stamp: string) => new Date(stamp).toLocaleTimeString("en-AU", { timeZone: data?.timezone, hour: "numeric", minute: "2-digit" });
  const stamp = data ? new Date(data.generatedAt).toLocaleDateString("en-AU", { timeZone: data.timezone, weekday: "long", month: "long", day: "numeric" }) : "Your personal command center";
  const routes = [{ title: "Talk to Zoro", description: "Voice, conversation and action previews", href: "/assistant" }, { title: "Calendar", description: "Review or create an event", href: "/calendar" }, { title: "Tasks", description: "Capture and complete your work", href: "/tasks" }, { title: "Inbox", description: "Scan messages and see email actions", href: "/inbox" }, { title: "Search everything", description: "Find saved work and messages", href: "/search" }, { title: "Connections", description: "Check Google access and sign in", href: "/connections" }, { title: "Assistant settings", description: "Choose voice and wake word", href: "/settings/assistant" }];

  return <div className="command-center">
    <div className="cc-topline"><span><span className="cc-status-dot" /> ZORO / PERSONAL OPERATING SYSTEM</span><span>v{APP_VERSION}</span></div>
    <section className="cc-hero">
      <div className="cc-hero-copy">
        <p className="cc-eyebrow">{stamp}</p>
        <h1>Your day.<br /><span>Within reach.</span></h1>
        <p className="cc-intro">Welcome back, {name}. Turn the noise into a next step.</p>
        <div className="cc-actions"><Link href="/assistant" className="cc-button cc-primary"><AudioLines size={18} /> Talk to Zoro <ArrowUpRight size={17} /></Link><button className="cc-button cc-secondary" onClick={() => dialog.current?.showModal()}><Command size={16} /> Quick commands</button></div>
      </div>
      <div className="cc-orbit" aria-hidden="true"><div className="cc-orbit-ring cc-ring-one" /><div className="cc-orbit-ring cc-ring-two" /><div className="cc-orbit-core"><Sparkles size={38} /></div><span className="cc-orbit-label">THINK · PLAN · ACT</span></div>
    </section>

    <div className="cc-section-heading"><div><p className="cc-eyebrow">01 / SITUATION ROOM</p><h2>Clarity before action.</h2></div><button className="cc-icon-button" onClick={() => setRevision(value => value + 1)} disabled={loading} aria-label="Refresh command center"><RefreshCw size={18} className={loading ? "cc-spin" : ""} /></button></div>
    <div role="status" className="cc-freshness">{loading ? "Reading your priorities and calendar…" : error || (data ? `Snapshot ${clock(data.generatedAt)} · ${data.timezone}${stale ? " · Refresh to verify available time" : ""}` : "No data loaded")}</div>
    <div className="cc-metrics">
      {[{ label: "Open tasks loaded", value: data?.taskCount, icon: Focus }, { label: "Due today", value: data?.dueToday, icon: CalendarDays }, { label: "Overdue items", value: data?.overdue, icon: Zap }, { label: "Email actions loaded", value: data?.emailCount, icon: Radio }].map(({ label, value, icon: Icon }) => <div className="cc-metric" key={label}><Icon size={17} /><strong>{value ?? "—"}</strong><span>{label}</span></div>)}
    </div>

    <div className="cc-grid">
      <section className="cc-panel cc-priorities"><div className="cc-panel-heading"><h2>Your next moves</h2><span className="cc-tag">RANKED BY PRIORITY</span></div>
        {data?.priorities.map((item, index) => <article className="cc-priority" key={item.id}><span className="cc-number">0{index + 1}</span><div><p className="cc-eyebrow">{item.priority}</p><h3><Link href={item.href}>{item.title}</Link></h3><p>{item.nextAction}</p><details><summary>Why this matters</summary><p>{item.reason}</p></details><button className="cc-text-button disabled:opacity-40" disabled={endsAt !== null || remaining !== null} onClick={() => { setFocusTitle(item.title); document.getElementById("focus-session")?.scrollIntoView({ block: "center" }); }}>Focus on this <ChevronRight size={14} /></button></div></article>)}
        {data && !data.priorities.length && <p className="cc-empty">A clear runway. <Link href="/tasks">Capture your next goal →</Link></p>}
        {!data && <p className="cc-empty">Your priorities will appear here once your briefing loads.</p>}
      </section>
      <section className="cc-panel"><div className="cc-panel-heading"><h2>Attention radar</h2><Radio size={18} /></div><p className="cc-caption">Signals from your loaded data. Refresh after changes.</p>
        {data?.signals.map(signal => <Link className={`cc-signal ${signal.level === "attention" ? "cc-signal-alert" : ""}`} key={signal.title} href={signal.href}><span className="cc-signal-dot" /><div><h3>{signal.title}</h3><p>{signal.detail}</p></div><ArrowUpRight size={16} /></Link>)}
        {!data && <p className="cc-empty">Waiting for verified signals.</p>}
      </section>
    </div>

    <div className="cc-section-heading"><div><p className="cc-eyebrow">02 / TIME LAB</p><h2>Make space for progress.</h2></div><span className="cc-tag">INTERACTIVE</span></div>
    <div className="cc-grid">
      <section className="cc-panel"><div className="cc-panel-heading"><h2>What can fit today?</h2><Sparkles size={18} /></div><p className="cc-caption">Change your focus length and recovery buffer. Preview up to six sessions within verified gaps, 09:00–18:00.</p>
        <label className="cc-range-label" htmlFor="focus-duration">Focus length <strong>{minutes} min</strong></label><input id="focus-duration" className="cc-range" type="range" min="15" max="90" step="5" value={minutes} disabled={endsAt !== null || remaining !== null} onChange={event => setMinutes(Number(event.target.value))} />
        <div className="cc-buffer"><span>Recovery after each session</span><div>{[0, 5, 10, 15].map(value => <button key={value} aria-pressed={buffer === value} className={buffer === value ? "selected" : ""} onClick={() => setBuffer(value)}>{value}m</button>)}</div></div>
        {canPlan ? <><p className="cc-fit-count"><strong>{sessions.length}</strong> {minutes}-minute sessions fit <span>including recovery</span></p><div className="cc-slots">{sessions.map((slot, index) => <div key={slot.start}><span>0{index + 1}</span><strong>{clock(slot.start)}–{clock(slot.end)}</strong><span>{buffer}m buffer</span></div>)}</div>{!sessions.length && <p className="cc-empty">No window fits this combination. Try a shorter focus block or review tomorrow in Calendar.</p>}</> : <p className="cc-empty">{loading ? "Checking calendar windows…" : stale ? "Refresh the briefing to calculate current windows." : "Calendar gaps are not verified. Check Connections and refresh."}</p>}
        <p className="cc-caption cc-note">A planning preview only. Nothing is added to your calendar.</p><Link href="/calendar" className="cc-text-button">Open calendar <ArrowUpRight size={14} /></Link>
      </section>
      <section id="focus-session" className="cc-panel cc-focus"><div className="cc-panel-heading"><h2>One thing. Full attention.</h2><Focus size={18} /></div><p className="cc-focus-title">{focusTitle}</p>
        <div className={`cc-timer ${endsAt && !finished ? "cc-timer-active" : ""}`}><span>{String(Math.floor(seconds / 60)).padStart(2, "0")}<i>:</i>{String(seconds % 60).padStart(2, "0")}</span><small>{finished ? "SESSION COMPLETE" : endsAt ? "FOCUS IN PROGRESS" : remaining !== null ? "PAUSED" : "READY WHEN YOU ARE"}</small></div>
        <p role="status" className="cc-caption">{finished ? "Session complete. Take a breath, then choose your next step." : "A timer for this page. It does not block apps or create a calendar event."}</p>
        <div className="cc-actions">{endsAt && !finished ? <button className="cc-button cc-primary" onClick={() => { setRemaining(seconds); setEndsAt(null); }}>Pause session</button> : !finished ? <button className="cc-button cc-primary" onClick={() => { const at = Date.now(); setNow(at); setEndsAt(at + (remaining ?? minutes * 60) * 1000); setRemaining(null); }}>{remaining !== null ? "Resume" : "Start focus now"}</button> : null}{(endsAt !== null || remaining !== null) && <button className="cc-button cc-secondary" onClick={() => { setEndsAt(null); setRemaining(null); }}>Reset</button>}</div>
        <p className="cc-caption cc-note">Resumes elapsed time when you return. Reloading resets the timer; no background alarm is promised.</p>
      </section>
    </div>

    <section className="cc-panel cc-timeline"><div className="cc-panel-heading"><div><p className="cc-eyebrow">03 / TODAY'S TRAJECTORY</p><h2>Your remaining schedule</h2></div><Link href="/calendar" className="cc-text-button">Calendar <ArrowUpRight size={15} /></Link></div>
      {data?.calendarStatus !== "available" && <p className="cc-caption">Calendar may be incomplete. Review your connection before relying on this timeline.</p>}
      {data?.timeline.filter(item => Date.parse(item.end) > now).map(item => <div className="cc-event" key={item.id}><span>{item.allDay ? "All day" : clock(item.start)}</span><span className="cc-event-dot" /><div><h3>{item.title}</h3><p>{item.allDay ? "All-day commitment" : `Until ${clock(item.end)}`}</p></div>{Date.parse(item.start) <= now && <span className="cc-tag">NOW</span>}</div>)}
      {data && !data.timeline.some(item => Date.parse(item.end) > now) && <p className="cc-empty">{data.verified ? "No remaining events in today's loaded calendar." : "No verified events to show."}</p>}
    </section>
    <div className="cc-endnote"><Sparkles size={14} /> Built around your day. Powered by your decisions.</div>
    <dialog aria-labelledby="quick-command-title" ref={dialog} className="cc-command-dialog" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}><div className="cc-panel-heading"><h2 id="quick-command-title">Where next?</h2><button className="cc-icon-button" onClick={() => dialog.current?.close()} aria-label="Close quick commands">✕</button></div><label className="sr-only" htmlFor="command-search">Filter quick commands</label><input id="command-search" autoFocus placeholder="Find a command…" value={query} onChange={event => setQuery(event.target.value)} />{routes.filter(route => `${route.title} ${route.description}`.toLowerCase().includes(query.toLowerCase())).map(route => <Link key={route.href} href={route.href} onClick={() => dialog.current?.close()}><div><strong>{route.title}</strong><p>{route.description}</p></div><ArrowUpRight size={17} /></Link>)}{!routes.some(route => `${route.title} ${route.description}`.toLowerCase().includes(query.toLowerCase())) && <p className="cc-empty">No matching command.</p>}</dialog>
  </div>;
}
