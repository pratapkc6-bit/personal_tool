"use client";

import Link from "next/link";
import { CalendarPlus, ClipboardPlus, MailPlus, RefreshCw, ScanSearch } from "lucide-react";

const actions = [
  { label: "Add Event", href: "/calendar?action=add", icon: CalendarPlus },
  { label: "Add Task", href: "/tasks?action=add", icon: ClipboardPlus },
  { label: "Compose Email", href: "/inbox/compose", icon: MailPlus },
  { label: "Add Appointment", href: "/calendar?action=appointment", icon: CalendarPlus },
  { label: "Scan Gmail", href: "/inbox?scan=1", icon: ScanSearch },
  { label: "Refresh Calendar", href: "/calendar?refresh=1", icon: RefreshCw },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {actions.map(({ label, href, icon: Icon }) => (
        <Link key={label} href={href} className="flex min-h-14 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50">
          <Icon size={18} />
          {label}
        </Link>
      ))}
    </div>
  );
}
