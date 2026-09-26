"use client";

import Link from "next/link";
import { Mic2, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

export function ZoroLauncher() {
  const pathname = usePathname();
  if (pathname === "/assistant") return null;

  return (
    <Link
      href="/assistant"
      aria-label="Open Zoro voice assistant"
      className="nexus-zoro-launcher"
    >
      <span className="nexus-zoro-orb">
        <span className="nexus-zoro-ring" />
        <Sparkles size={18} />
      </span>
      <span className="nexus-zoro-copy">
        <strong>Ask Zoro</strong>
        <small>Voice + intelligence</small>
      </span>
      <Mic2 size={17} />
    </Link>
  );
}
