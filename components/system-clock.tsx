"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

export function SystemClock() {
  const [now, setNow] = useState<Date | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const updateNetwork = () => setOnline(navigator.onLine);
    tick();
    updateNetwork();
    const timer = window.setInterval(tick, 30_000);
    window.addEventListener("online", updateNetwork);
    window.addEventListener("offline", updateNetwork);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", updateNetwork);
      window.removeEventListener("offline", updateNetwork);
    };
  }, []);

  return (
    <div className="nexus-system-clock" aria-label="System status">
      <span className={`nexus-live-dot ${online ? "" : "is-offline"}`} />
      <div>
        <strong>{online ? "SYSTEM ONLINE" : "OFFLINE MODE"}</strong>
        <small>
          {now
            ? now.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })
            : "…"}
        </small>
      </div>
      {online ? <Wifi size={15} /> : <WifiOff size={15} />}
    </div>
  );
}
