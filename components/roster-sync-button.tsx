"use client";

import { useState } from "react";

export function RosterSyncButton() {
  const [status, setStatus] = useState("");

  return (
    <div className="flex items-center gap-2">
      {status && <span className="max-w-48 truncate text-xs text-slate-500">{status}</span>}
      <button
        onClick={async () => {
          if (!confirm("Read the latest MYOB roster email and reconcile only MYOB-managed work events in Google Calendar?")) return;
          setStatus("Syncing…");
          const res = await fetch("/api/roster/sync", { method: "POST" });
          const data = await res.json().catch(() => ({}));
          setStatus(res.ok ? `${data.created || 0} new, ${data.updated || 0} changed, ${data.removed || 0} removed` : data.error || "Sync failed");
        }}
        className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold"
      >
        Sync MYOB roster
      </button>
    </div>
  );
}
