import Link from "next/link";
import { Activity, BellRing, Bot, BrainCircuit, DatabaseZap, Info, PlugZap, Settings2, SlidersHorizontal, ChevronRight } from "lucide-react";
import { APP_VERSION } from "@/lib/release";

const settings = [
  { href: "/today", title: "Today & Action Inbox", description: "One priority queue across approvals, tasks, email, follow-ups and reminders.", Icon: SlidersHorizontal },
  { href: "/core", title: "Autonomous Core", description: "Review Zoro observations, proposed actions, approvals and execution history.", Icon: BrainCircuit },
  { href: "/settings/assistant", title: "Zoro preferences", description: "Voice, wake word, assistant and local model preferences.", Icon: Bot },
  { href: "/notifications", title: "Notifications & alerts", description: "Push notifications, alert categories, quiet hours and watches.", Icon: BellRing },
  { href: "/connections", title: "Connections", description: "Manage Google, Gmail, Calendar and connected data.", Icon: PlugZap },
  { href: "/intelligence", title: "Data Hub", description: "Weather, exchange rates and local intelligence sources.", Icon: DatabaseZap },
  { href: "/settings/system", title: "System Health", description: "Database, authentication, Google, push and deployment health.", Icon: Activity },
  { href: "/about", title: "About & release", description: "Capabilities, release notes and build information.", Icon: Info },
];

export default function SettingsPage() {
  return <div className="professional-page">
    <header className="professional-page-header">
      <div>
        <p className="professional-kicker">ZORO NEXUS</p>
        <h1>Settings</h1>
        <p>Manage Zoro, integrations, notifications and system preferences.</p>
      </div>
      <span className="professional-version">v{APP_VERSION}</span>
    </header>

    <section className="professional-settings-list">
      {settings.map(({ href, title, description, Icon }) => (
        <Link key={href} href={href} className="professional-settings-row">
          <span className="professional-settings-icon"><Icon size={20}/></span>
          <div>
            <strong>{title}</strong>
            <p>{description}</p>
          </div>
          <ChevronRight size={18}/>
        </Link>
      ))}
    </section>

    <section className="professional-card professional-release-card">
      <Settings2 size={19}/>
      <div>
        <strong>Current release</strong>
        <p>Zoro Nexus v{APP_VERSION}. Build information and release notes are available in About.</p>
      </div>
    </section>
  </div>;
}
