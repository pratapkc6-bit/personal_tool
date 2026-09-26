"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Inbox, ListTodo, Sparkles } from "lucide-react";

const items = [
  { href: "/", label: "Command", icon: Home },
  { href: "/calendar", label: "Timeline", icon: CalendarDays },
  { href: "/assistant", label: "Zoro", icon: Sparkles },
  { href: "/inbox", label: "Intel", icon: Inbox },
  { href: "/tasks", label: "Missions", icon: ListTodo },
];

export function BottomNav() {
  const path = usePathname();

  return (
    <nav className="nexus-mobile-dock sm:hidden" aria-label="Primary mobile navigation">
      <div className="nexus-mobile-dock-inner">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="nexus-mobile-dock-link"
              aria-current={active ? "page" : undefined}
            >
              <span className="nexus-mobile-icon"><Icon size={19} /></span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
