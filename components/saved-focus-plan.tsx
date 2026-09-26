"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookmarkCheck, Save } from "lucide-react";
import type { SavedPlan } from "@/lib/intelligence/saved-plan";

export function SavedFocusPlan({ title, minutes, buffer, enabled }: { title: string; minutes: number; buffer: number; enabled: boolean }) {
  const [plan, setPlan] = useState<SavedPlan | null>(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setNow(Date.now());
    fetch("/api/focus-plan", { cache: "no-store", signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error("Saved plan could not be loaded."); return response.json(); })
      .then(data => { if (!controller.signal.aborted) setPlan(data.plan); })
      .catch(error => { if (!controller.signal.aborted) setMessage(error.message); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, []);
  async function update(method: "PUT" | "DELETE") {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/focus-plan", { method, headers: { "Content-Type": "application/json" }, ...(method === "PUT" ? { body: JSON.stringify({ title, minutes, buffer }) } : {}) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Plan could not be updated.");
      setPlan(data.plan); setNow(Date.now());
      setMessage(method === "PUT" ? "Saved to your account after a fresh calendar check. No events were created." : "Saved plan cleared.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Connection interrupted. Reload to verify your saved plan."); }
    finally { setBusy(false); }
  }
  const date = (value: string) => new Date(value).toLocaleString("en-AU", { timeZone: plan?.timezone, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  return <div className="saved-plan">
    <button className="cc-button cc-primary" disabled={!enabled || busy} onClick={() => void update("PUT")}><Save size={16} />{busy ? "Loading…" : plan ? "Replace saved plan" : "Save this focus plan"}</button>
    <p className="cc-caption cc-note">Uses the selected priority and focus length. Saving checks your calendar again and replaces your previous plan.</p>
    {message && <p role="status" className="cc-caption">{message}</p>}
    {plan && <div className="saved-plan-card"><p className="cc-eyebrow"><BookmarkCheck size={14} /> SAVED TO YOUR ACCOUNT</p><h3>{plan.title}</h3><p className="cc-caption">{plan.minutes}m focus / {plan.buffer}m recovery · Saved {date(plan.createdAt)}</p><ol>{plan.sessions.map((slot, index) => <li key={slot.start}><span>0{index + 1}</span><span>{date(slot.start)}–{new Date(slot.end).toLocaleTimeString("en-AU", { timeZone: plan.timezone, hour: "numeric", minute: "2-digit" })}</span></li>)}</ol><p className="cc-caption">{Date.parse(plan.sessions.at(-1)!.end) < now ? "These planned times have passed. Save a new plan when ready." : "Saved suggestion, not a reservation. Calendar changes may affect these times."}</p><div className="flex flex-wrap gap-3"><Link href="/calendar" className="cc-text-button">Review calendar →</Link><button className="cc-text-button" disabled={busy} onClick={() => void update("DELETE")}>Clear saved plan</button></div></div>}
  </div>;
}
