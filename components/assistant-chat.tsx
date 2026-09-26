"use client";

import { useState } from "react";

type Message = { role: "user" | "assistant"; text: string };
type PendingAction = Record<string, unknown> & { type: string };

const QUICK_PROMPTS = [
  "What should I do now?",
  "What's important today?",
  "What can you do?",
  "Am I free tomorrow?",
];

export function AssistantChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Chief of Staff mode is active. I reason locally over your Gmail intelligence, Calendar, tasks and follow-ups. Write actions still require confirmation.",
    },
  ]);
  const [input, setInput] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(valueOverride?: string) {
    const value = (valueOverride ?? input).trim();
    if (!value || busy) return;

    const history = messages.slice(-10);
    setInput("");
    setMessages((current) => [...current, { role: "user", text: value }]);
    setBusy(true);

    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: value, history }),
    });

    const data = await res.json().catch(() => ({}));
    setMessages((current) => [
      ...current,
      { role: "assistant", text: data.message || data.error || "Something went wrong." },
    ]);
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
    setMessages((current) => [
      ...current,
      { role: "assistant", text: data.message || data.error || "The action failed." },
    ]);
    setPendingAction(null);
    setBusy(false);
  }

  return (
    <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-xs font-semibold text-emerald-700">LOCAL INTELLIGENCE · NO EXTERNAL AI API</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${message.role === "user" ? "ml-auto bg-slate-900 text-white" : "bg-slate-100 text-slate-800"}`}
          >
            {message.text}
          </div>
        ))}

        {busy && <div className="w-fit rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500">Thinking through your secretary data…</div>}

        {pendingAction && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Confirmation required</p>
            <p className="mt-1 text-sm text-amber-950">This will change stored data or Google Calendar.</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setPendingAction(null)} className="flex-1 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-semibold">Cancel</button>
              <button onClick={confirmAction} className="flex-1 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white">Confirm action</button>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 p-3">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              disabled={busy}
              onClick={() => void send(prompt)}
              className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            placeholder="Ask about priorities, Gmail, deadlines, schedule or follow-ups…"
            rows={2}
            className="min-h-14 flex-1 resize-none rounded-2xl border border-slate-300 px-3 py-3 outline-none focus:border-slate-900"
          />
          <button onClick={() => void send()} disabled={busy} className="rounded-2xl bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50">Send</button>
        </div>
      </div>
    </div>
  );
}
