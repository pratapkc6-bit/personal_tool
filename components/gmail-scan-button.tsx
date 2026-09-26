"use client";

import { useEffect, useRef, useState } from "react";

export function GmailScanButton({ autoStart = false }: { autoStart?: boolean }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  async function runScan(fromShortcut = false) {
    if (busy) return;
    setBusy(true);
    setStatus("Scanning…");
    const res = await fetch("/api/gmail/scan", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || "Scan failed");
      setBusy(false);
      return;
    }

    setStatus(`${data.processed ?? 0} new, ${data.actionItems?.length ?? 0} action`);
    if (fromShortcut) window.location.replace("/inbox");
    else window.location.reload();
  }

  useEffect(() => {
    if (!autoStart || started.current) return;
    started.current = true;
    void runScan(true);
  }, [autoStart]);

  return (
    <div className="flex items-center gap-2">
      {status && <span className="max-w-72 text-xs text-slate-500">{status}</span>}
      <button
        disabled={busy}
        className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        onClick={() => void runScan(false)}
      >
        {busy ? "Scanning…" : "Scan Gmail"}
      </button>
    </div>
  );
}
