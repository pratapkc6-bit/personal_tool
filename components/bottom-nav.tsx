"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, Grid2X2, Home } from "lucide-react";

const sideItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/calendar", label: "Timeline", icon: CalendarDays },
  { href: "/intelligence", label: "Intel", icon: BarChart3 },
  { href: "/settings", label: "More", icon: Grid2X2 },
];

export function BottomNav() {
  const path=usePathname();
  return <nav className="nexus-mobile-dock zoro-reference-dock sm:hidden" aria-label="Primary mobile navigation">
    <div className="nexus-mobile-dock-inner">
      {sideItems.slice(0,2).map(({href,label,icon:Icon})=><Link key={href} href={href} className="nexus-mobile-dock-link" aria-current={(href==="/"?path==="/":path.startsWith(href))?"page":undefined}><span className="nexus-mobile-icon"><Icon size={21}/></span><span>{label}</span></Link>)}
      <Link href="/assistant" className="zoro-dock-core" aria-label="Talk to Zoro"><img src="/assets/zoro-oni-core.svg" alt="" /></Link>
      {sideItems.slice(2).map(({href,label,icon:Icon})=><Link key={href} href={href} className="nexus-mobile-dock-link" aria-current={path.startsWith(href)?"page":undefined}><span className="nexus-mobile-icon"><Icon size={21}/></span><span>{label}</span></Link>)}
    </div>
  </nav>;
}
