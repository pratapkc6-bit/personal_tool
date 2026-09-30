import Link from "next/link";
import { Activity, BellRing, Bot, BrainCircuit, DatabaseZap, Info, PlugZap, Settings2, SlidersHorizontal } from "lucide-react";
import { APP_VERSION } from "@/lib/release";
import { ImmersiveSectionArt } from "@/components/immersive-section-art";

const settings = [
  { href: "/today", title: "Today & Action Inbox", description: "One priority queue across approvals, tasks, email, follow-ups and reminders.", Icon: SlidersHorizontal },
  { href: "/core", title: "Autonomous Core", description: "Review Zoro observations, proposed actions, approvals and execution history.", Icon: BrainCircuit },
  { href: "/settings/assistant", title: "Zoro preferences", description: "Voice, wake word, assistant and local model preferences.", Icon: Bot },
  { href: "/notifications", title: "Notifications & alerts", description: "Push notifications, alert categories, quiet hours and watches.", Icon: BellRing },
  { href: "/connections", title: "Connections", description: "Manage Google, Gmail, Calendar and connected data.", Icon: PlugZap },
  { href: "/intelligence", title: "Data Hub", description: "Darwin weather, AUD reference rates and local intelligence sources.", Icon: DatabaseZap },
  { href: "/settings/system", title: "System Health", description: "Check database, authentication, Google, push, scheduler and deployment health.", Icon: Activity },
  { href: "/about", title: "About & release", description: "About Zoro Nexus, capabilities, latest release notes and build information.", Icon: Info },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-10 immersive-page immersive-page-settings">
      <ImmersiveSectionArt src="/assets/zoro-settings-approved.png" alt="Zoro Settings Dark Realm" kind="settings" hotspots={[
        {href:"/search",label:"Search",className:"hs-top-search"},
        {href:"/settings/assistant",label:"Voice",className:"hs-settings-voice"},
        {href:"/notifications",label:"Notifications",className:"hs-settings-notifications"},
        {href:"/connections",label:"Connections",className:"hs-settings-connections"},
        {href:"/reminders",label:"Reminders",className:"hs-settings-reminders"},
        {href:"/calendar",label:"Calendar",className:"hs-settings-calendar"},
        {href:"/about",label:"About",className:"hs-settings-about"},
        {href:"/settings/system",label:"System",className:"hs-settings-system"},
        {href:"/",label:"Home",className:"hs-nav-home"},
        {href:"/calendar",label:"Timeline",className:"hs-nav-timeline"},
        {href:"/assistant",label:"Zoro",className:"hs-nav-zoro"},
        {href:"/intelligence",label:"Intel",className:"hs-nav-intel"},
        {href:"/settings",label:"More",className:"hs-nav-more"},
      ]}/>
      <div className="immersive-live-layer">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-700">Zoro Nexus</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight">Settings</h1>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">v{APP_VERSION}</span>
        </div>
        <p className="mt-2 text-sm text-slate-600">Control Zoro, notifications, connections and app information from one place.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        {settings.map(({ href, title, description, Icon }) => (
          <Link key={href} href={href} className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5">
            <div className="flex items-start gap-4">
              <span className="rounded-2xl bg-slate-100 p-3"><Icon size={22} /></span>
              <div>
                <h2 className="font-bold text-slate-900">{title}</h2>
                <p className="mt-1 text-sm leading-5 text-slate-600">{description}</p>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-cyan-700">Open →</p>
              </div>
            </div>
          </Link>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex items-center gap-3">
          <Settings2 size={20} />
          <div>
            <h2 className="font-bold">Current release</h2>
            <p className="text-sm text-slate-600">Zoro Nexus v{APP_VERSION}. Release details and build identity are available in About & release.</p>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}
