"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CalendarDays, Focus, Radio, RefreshCw, Sparkles, Zap } from "lucide-react";
import { type buildCommandCenter } from "@/lib/intelligence/command-center";

type Snapshot = ReturnType<typeof buildCommandCenter>;
export function CommandCenter({ name }: { name: string }) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(0);
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
    const capture = () => setRevision(value => value + 1);
    window.addEventListener("zoro:task-created", capture);
    document.addEventListener("visibilitychange", foreground);
    return () => { clearInterval(interval); window.removeEventListener("zoro:task-created", capture); document.removeEventListener("visibilitychange", foreground); };
  }, []);
  useEffect(() => {
    const open = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); dialog.current?.showModal(); }
    };
    window.addEventListener("keydown", open);
    return () => window.removeEventListener("keydown", open);
  }, []);

  const stale = Boolean(data && now - Date.parse(data.generatedAt) > 5 * 60_000);
  const clock = (stamp: string) => new Date(stamp).toLocaleTimeString("en-AU", { timeZone: data?.timezone, hour: "numeric", minute: "2-digit" });
  const stamp = data ? new Date(data.generatedAt).toLocaleDateString("en-AU", { timeZone: data.timezone, weekday: "long", month: "long", day: "numeric" }) : "Your personal command center";
  const routes = [{ title: "Talk to Zoro", description: "Voice, conversation and action previews", href: "/assistant" }, { title: "Calendar", description: "Review or create an event", href: "/calendar" }, { title: "Tasks", description: "Capture and complete your work", href: "/tasks" }, { title: "Inbox", description: "Scan messages and see email actions", href: "/inbox" }, { title: "Search everything", description: "Find saved work and messages", href: "/search" }, { title: "Connections", description: "Check Google access and sign in", href: "/connections" }, { title: "Assistant settings", description: "Choose voice and wake word", href: "/settings/assistant" }];

  return <div className="command-center professional-command-center">
    <section className="professional-home-hero">
      <div>
        <p className="professional-kicker">{stamp}</p>
        <h1>Good to see you, {name}.</h1>
        <p>Priorities, calendar and important messages in one clear workspace.</p>
      </div>
      <div className="professional-home-actions">
        <Link href="/assistant" className="professional-primary"><Sparkles size={17}/> Ask Zoro</Link>
        <Link href="/today" className="professional-secondary">Open Today</Link>
      </div>
    </section>
    <div className="cc-section-heading"><div><p className="cc-eyebrow">RECOMMENDED FOR YOU</p><h2>Clarity before action.</h2></div><button className="cc-icon-button" onClick={() => setRevision(value => value + 1)} disabled={loading} aria-label="Refresh command center"><RefreshCw size={18} className={loading ? "cc-spin" : ""} /></button></div>
    <div role="status" className="cc-freshness">{loading ? "Reading your priorities and calendar…" : error || (data ? `Snapshot ${clock(data.generatedAt)} · ${data.timezone}${stale ? " · Refresh to verify available time" : ""}` : "No data loaded")}</div>
    <div className="cc-metrics">
      {[{ label: "Open tasks loaded", value: data?.taskCount, icon: Focus }, { label: "Due today", value: data?.dueToday, icon: CalendarDays }, { label: "Overdue items", value: data?.overdue, icon: Zap }, { label: "Email actions loaded", value: data?.emailCount, icon: Radio }].map(({ label, value, icon: Icon }) => <div className="cc-metric" key={label}><Icon size={17} /><strong>{value ?? "—"}</strong><span>{label}</span></div>)}
    </div>

    <div className="cc-grid">
      <section className="cc-panel cc-priorities"><div className="cc-panel-heading"><h2>Your next moves</h2><span className="cc-tag">RANKED BY PRIORITY</span></div>
        {data?.priorities.map((item, index) => <article className="cc-priority" key={item.id}><span className="cc-number">0{index + 1}</span><div><p className="cc-eyebrow">{item.priority}</p><h3><Link href={item.href}>{item.title}</Link></h3><p>{item.nextAction}</p><details><summary>Why this matters</summary><p>{item.reason}</p></details></div></article>)}
        {data && !data.priorities.length && <p className="cc-empty">A clear runway. <Link href="/tasks">Capture your next goal →</Link></p>}
        {!data && <p className="cc-empty">Your priorities will appear here once your briefing loads.</p>}
      </section>
      <section className="cc-panel"><div className="cc-panel-heading"><h2>Attention radar</h2><Radio size={18} /></div><p className="cc-caption">Signals from your loaded data. Refresh after changes.</p>
        {data?.signals.map(signal => <Link className={`cc-signal ${signal.level === "attention" ? "cc-signal-alert" : ""}`} key={signal.title} href={signal.href}><span className="cc-signal-dot" /><div><h3>{signal.title}</h3><p>{signal.detail}</p></div><ArrowUpRight size={16} /></Link>)}
        {!data && <p className="cc-empty">Waiting for verified signals.</p>}
      </section>
    </div>

    <section className="cc-panel cc-timeline"><div className="cc-panel-heading"><div><p className="cc-eyebrow">YOUR TIMELINE</p><h2>Your remaining schedule</h2></div><Link href="/calendar" className="cc-text-button">Calendar <ArrowUpRight size={15} /></Link></div>
      {data?.calendarStatus !== "available" && <p className="cc-caption">Calendar may be incomplete. Review your connection before relying on this timeline.</p>}
      {data?.timeline.filter(item => Date.parse(item.end) > now).map(item => <div className="cc-event" key={item.id}><span>{item.allDay ? "All day" : clock(item.start)}</span><span className="cc-event-dot" /><div><h3>{item.title}</h3><p>{item.allDay ? "All-day commitment" : `Until ${clock(item.end)}`}</p></div>{Date.parse(item.start) <= now && <span className="cc-tag">NOW</span>}</div>)}
      {data && !data.timeline.some(item => Date.parse(item.end) > now) && <p className="cc-empty">{data.verified ? "No remaining events in today's loaded calendar." : "No verified events to show."}</p>}
    </section>
    <div className="cc-endnote"><Sparkles size={14} /> Built around your day. Powered by your decisions.</div>
    <dialog aria-labelledby="quick-command-title" ref={dialog} className="cc-command-dialog" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}><div className="cc-panel-heading"><h2 id="quick-command-title">Where next?</h2><button className="cc-icon-button" onClick={() => dialog.current?.close()} aria-label="Close quick commands">✕</button></div><label className="sr-only" htmlFor="command-search">Filter quick commands</label><input id="command-search" autoFocus placeholder="Find a command…" value={query} onChange={event => setQuery(event.target.value)} />{routes.filter(route => `${route.title} ${route.description}`.toLowerCase().includes(query.toLowerCase())).map(route => <Link key={route.href} href={route.href} onClick={() => dialog.current?.close()}><div><strong>{route.title}</strong><p>{route.description}</p></div><ArrowUpRight size={17} /></Link>)}{!routes.some(route => `${route.title} ${route.description}`.toLowerCase().includes(query.toLowerCase())) && <p className="cc-empty">No matching command.</p>}</dialog>
  </div>;
}
