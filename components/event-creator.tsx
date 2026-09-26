"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarPlus, X } from "lucide-react";

function defaultLocal(minutesFromNow: number) {
  const d = new Date(Date.now() + minutesFromNow * 60_000);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function EventCreator({ onCreated }: { onCreated?: () => void }) {
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("PERSONAL");
  const [start, setStart] = useState(defaultLocal(60));
  const [end, setEnd] = useState(defaultLocal(120));
  const [description, setDescription] = useState("");
  const [preview, setPreview] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const action = params.get("action");
    if (action === "add" || action === "appointment") {
      setOpen(true);
      if (action === "appointment") setCategory("APPOINTMENT");
    }
  }, [params]);

  function close() {
    setOpen(false);
    setPreview(false);
    setStatus("");
  }

  async function create() {
    setStatus("Creating…");
    const res = await fetch("/api/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary,
        description: description || undefined,
        category,
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        confirmed: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setStatus(data.error || "Could not create event");
    close();
    onCreated?.();
    window.location.href = "/calendar";
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="nexus-create-event">
        <CalendarPlus size={17} /> Add event
      </button>

      {open && (
        <div className="calendar-sheet-backdrop" onClick={close}>
          <section className="calendar-event-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="calendar-sheet-handle" />
            <div className="calendar-sheet-head">
              <div>
                <p className="nexus-kicker">NEW CALENDAR SIGNAL</p>
                <h2>Create event</h2>
              </div>
              <button onClick={close} aria-label="Close event creator"><X size={18} /></button>
            </div>

            <div className="calendar-edit-grid">
              <label className="calendar-field calendar-field-wide">Title
                <input value={summary} onChange={(event) => { setSummary(event.target.value); setPreview(false); }} placeholder="What is happening?" />
              </label>
              <label className="calendar-field">Start
                <input type="datetime-local" value={start} onChange={(event) => { setStart(event.target.value); setPreview(false); }} />
              </label>
              <label className="calendar-field">End
                <input type="datetime-local" value={end} onChange={(event) => { setEnd(event.target.value); setPreview(false); }} />
              </label>
              <label className="calendar-field">Category
                <select value={category} onChange={(event) => { setCategory(event.target.value); setPreview(false); }}>
                  {["WORK","PROFESSIONAL_YEAR","WORKOUT","APPOINTMENT","PERSONAL","DEADLINE","REMINDER"].map((value) => <option key={value}>{value}</option>)}
                </select>
              </label>
              <label className="calendar-field calendar-field-wide">Notes
                <textarea value={description} onChange={(event) => { setDescription(event.target.value); setPreview(false); }} rows={3} placeholder="Optional context" />
              </label>
            </div>

            {preview && (
              <div className="calendar-confirm-panel">
                <span>CONFIRMATION PREVIEW</span>
                <p>{summary || "Untitled event"}</p>
                <p>{new Date(start).toLocaleString("en-AU")} → {new Date(end).toLocaleString("en-AU")}</p>
                <p>Category: {category}</p>
              </div>
            )}

            {status && <p className="calendar-status">{status}</p>}

            <div className="calendar-sheet-actions">
              <button onClick={close} className="calendar-secondary">Cancel</button>
              {!preview
                ? <button disabled={!summary || !start || !end} onClick={() => setPreview(true)} className="calendar-primary">Preview event</button>
                : <button onClick={create} className="calendar-primary">Confirm & create</button>}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
