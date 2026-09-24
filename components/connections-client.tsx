"use client";

import { signIn, signOut } from "next-auth/react";
import { useState } from "react";

export function ConnectionsClient({ connected, scopes }: { connected: boolean; scopes: string[] }) {
  const [busy, setBusy] = useState(false);

  async function disconnect() {
    if (!confirm("Disconnect Google from Pratap Personal Secretary? Gmail and Calendar actions will stop until you reconnect.")) return;
    setBusy(true);
    await fetch("/api/connections/google", { method: "DELETE" });
    await signOut({ callbackUrl: "/connections" });
  }

  if (!connected) {
    return (
      <button onClick={() => signIn("google", { callbackUrl: "/connections" })} className="rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white">
        Connect Google
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Status label="Gmail" active={scopes.some((s) => s.includes("gmail"))} />
        <Status label="Google Calendar" active={scopes.some((s) => s.includes("calendar"))} />
      </div>
      <button disabled={busy} onClick={disconnect} className="rounded-xl border border-red-300 px-4 py-3 font-semibold text-red-700 disabled:opacity-50">
        {busy ? "Disconnecting…" : "Disconnect Google"}
      </button>
    </div>
  );
}

function Status({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex min-h-16 items-center justify-between rounded-2xl border border-slate-200 bg-white px-4">
      <span className="font-semibold">{label}</span>
      <span className={`rounded-full px-2 py-1 text-xs font-bold ${active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
        {active ? "Connected" : "Not granted"}
      </span>
    </div>
  );
}
