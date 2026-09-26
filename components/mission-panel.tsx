"use client";

import { useEffect, useState } from "react";
import { CalendarClock, RefreshCw, Sparkles, Target } from "lucide-react";
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
      .then(async (res) => {
        if (!res.ok) throw new Error("Briefing unavailable. Check your connections.");
        return res.json();
      })
      .then((data) => setMission(data.mission))
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [refreshKey, refresh]);

  const time = (value: string) => new Date(value).toLocaleTimeString("en-AU", {
    timeZone: mission?.timezone,
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <section className="zoro-context-card" aria-label="Daily command briefing">
      <div className="zoro-context-head">
        <div>
          <p className="nexus-kicker">LIVE CONTEXT</p>
          <h2>Today at a glance</h2>
        </div>
        <button onClick={() => setRefresh((value) => value + 1)} disabled={loading} aria-label="Refresh context">
          <RefreshCw size={15} className={loading ? "cc-spin" : ""} />
        </button>
      </div>

      {error ? (
        <p className="zoro-context-error">{error}</p>
      ) : mission ? (
        <>
          <div className="zoro-context-focus">
            <span className="zoro-context-icon"><Target size={17} /></span>
            <div>
              <strong>{mission.headline}</strong>
              <p>{mission.nextStep}</p>
            </div>
          </div>

          <div className="zoro-context-metrics">
            <div><strong>{mission.overdue}</strong><span>Overdue</span></div>
            <div><strong>{mission.freeMinutes ?? "—"}</strong><span>Focus min</span></div>
            <div><strong>{mission.conflictCount ?? "—"}</strong><span>Conflicts</span></div>
          </div>

          {mission.nextWindow && (
            <div className="zoro-next-window">
              <CalendarClock size={15} />
              <span>Next focus window</span>
              <strong>{time(mission.nextWindow.start)}–{time(mission.nextWindow.end)}</strong>
            </div>
          )}

          {mission.calendarStatus !== "available" && (
            <p className="zoro-context-warning">Calendar {mission.calendarStatus}. Free time is not fully verified.</p>
          )}

          <div className="zoro-context-actions">
            <button onClick={() => onPrompt("Brief me on what needs my attention and help me decide what to do first.")}>
              <Sparkles size={14} /> Brief me
            </button>
            <button onClick={() => onPrompt("Plan my day")}>Plan my day</button>
          </div>

          <p className="zoro-context-updated">
            Updated {time(mission.generatedAt)} · Gmail {mission.lastGmailScanAt ? "scanned " + new Date(mission.lastGmailScanAt).toLocaleString("en-AU", { timeZone: mission.timezone }) : "not scanned"}
          </p>
        </>
      ) : (
        <div className="zoro-context-loading">Gathering your priorities and calendar…</div>
      )}
    </section>
  );
}
