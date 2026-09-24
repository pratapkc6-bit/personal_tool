"use client";

import { useState } from "react";

type Message = { role: "user" | "assistant"; text: string };
type PendingAction = Record<string, unknown> & { type: string };

export function AssistantChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "I can check Gmail, summarize what needs attention, prepare calendar/task actions, and execute them after confirmation." },
  ]);
  const [input, setInput] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    const value = input.trim();
    if (!value || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: value }]);
    setBusy(true);
    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: value }),
    });
    const data = await res.json().catch(() => ({}));
    setMessages((m) => [...m, { role: "assistant", text: data.message || data.error || "Something went wrong." }]);
    setPendingAction(data.pendingAction || null);
    setBusy(false);
  }

  async function confirmAction() {
    if (!pendingAction || busy) return;
    setBusy(true);
    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmedAction: pendingAction }),
    });
    const data = await res.json().catch(() => ({}));
    setMessages((m) => [...m, { role: "assistant", text: data.message || data.error || "The action failed." }]);
    setPendingAction(null);
    setBusy(false);
  }

  return (
    <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div key={index} className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${message.role === "user" ? "ml-auto bg-slate-900 text-white" : "bg-slate-100 text-slate-800"}`}>
            {message.text}
          </div>
        ))}
        {busy && <div className="w-fit rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500">Working…</div>}
        {pendingAction && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Confirmation required</p>
            <p className="mt-1 text-sm text-amber-950">This will change your stored data or Google Calendar.</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setPendingAction(null)} className="flex-1 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-semibold">Cancel</button>
              <button onClick={confirmAction} className="flex-1 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white">Confirm action</button>
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-slate-200 p-3">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="What's new? Check my emails. Add workout Saturday at 7…"
            rows={2}
            className="min-h-14 flex-1 resize-none rounded-2xl border border-slate-300 px-3 py-3 outline-none focus:border-slate-900"
          />
          <button onClick={send} disabled={busy} className="rounded-2xl bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50">Send</button>
        </div>
      </div>
    </div>
  );
}
