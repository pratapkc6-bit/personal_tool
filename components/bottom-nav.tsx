"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Inbox, ListTodo, Sparkles } from "lucide-react";

const items = [
  { href: "/", label: "For you", icon: Home },
  { href: "/calendar", label: "Timeline", icon: CalendarDays },
  { href: "/inbox", label: "Intel", icon: Inbox },
  { href: "/tasks", label: "Missions", icon: ListTodo },
  { href: "/assistant", label: "Zoro AI", icon: Sparkles },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur sm:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] ${active ? "bg-slate-900 text-white" : "text-slate-600"}`}
            >
              <Icon size={19} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

