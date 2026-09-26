"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function SmartRefresh({
  lastScanAt,
  thresholdMinutes = 30,
}: {
  lastScanAt: string | null;
  thresholdMinutes?: number;
}) {
  const router = useRouter();
  const started = useRef(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (started.current) return;
    const last = lastScanAt ? new Date(lastScanAt).getTime() : 0;
    const stale = !last || Date.now() - last > thresholdMinutes * 60_000;
    if (!stale) return;

    started.current = true;
    setStatus("Refreshing Gmail intelligence…");

    fetch("/api/gmail/scan", { method: "POST" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Background refresh failed");
        setStatus(`Gmail refreshed: ${data.processed ?? 0} new`);
        router.refresh();
      })
      .catch((error: unknown) => {
        setStatus(error instanceof Error ? error.message : "Background refresh failed");
      });
  }, [lastScanAt, router, thresholdMinutes]);

  if (!status) return null;
  return <p className="text-xs text-slate-500">{status}</p>;
}
