"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { buildMission } from "@/lib/intelligence/mission";

type Mission = ReturnType<typeof buildMission>;
export function MissionPanel({ refreshKey, onPrompt }: { refreshKey: number; onPrompt: (prompt: string) => void }) {
  const [mission, setMission] = useState<Mission | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch("/api/assistant", { signal: controller.signal, cache: "no-store" })
      .then(async res => { if (!res.ok) throw new Error("Briefing unavailable. Your connections may need attention."); return res.json(); })
      .then(data => setMission(data.mission))
      .catch(err => { if (err.name !== "AbortError") setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refreshKey, refresh]);

  const time = (value: string) => new Date(value).toLocaleTimeString("en-AU", { timeZone: mission?.timezone, hour: "numeric", minute: "2-digit" });
  return (
    <section aria-label="Daily command briefing" className="relative overflow-hidden rounded-3xl border border-cyan-800 bg-slate-950 p-5 text-white sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Zoro / Command briefing</p>
        <button type="button" onClick={() => setRefresh(r => r + 1)} disabled={loading} className="rounded-full border border-slate-600 px-3 py-1.5 text-xs text-slate-200 disabled:opacity-50">{loading ? "Refreshing…" : "Refresh"}</button>
      </div>
      {error ? <p role="status" className="mt-5 text-sm text-amber-200">{error}</p> : mission ? <>
        <div className="mt-6 flex items-center gap-5">
          <div aria-hidden="true" className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-full border border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_35px_rgba(34,211,238,0.15)] sm:flex">
            <div className="h-10 w-10 rounded-full border-2 border-cyan-300 bg-cyan-400/20 motion-safe:animate-pulse" />
          </div>
          <div><h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{mission.headline}</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">{mission.nextStep}</p></div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
          {[{ label: "Overdue items", value: mission.overdue }, { label: "Focus minutes", value: mission.freeMinutes ?? "—" }, { label: "Schedule conflicts", value: mission.conflictCount ?? "—" }].map(item => (
            <div key={item.label} className="rounded-2xl border border-slate-700 bg-slate-900 p-3"><p className="text-2xl font-semibold text-cyan-100">{item.value}</p><p className="mt-1 text-[11px] text-slate-400">{item.label}</p></div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">Focus minutes count windows of 30+ minutes remaining between 09:00–18:00.</p>
        {mission.nextWindow && <p className="mt-4 text-sm text-cyan-200">Next focus window · {time(mission.nextWindow.start)}–{time(mission.nextWindow.end)}</p>}
        {mission.calendarStatus !== "available" && <p className="mt-4 text-sm text-amber-200">Calendar {mission.calendarStatus}. Free time is not verified.</p>}
        {mission.conflicts.map(conflict => <p key={conflict} className="mt-2 text-sm text-amber-200">{conflict}</p>)}
        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={() => onPrompt("Brief me on what needs my attention and help me decide what to do first.")} className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950">Brief me</button>
          <button onClick={() => onPrompt("Plan my day")} className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-semibold">Build my plan</button>
          <Link href="/settings/assistant" className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm">Voice settings</Link>
        </div>
        <p className="mt-4 text-xs text-slate-500">Updated {time(mission.generatedAt)} · Gmail {mission.lastGmailScanAt ? `last scanned ${new Date(mission.lastGmailScanAt).toLocaleString("en-AU", { timeZone: mission.timezone })}` : "has not been scanned"}</p>
      </> : <p role="status" className="mt-6 text-sm text-slate-300">Gathering your priorities and calendar…</p>}
    </section>
  );
}
