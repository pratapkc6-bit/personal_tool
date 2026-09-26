"use client";

import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventApi, EventInput } from "@fullcalendar/core";

function localInput(date: Date | null) {
  if (!date) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function CalendarBoard() {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EventApi | null>(null);
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState(false);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [category, setCategory] = useState("PERSONAL");
  const [status, setStatus] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/calendar/events");
    if (res.ok) setEvents(await res.json());
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const height = useMemo(() => (typeof window !== "undefined" && window.innerWidth < 640 ? "auto" : 720), []);

  function choose(event: EventApi) {
    setSelected(event);
    setEditing(false);
    setPreview(false);
    setStatus("");
    setTitle(event.title);
    setStart(localInput(event.start));
    setEnd(localInput(event.end || event.start));
    setCategory(String(event.extendedProps.category || "PERSONAL"));
  }

  async function updateEvent() {
    if (!selected) return;
    setStatus("Updating…");
    const res = await fetch(`/api/calendar/events/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: title,
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        category,
        confirmed: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setStatus(data.error || "Update failed");
    setSelected(null);
    await load();
  }

  async function deleteEvent() {
    if (!selected) return;
    setStatus("Deleting…");
    const res = await fetch(`/api/calendar/events/${selected.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmed: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setStatus(data.error || "Delete failed");
    setSelected(null);
    await load();
  }

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
          eventClick={(info) => choose(info.event)}
        />
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/35 p-3 sm:items-center sm:justify-center" onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{editing ? "Edit / reschedule" : "Event details"}</p>

            {!editing ? (
              <>
                <h2 className="mt-1 text-xl font-bold">{selected.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{selected.start?.toLocaleString("en-AU")} {selected.end ? `→ ${selected.end.toLocaleString("en-AU")}` : ""}</p>
                <p className="mt-1 text-sm text-slate-500">{String(selected.extendedProps.category || "PERSONAL").replaceAll("_", " ")}</p>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <button className="rounded-xl border border-slate-300 px-3 py-2 font-semibold" onClick={() => setSelected(null)}>Close</button>
                  <button className="rounded-xl border border-slate-300 px-3 py-2 font-semibold" onClick={() => setEditing(true)}>Edit</button>
                  <button className="rounded-xl border border-red-300 px-3 py-2 font-semibold text-red-700" onClick={() => setPreview(true)}>Delete</button>
                </div>
                {preview && (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-bold text-red-800">Confirmation preview</p>
                    <p className="mt-1 text-sm text-red-950">Delete “{selected.title}” from Google Calendar?</p>
                    <button onClick={deleteEvent} className="mt-3 w-full rounded-xl bg-red-600 px-3 py-2 font-semibold text-white">Confirm delete</button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-semibold sm:col-span-2">Title
                    <input value={title} onChange={(e) => { setTitle(e.target.value); setPreview(false); }} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal" />
                  </label>
                  <label className="text-sm font-semibold">Start
                    <input type="datetime-local" value={start} onChange={(e) => { setStart(e.target.value); setPreview(false); }} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal" />
                  </label>
                  <label className="text-sm font-semibold">End
                    <input type="datetime-local" value={end} onChange={(e) => { setEnd(e.target.value); setPreview(false); }} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal" />
                  </label>
                  <label className="text-sm font-semibold sm:col-span-2">Category
                    <select value={category} onChange={(e) => { setCategory(e.target.value); setPreview(false); }} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal">
                      {["WORK","PROFESSIONAL_YEAR","WORKOUT","APPOINTMENT","PERSONAL","DEADLINE","REMINDER"].map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </label>
                </div>

                {preview && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
                    <p className="font-bold text-amber-900">Confirmation preview</p>
                    <p className="mt-1">Before: {selected.title}, {selected.start?.toLocaleString("en-AU")}</p>
                    <p>After: {title}, {new Date(start).toLocaleString("en-AU")} → {new Date(end).toLocaleString("en-AU")}</p>
                  </div>
                )}

                {status && <p className="mt-3 text-sm text-slate-600">{status}</p>}
                <div className="mt-5 flex gap-2">
                  <button onClick={() => { setEditing(false); setPreview(false); }} className="flex-1 rounded-xl border border-slate-300 px-3 py-2 font-semibold">Cancel</button>
                  {!preview ? (
                    <button onClick={() => setPreview(true)} className="flex-1 rounded-xl bg-slate-900 px-3 py-2 font-semibold text-white">Preview changes</button>
                  ) : (
                    <button onClick={updateEvent} className="flex-1 rounded-xl bg-slate-900 px-3 py-2 font-semibold text-white">Confirm update</button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
