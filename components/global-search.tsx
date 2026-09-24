"use client";

import { FormEvent, useState } from "react";

type Results = {
  emails: Array<{ id: string; subject: string | null; sender: string | null; classification: string }>;
  tasks: Array<{ id: string; title: string; status: string }>;
  followups: Array<{ id: string; subject: string; personCompany: string | null }>;
  events: Array<{ id: string; title: string | null; start: string | null }>;
};

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [busy, setBusy] = useState(false);

  async function search(e: FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    setResults(res.ok ? await res.json() : { emails: [], tasks: [], followups: [], events: [] });
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={search} className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder='Try "Andrew email", "my roster", "October appointments"' className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-3" />
        <button className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white">{busy ? "…" : "Search"}</button>
      </form>

      {results && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Group title="Emails" rows={results.emails.map((x) => ({ id: x.id, title: x.subject || "(no subject)", sub: x.sender || x.classification }))} />
          <Group title="Tasks" rows={results.tasks.map((x) => ({ id: x.id, title: x.title, sub: x.status }))} />
          <Group title="Follow-ups" rows={results.followups.map((x) => ({ id: x.id, title: x.subject, sub: x.personCompany || "Waiting" }))} />
          <Group title="Calendar" rows={results.events.map((x) => ({ id: x.id, title: x.title || "Untitled event", sub: x.start ? new Date(x.start).toLocaleString("en-AU") : "" }))} />
        </div>
      )}
    </div>
  );
}

function Group({ title, rows }: { title: string; rows: Array<{ id: string; title: string; sub: string }> }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <h2 className="font-bold">{title}</h2>
      <div className="mt-2 space-y-2">
        {rows.length === 0 ? <p className="text-sm text-slate-500">No matches.</p> : rows.map((row) => (
          <div key={row.id} className="rounded-xl bg-slate-50 p-3">
            <p className="font-medium">{row.title}</p>
            <p className="mt-1 text-sm text-slate-500">{row.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
