"use client";

import Link from "next/link";
import { Mic } from "lucide-react";
import { usePathname } from "next/navigation";

export function ZoroLauncher() {
  const pathname = usePathname();
  if (pathname === "/assistant") return null;

  return (
    <Link
      href="/assistant"
      aria-label="Open Zoro voice assistant"
      className="fixed bottom-24 right-4 z-40 inline-flex min-h-12 items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-xl sm:bottom-6 sm:right-6"
    >
      <Mic size={18} />
      Zoro
    </Link>
  );
}
