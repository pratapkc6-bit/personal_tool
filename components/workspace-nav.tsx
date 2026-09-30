"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  DatabaseZap,
  BellRing,
  AlarmClock,
  CalendarDays,
  Inbox,
  LayoutDashboard,
  ListTodo,
  PlugZap,
  Search,
  Settings2,
  Sparkles,
} from "lucide-react";

const routes = [
  { href: "/", label: "Command", hint: "Daily intelligence", Icon: LayoutDashboard },
  { href: "/assistant", label: "Zoro AI", hint: "Reason & act", Icon: Sparkles },
  { href: "/tasks", label: "Missions", hint: "Outcomes & steps", Icon: ListTodo },
  { href: "/calendar", label: "Timeline", hint: "Time & commitments", Icon: CalendarDays },
  { href: "/inbox", label: "Intel", hint: "Gmail intelligence", Icon: Inbox },
  { href: "/search", label: "Search", hint: "Find anything", Icon: Search },
  { href: "/intelligence", label: "Data Hub", hint: "Weather, rates & local data", Icon: DatabaseZap },
  { href: "/activity", label: "Activity", hint: "System history", Icon: Activity },
  { href: "/reminders", label: "Reminders", hint: "Set, snooze & complete", Icon: AlarmClock },
  { href: "/notifications", label: "Alerts", hint: "Push, reminders & watches", Icon: BellRing },
  { href: "/connections", label: "Connections", hint: "Google & data", Icon: PlugZap },
  { href: "/settings", label: "Settings", hint: "Preferences & about", Icon: Settings2 },
];

export function WorkspaceNav() {
  const path = usePathname();

  return (
    <nav className="nexus-nav" aria-label="Workspace">
      {routes.map(({ href, label, hint, Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="nexus-nav-link"
            aria-current={active ? "page" : undefined}
          >
            <span className="nexus-nav-icon"><Icon size={18} /></span>
            <span className="nexus-nav-copy">
              <strong>{label}</strong>
              <small>{hint}</small>
            </span>
            <span className="nexus-nav-active-dot" />
          </Link>
        );
      })}
    </nav>
  );
}
