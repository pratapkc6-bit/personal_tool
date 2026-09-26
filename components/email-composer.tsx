"use client";

import { useState } from "react";

export function EmailComposer() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  async function saveDraft() {
    setStatus("Saving draft…");
    const res = await fetch("/api/gmail/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, message }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setStatus(data.error || "Could not save draft");
    setDraftId(data.draftId);
    setStatus("Draft saved in Gmail. Nothing has been sent.");
  }

  async function sendDraft() {
    if (!draftId) return;
    if (!confirm(`Send this email to ${to}? This will send it immediately from Gmail.`)) return;
    setStatus("Sending…");
    const res = await fetch("/api/gmail/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftId, confirmed: true }),
    });
    const data = await res.json().catch(() => ({}));
    setStatus(res.ok ? "Email sent." : data.error || "Send failed");
  }

  return (
    <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-card sm:p-6">
      <label className="block text-sm font-semibold">To
        <input type="email" value={to} onChange={(e) => { setTo(e.target.value); setDraftId(null); }} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal" placeholder="name@example.com" />
      </label>
      <label className="block text-sm font-semibold">Subject
        <input value={subject} onChange={(e) => { setSubject(e.target.value); setDraftId(null); }} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal" />
      </label>
      <label className="block text-sm font-semibold">Message
        <textarea value={message} onChange={(e) => { setMessage(e.target.value); setDraftId(null); }} rows={12} className="mt-1 w-full resize-y rounded-xl border border-slate-300 px-3 py-3 font-normal" />
      </label>
      {status && <p className="text-sm text-slate-600">{status}</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button onClick={saveDraft} className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-semibold">Save draft</button>
        <button disabled={!draftId} onClick={sendDraft} className="flex-1 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Send</button>
      </div>
    </div>
  );
}
