"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventApi, EventInput } from "@fullcalendar/core";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LayoutList,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";

function localInput(date: Date | null) {
  if (!date) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function parseEventDate(value: EventInput["start"]) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const date = new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRange(start: Date, end: Date, view: string) {
  const inclusiveEnd = new Date(end);
  inclusiveEnd.setDate(inclusiveEnd.getDate() - 1);

  if (view === "timeGridDay") {
    return start.toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  if (view === "dayGridMonth") {
    return start.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
  }

  const startLabel = start.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  const endLabel = inclusiveEnd.toLocaleDateString("en-AU", {
    day: "numeric",
    month: start.getMonth() === inclusiveEnd.getMonth() ? undefined : "short",
    year: start.getFullYear() === inclusiveEnd.getFullYear() ? undefined : "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

const views = [
  { id: "timeGridDay", label: "Day" },
  { id: "timeGridThreeDay", label: "3 days" },
  { id: "timeGridWeek", label: "Week" },
  { id: "dayGridMonth", label: "Month" },
  { id: "listWeek", label: "Agenda" },
];

export function CalendarBoard() {
  const calendarRef = useRef<FullCalendar | null>(null);
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
  const [currentView, setCurrentView] = useState("timeGridWeek");
  const [rangeLabel, setRangeLabel] = useState("Your schedule");
  const [calendarHeight, setCalendarHeight] = useState(720);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/calendar/events", { cache: "no-store" });
    if (res.ok) setEvents(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    void load();

    const mobile = window.matchMedia("(max-width: 760px)").matches;
    setCalendarHeight(mobile ? 640 : 720);
    if (mobile) {
      window.setTimeout(() => calendarRef.current?.getApi().changeView("timeGridDay"), 0);
    }
  }, []);

  const todayCount = useMemo(() => {
    const today = new Date();
    return events.filter((event) => {
      const eventDate = parseEventDate(event.start);
      return eventDate && eventDate.toDateString() === today.toDateString();
    }).length;
  }, [events]);

  const nextEvent = useMemo(() => {
    const now = Date.now();
    return events
      .map((event) => ({ event, date: parseEventDate(event.start) }))
      .filter((item): item is { event: EventInput; date: Date } => Boolean(item.date && item.date.getTime() >= now))
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0] || null;
  }, [events]);

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

  function changeView(view: string) {
    calendarRef.current?.getApi().changeView(view);
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

  const nextLabel = nextEvent
    ? `${String(nextEvent.event.title || "Untitled event")} · ${nextEvent.date.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}`
    : "No upcoming event loaded";

  return (
    <div className="nexus-calendar-workspace">
      <section className="calendar-command-deck">
        <div className="calendar-range">
          <span className="calendar-live-chip"><span /> LIVE GOOGLE CALENDAR</span>
          <h2>{rangeLabel}</h2>
          <p>{loading ? "Synchronising your schedule…" : `${events.length} events loaded · ${todayCount} today`}</p>
        </div>

        <div className="calendar-control-stack">
          <div className="calendar-nav-cluster" aria-label="Calendar navigation">
            <button onClick={() => calendarRef.current?.getApi().prev()} aria-label="Previous period"><ChevronLeft size={18} /></button>
            <button className="calendar-today-button" onClick={() => calendarRef.current?.getApi().today()}>Today</button>
            <button onClick={() => calendarRef.current?.getApi().next()} aria-label="Next period"><ChevronRight size={18} /></button>
            <button onClick={() => void load()} aria-label="Refresh calendar" className={loading ? "is-loading" : ""}><RefreshCw size={16} /></button>
          </div>
          <div className="calendar-view-tabs" aria-label="Calendar view">
            {views.map((item) => (
              <button
                key={item.id}
                aria-pressed={currentView === item.id}
                onClick={() => changeView(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="calendar-insight-row">
        <div className="calendar-insight">
          <CalendarClock size={17} />
          <div><span>Today</span><strong>{todayCount} scheduled</strong></div>
        </div>
        <div className="calendar-insight calendar-insight-wide">
          <Clock3 size={17} />
          <div><span>Next signal</span><strong>{nextLabel}</strong></div>
        </div>
        <div className="calendar-insight">
          <Sparkles size={17} />
          <div><span>View</span><strong>{views.find((item) => item.id === currentView)?.label || "Calendar"}</strong></div>
        </div>
      </div>

      <section className="nexus-calendar-shell">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={false}
          views={{
            timeGridThreeDay: {
              type: "timeGrid",
              duration: { days: 3 },
            },
          }}
          events={events}
          nowIndicator
          editable={false}
          selectable
          stickyHeaderDates
          dayMaxEvents
          slotEventOverlap={false}
          expandRows
          allDaySlot
          slotMinTime="06:00:00"
          slotMaxTime="23:00:00"
          scrollTime="07:00:00"
          slotDuration="00:30:00"
          slotLabelInterval="01:00"
          slotLabelFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
          dayHeaderFormat={{ weekday: "short", day: "numeric", month: "short" }}
          height={calendarHeight}
          eventClick={(info) => choose(info.event)}
          datesSet={(info) => {
            setCurrentView(info.view.type);
            setRangeLabel(formatRange(info.start, info.end, info.view.type));
          }}
          eventClassNames={(arg) => [
            "nexus-calendar-event",
            `calendar-category-${String(arg.event.extendedProps.category || "personal").toLowerCase().replaceAll("_", "-")}`,
          ]}
        />
      </section>

      <p className="calendar-footnote"><LayoutList size={14} /> Mobile opens in Day view so your schedule stays readable instead of being squeezed into seven tiny columns.</p>

      {selected && (
        <div className="calendar-sheet-backdrop" onClick={() => setSelected(null)}>
          <section className="calendar-event-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="calendar-sheet-handle" />
            <div className="calendar-sheet-head">
              <div>
                <p className="nexus-kicker">{editing ? "EDIT / RESCHEDULE" : "EVENT INTELLIGENCE"}</p>
                <h2>{selected.title || "Untitled event"}</h2>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Close event"><X size={18} /></button>
            </div>

            {!editing ? (
              <>
                <div className="calendar-event-meta">
                  <div><span>START</span><strong>{selected.start?.toLocaleString("en-AU")}</strong></div>
                  <div><span>END</span><strong>{selected.end?.toLocaleString("en-AU") || "No end time"}</strong></div>
                  <div><span>CATEGORY</span><strong>{String(selected.extendedProps.category || "PERSONAL").replaceAll("_", " ")}</strong></div>
                </div>

                <div className="calendar-sheet-actions">
                  <button className="calendar-secondary" onClick={() => setSelected(null)}>Close</button>
                  <button className="calendar-secondary" onClick={() => setEditing(true)}>Edit event</button>
                  <button className="calendar-danger" onClick={() => setPreview(true)}>Delete</button>
                </div>

                {preview && (
                  <div className="calendar-confirm-panel danger">
                    <span>DESTRUCTIVE ACTION</span>
                    <p>Delete “{selected.title}” from Google Calendar?</p>
                    <button onClick={deleteEvent}>Confirm delete</button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="calendar-edit-grid">
                  <label className="calendar-field calendar-field-wide">Title
                    <input value={title} onChange={(event) => { setTitle(event.target.value); setPreview(false); }} />
                  </label>
                  <label className="calendar-field">Start
                    <input type="datetime-local" value={start} onChange={(event) => { setStart(event.target.value); setPreview(false); }} />
                  </label>
                  <label className="calendar-field">End
                    <input type="datetime-local" value={end} onChange={(event) => { setEnd(event.target.value); setPreview(false); }} />
                  </label>
                  <label className="calendar-field calendar-field-wide">Category
                    <select value={category} onChange={(event) => { setCategory(event.target.value); setPreview(false); }}>
                      {["WORK","PROFESSIONAL_YEAR","WORKOUT","APPOINTMENT","PERSONAL","DEADLINE","REMINDER"].map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </label>
                </div>

                {preview && (
                  <div className="calendar-confirm-panel">
                    <span>CONFIRMATION PREVIEW</span>
                    <p><strong>Before:</strong> {selected.title}, {selected.start?.toLocaleString("en-AU")}</p>
                    <p><strong>After:</strong> {title}, {new Date(start).toLocaleString("en-AU")} → {new Date(end).toLocaleString("en-AU")}</p>
                  </div>
                )}

                {status && <p className="calendar-status">{status}</p>}
                <div className="calendar-sheet-actions">
                  <button className="calendar-secondary" onClick={() => { setEditing(false); setPreview(false); }}>Cancel</button>
                  {!preview
                    ? <button className="calendar-primary" onClick={() => setPreview(true)}>Preview changes</button>
                    : <button className="calendar-primary" onClick={updateEvent}>Confirm update</button>}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
