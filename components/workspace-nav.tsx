"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, CalendarDays, Inbox, LayoutDashboard, ListTodo, Settings2, Sparkles, Search, PlugZap } from "lucide-react";

const routes = [{ href: "/", label: "For you", Icon: LayoutDashboard }, { href: "/assistant", label: "Zoro AI", Icon: Sparkles }, { href: "/tasks", label: "Missions", Icon: ListTodo }, { href: "/calendar", label: "Timeline", Icon: CalendarDays }, { href: "/inbox", label: "Intelligence", Icon: Inbox }, { href: "/search", label: "Search", Icon: Search }, { href: "/activity", label: "Activity", Icon: Activity }, { href: "/connections", label: "Setup", Icon: PlugZap }, { href: "/settings/assistant", label: "Preferences", Icon: Settings2 }];
export function WorkspaceNav() {
  const path = usePathname();
  return <nav className="hub-navigation" aria-label="Workspace">{routes.map(({ href, label, Icon }) => <Link key={href} href={href} aria-current={(href === "/" ? path === "/" : path.startsWith(href)) ? "page" : undefined}><Icon size={16} />{label}</Link>)}</nav>;
}
