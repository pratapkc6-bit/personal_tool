"use client";

import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventInput } from "@fullcalendar/core";

export function CalendarBoard() {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EventClickArg["event"] | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/calendar/events");
    if (res.ok) setEvents(await res.json());
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const height = useMemo(() => (typeof window !== "undefined" && window.innerWidth < 640 ? "auto" : 720), []);

  return (
    <div className="space-y-3">
      {loading && <p className="text-sm text-slate-500">Refreshing Google Calendar…</p>}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 sm:p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "timeGridDay,timeGridWeek,dayGridMonth,listWeek",
          }}
          buttonText={{ day: "Day", week: "Week", month: "Month", list: "Agenda" }}
          events={events}
          nowIndicator
          editable={false}
          selectable
          height={height}
          eventClick={(info) => setSelected(info.event)}
        />
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/35 p-3 sm:items-center sm:justify-center" onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Event details</p>
            <h2 className="mt-1 text-xl font-bold">{selected.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{selected.start?.toLocaleString("en-AU")} {selected.end ? `– ${selected.end.toLocaleString("en-AU")}` : ""}</p>
            <div className="mt-5 flex gap-2">
              <button className="flex-1 rounded-xl border border-slate-300 px-4 py-2" onClick={() => setSelected(null)}>Close</button>
              <button
                className="flex-1 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white"
                onClick={async () => {
                  if (!confirm(`Delete "${selected.title}" from Google Calendar? This is an explicit calendar change.`)) return;
                  const res = await fetch(`/api/calendar/events/${selected.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmed: true }) });
                  if (res.ok) { setSelected(null); await load(); }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
