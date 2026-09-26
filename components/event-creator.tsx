"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

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
      <button onClick={() => setOpen(true)} className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white">+ Add Event</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/35 p-3 sm:items-center sm:justify-center" onClick={close}>
          <div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Calendar change</p>
            <h2 className="mt-1 text-xl font-bold">Create event</h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold sm:col-span-2">Title
                <input value={summary} onChange={(e) => { setSummary(e.target.value); setPreview(false); }} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal" />
              </label>
              <label className="text-sm font-semibold">Start
                <input type="datetime-local" value={start} onChange={(e) => { setStart(e.target.value); setPreview(false); }} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal" />
              </label>
              <label className="text-sm font-semibold">End
                <input type="datetime-local" value={end} onChange={(e) => { setEnd(e.target.value); setPreview(false); }} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal" />
              </label>
              <label className="text-sm font-semibold">Category
                <select value={category} onChange={(e) => { setCategory(e.target.value); setPreview(false); }} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal">
                  {["WORK","PROFESSIONAL_YEAR","WORKOUT","APPOINTMENT","PERSONAL","DEADLINE","REMINDER"].map((value) => <option key={value}>{value}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold sm:col-span-2">Notes
                <textarea value={description} onChange={(e) => { setDescription(e.target.value); setPreview(false); }} rows={3} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal" />
              </label>
            </div>

            {preview && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
                <p className="font-bold text-amber-900">Confirmation preview</p>
                <p className="mt-1">{summary || "Untitled event"}</p>
                <p>{new Date(start).toLocaleString("en-AU")} → {new Date(end).toLocaleString("en-AU")}</p>
                <p>Category: {category}</p>
              </div>
            )}

            {status && <p className="mt-3 text-sm text-slate-600">{status}</p>}

            <div className="mt-5 flex gap-2">
              <button onClick={close} className="flex-1 rounded-xl border border-slate-300 px-4 py-2 font-semibold">Cancel</button>
              {!preview ? (
                <button disabled={!summary || !start || !end} onClick={() => setPreview(true)} className="flex-1 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-40">Preview</button>
              ) : (
                <button onClick={create} className="flex-1 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white">Confirm & create</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
