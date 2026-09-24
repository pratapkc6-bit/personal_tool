"use client";

import { useState } from "react";

export function GmailScanButton() {
  const [status, setStatus] = useState("");

  return (
    <div className="flex items-center gap-2">
      {status && <span className="text-xs text-slate-500">{status}</span>}
      <button
        className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
        onClick={async () => {
          setStatus("Scanning…");
          const res = await fetch("/api/gmail/scan", { method: "POST" });
          const data = await res.json().catch(() => ({}));
          setStatus(res.ok ? `${data.processed ?? 0} new` : data.error || "Scan failed");
          if (res.ok) window.location.reload();
        }}
      >
        Scan Gmail
      </button>
    </div>
  );
}
