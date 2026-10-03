"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventApi, EventInput } from "@fullcalendar/core";
import { analyzeCalendar } from "@/lib/calendar-intelligence";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Focus,
  Sparkles,
  X,
  Zap,
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

function parseEventEnd(value: EventInput["end"], start: Date | null) {
  const parsed = parseEventDate(value);
  return parsed || (start ? new Date(start.getTime() + 60 * 60_000) : null);
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

function timeLabel(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}

function eventDayLabel(date: Date) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return date.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
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
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [calendarHeight, setCalendarHeight] = useState(720);
  const [scrollTime, setScrollTime] = useState("07:00:00");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/calendar/events", { cache: "no-store" });
    if (res.ok) setEvents(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    void load();

    const mobile = window.matchMedia("(max-width: 760px)").matches;
    const now = new Date();
    setCalendarHeight(mobile ? 560 : 760);
    setScrollTime(`${String(Math.max(6, now.getHours() - 1)).padStart(2, "0")}:00:00`);
    if (mobile) {
      window.setTimeout(() => calendarRef.current?.getApi().changeView("timeGridDay"), 0);
    }
  }, []);

  const normalizedEvents = useMemo(() => events.flatMap((event, index) => {
    const startDate = parseEventDate(event.start);
    if (!startDate) return [];
    const endDate = parseEventEnd(event.end, startDate);
    if (!endDate) return [];
    return [{
      id: String(event.id || index),
      title: String(event.title || "Untitled event"),
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      allDay: Boolean(event.allDay),
    }];
  }), [events]);

  const calendarIntel = useMemo(
    () => analyzeCalendar(normalizedEvents, new Date()),
    [normalizedEvents],
  );

  const todayCount = useMemo(() => {
    const today = new Date();
    return normalizedEvents.filter((event) => new Date(event.start).toDateString() === today.toDateString()).length;
  }, [normalizedEvents]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return events
      .map((event, index) => {
        const date = parseEventDate(event.start);
        const endDate = parseEventEnd(event.end, date);
        return { event, date, endDate, index };
      })
      .filter((item): item is { event: EventInput; date: Date; endDate: Date; index: number } =>
        Boolean(item.date && item.endDate && item.endDate.getTime() >= now),
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 6);
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

  function jumpToUpcoming(item: (typeof upcoming)[number]) {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    api.changeView("timeGridDay", item.date);
    const id = item.event.id ? String(item.event.id) : "";
    if (id) {
      window.setTimeout(() => {
        const event = api.getEventById(id);
        if (event) choose(event);
      }, 0);
    }
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

  const nextLabel = calendarIntel.nextEvent
    ? calendarIntel.nextEvent.title
    : "No upcoming event";

  const freeBlock = calendarIntel.freeBlocks[0] || null;
  const conflict = calendarIntel.conflicts[0] || null;
  const compactDayLabel = (rangeStart || new Date()).toLocaleDateString("en-AU", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).toUpperCase();

  return (
    <div className="timeline-workspace">
      <section className="timeline-command-bar">
        <div className="timeline-range-block">
          <span className="calendar-live-chip"><span /> LIVE GOOGLE CALENDAR</span>
          <h2>{rangeLabel}</h2>
          <p>{loading ? "Synchronising your schedule…" : `${todayCount} today · ${events.length} loaded`}</p>
        </div>

        <div className="timeline-controls">
          <div className="timeline-nav" aria-label="Calendar navigation">
            <button onClick={() => calendarRef.current?.getApi().prev()} aria-label="Previous period"><ChevronLeft size={19} /></button>
            <button onClick={() => calendarRef.current?.getApi().next()} aria-label="Next period"><ChevronRight size={19} /></button>
            <button className="timeline-today" onClick={() => calendarRef.current?.getApi().today()}>Today</button>
          </div>
        </div>

        <div className="timeline-view-switcher" aria-label="Calendar view">
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
      </section>

      <section className="timeline-status-grid" aria-label="Schedule summary">
        <article className="timeline-status-card is-next">
          <span className="timeline-status-icon"><Zap size={20} /></span>
          <div>
            <span>Next event</span>
            <strong>{nextLabel}</strong>
            <small>{calendarIntel.nextEvent ? `${timeLabel(calendarIntel.nextEvent.start)} – ${timeLabel(calendarIntel.nextEvent.end)}` : "Nothing else loaded"}</small>
          </div>
          <ChevronRight className="timeline-card-chevron" size={19} />
        </article>

        <article className="timeline-status-card is-free">
          <span className="timeline-status-icon"><CalendarClock size={20} /></span>
          <div>
            <span>Free block</span>
            <strong>{freeBlock ? `${freeBlock.minutes} min free` : "No long block"}</strong>
            <small>{freeBlock ? `${timeLabel(freeBlock.start)} – ${timeLabel(freeBlock.end)}` : "Your day is tightly packed"}</small>
          </div>
          <ChevronRight className="timeline-card-chevron" size={19} />
        </article>

        <article className="timeline-status-card is-load">
          <span className="timeline-status-icon"><Focus size={20} /></span>
          <div>
            <span>Day load</span>
            <strong>{calendarIntel.loadScore}% complete</strong>
            <small>{calendarIntel.conflicts.length ? `${calendarIntel.conflicts.length} over limit` : "No overlaps"}</small>
            <span className="timeline-load-track" aria-hidden="true"><i style={{ width: `${calendarIntel.loadScore}%` }} /></span>
          </div>
          <ChevronRight className="timeline-card-chevron" size={19} />
        </article>

        <article className={"timeline-status-card is-conflict " + (conflict ? "has-conflict" : "")}>
          <span className="timeline-status-icon">{conflict ? <CircleAlert size={20} /> : <Sparkles size={20} />}</span>
          <div>
            <span>Schedule conflict</span>
            <strong>{conflict ? conflict.first : "No conflict"}</strong>
            <small>{conflict ? `overlaps ${conflict.second}` : "Everything fits cleanly"}</small>
          </div>
          <ChevronRight className="timeline-card-chevron" size={19} />
        </article>
      </section>

      <section className="timeline-upcoming-panel">
        <div className="timeline-section-head">
          <div>
            <p className="nexus-kicker">UP NEXT</p>
            <h3>Your upcoming schedule</h3>
          </div>
          <button className="timeline-see-all" onClick={() => changeView("listWeek")}>
            See all <ChevronRight size={15} />
          </button>
        </div>
        {upcoming.length ? (
          <div className="timeline-upcoming-rail">
            {upcoming.map((item) => (
              <button
                key={String(item.event.id || item.index)}
                className="timeline-upcoming-item"
                onClick={() => jumpToUpcoming(item)}
              >
                <span>{eventDayLabel(item.date)}</span>
                <strong>{String(item.event.title || "Untitled event")}</strong>
                <small>{timeLabel(item.date)} – {timeLabel(item.endDate)}</small>
              </button>
            ))}
          </div>
        ) : (
          <div className="timeline-empty-upcoming">
            <Sparkles size={16} />
            <span>No upcoming events are loaded. Your timeline is clear.</span>
          </div>
        )}
      </section>

      <section className="timeline-calendar-shell">
        <div className="timeline-calendar-mobile-head">
          <strong>{compactDayLabel}</strong>
          <span>All day</span>
        </div>
        <div className="timeline-calendar-hint">
          <span>Tap an event to inspect it</span>
          <span>Tap a day in Month view to open that day</span>
        </div>
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
          scrollTime={scrollTime}
          slotDuration="00:30:00"
          slotLabelInterval="01:00"
          slotLabelFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
          dayHeaderFormat={{ weekday: "short", day: "numeric", month: "short" }}
          height={calendarHeight}
          eventClick={(info) => choose(info.event)}
          dateClick={(info) => {
            if (currentView === "dayGridMonth") {
              calendarRef.current?.getApi().changeView("timeGridDay", info.date);
            }
          }}
          datesSet={(info) => {
            setCurrentView(info.view.type);
            setRangeStart(info.start);
            setRangeLabel(formatRange(info.start, info.end, info.view.type));
          }}
          eventClassNames={(arg) => [
            "nexus-calendar-event",
            `calendar-category-${String(arg.event.extendedProps.category || "personal").toLowerCase().replaceAll("_", "-")}`,
          ]}
        />
      </section>

      {selected && (
        <div className="calendar-sheet-backdrop" onClick={() => setSelected(null)}>
          <section className="calendar-event-sheet timeline-event-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="calendar-sheet-handle" />
            <div className="calendar-sheet-head">
              <div>
                <p className="nexus-kicker">{editing ? "EDIT / RESCHEDULE" : "EVENT DETAILS"}</p>
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
                  <button className="calendar-primary" onClick={() => setEditing(true)}>Edit event</button>
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
