import Link from "next/link";
import { deploymentMetadata, PRODUCTION_URL } from "@/lib/release";

export const dynamic = "force-dynamic";

const capabilities = [
  ["Command Center", "Ranks what needs attention across your day instead of making you hunt through separate apps."],
  ["Zoro Assistant", "Turns natural-language requests into plans and confirmation-gated actions for tasks, email and calendar."],
  ["Gmail Intelligence", "Surfaces action-required messages, deadlines, follow-ups and important communication."],
  ["Calendar & Time", "Shows commitments, detects conflicts and supports focus planning around real calendar events."],
  ["Missions & Follow-ups", "Tracks tasks, next actions, waiting items and overdue work."],
  ["Alerts & Reminders", "Supports personal reminders, priority alerts, NT holidays, Nepali calendar events and weather watches."],
  ["Voice & PWA", "Designed for mobile use with voice controls, Home Screen installation and notification infrastructure."],
  ["Dark Realm", "A cold Himalayan/Newari-inspired alternate interface for people who apparently found normal dark mode insufficient."],
];

const releaseHighlights = [
  "Zoro Nexus 6.0 Command OS: 100 concrete upgrades across Smart Capture, commands, universal search, diagnostics, PWA, Home, AI and accessibility.",
  "Natural-language Smart Capture now understands dates, reminders, recurrence, priority and categories before you save.",
  "Global Search now spans seven Zoro data groups, while System Health verifies Core storage and Intelligence Gateway capabilities.",
  "See docs/ZORO_V6_100_UPGRADES.md for the exact 100-change release manifest.",
  "Zoro Now: Home now surfaces one decisive next action plus the next calendar event and its timing.",
  "Smart Capture: the global + button can now create either a task or a one-time/daily reminder from the same dialog.",
  "Home simplified: removed the focus-session planner and the 25-minute focus timer that were cluttering the Command Center.",
  "Priority, calendar, messages and timeline remain unchanged; only the two unused Home sections were removed.",
  "Zoro Intelligence Gateway: new air-quality, location-resolution and optional Google Places integrations behind one provider layer.",
  "Data Hub now shows AQI, PM2.5, PM10 and UV alongside weather, exchange rates and source capability health.",
  "New authenticated location and place-search endpoints plus an in-app Location Intelligence search.",
  "Zoro AI chat now fully matches the House Five bright theme with ivory conversation surfaces, burgundy user messages and readable dark text.",
  "Voice controls, quick prompts, composer, action confirmations and assistant context panels were restyled without changing chat behavior.",
  "Bright-theme contrast fix: Timeline and Data Hub now use readable dark text on ivory surfaces instead of leftover dark-theme colours.",
  "Calendar command deck, summary cards, FullCalendar grid, event sheet and weather/data values were corrected for House Five bright mode.",
  "House Five Bright UI: warm ivory default theme, burgundy brand accents, premium paper-like cards and softer Nepali-inspired detailing.",
  "Bright mode now loads by default for users without a saved preference, while an explicitly saved dark preference remains respected.",
  "Mobile navigation, forms, calendar, Today, Intel, Settings and shared controls now follow the same House Five bright visual language.",
  "Zoro Nexus 5.0: complete professional UI redesign with image-heavy fantasy surfaces removed from the active product experience.",
  "Home, Today, Timeline, Intel, Intelligence and Settings now share one clean graphite/navy design system with restrained blue accents.",
  "Mobile navigation, cards, forms, calendar controls and voice prompts were rebuilt for consistency, readability and professional use.",
  "Zoro Intelligence and Intel are now both full immersive Dark Realm sections using the approved Intel artwork.",
  "Zoro Intelligence / Data Hub now carries the same illustrated shell, live inline search, source cards and interactive controls as the rest of the app.",
  "Intel artwork navigation now exposes Inbox, Insights, Actions, Watch and Archive hotspots directly from the image.",
  "Immersive section redesign: Timeline, Intel, Today and Settings now use their approved generated artwork as the primary visual shell.",
  "Each illustrated section now has live inline search, interactive hotspots and live data panels styled from the same artwork instead of generic cards.",
  "Approved section images are committed under public/assets and preserved as the visual source for the coded UI.",
  "Immersive section redesign: Timeline, Intel, Today and Settings now use their approved generated Dark Realm artwork as the actual visual shell.",
  "Real hotspots sit over the illustrated controls while live calendar, inbox, briefing and settings data continue underneath in the same red/cyan lighting system.",
  "Approved section artwork is archived in Google Drive under Zoro Nexus / Design Assets / Demonic UI v2 and committed into the app assets.",
  "Unified Dark Realm Theme: Today, Timeline, Intel, Tasks, Settings, Notifications, Calendar, Reminders, About and dialogs now inherit the same black/red/ice-cyan lighting as the approved Home artwork.",
  "Shared panel, input, button, navigation and calendar styling replaces mismatched page-by-page colors.",
  "Compact Zoro voice permission chip replaces the intrusive full-width Enable banner on Home.",
  "Voice prompt can now be dismissed permanently on the device while voice remains available from Settings.",
  "Immersive Home interactions: the approved artwork now contains a real inline search field instead of redirecting to Search.",
  "Home search queries Gmail intelligence, missions, follow-ups and Calendar in-place with Dark Realm result panels.",
  "Artwork hotspots now provide active feedback while preserving the exact approved visual composition.",
  "Exact Approved Art Home: the Google Drive-approved demonic reference now renders directly as the mobile Home visual surface.",
  "Real accessible tap zones sit over Search, Notifications, Settings, Zoro, Missions, Timeline, Intel, Today and the bottom navigation.",
  "Home removes duplicate app chrome on mobile so the approved artwork is no longer diluted by a second header or dock.",
  "Approved Demonic Fidelity pass: rebuilt the mobile home to match the approved dense fantasy composition instead of the simplified geometric version.",
  "Detailed demon core, layered warrior/dragon/spirit scenery, ornamental ritual portals and stronger black/red mobile chrome.",
  "Demonic Ritual UI: approved pattern-first home with a central Oni/Zoro core instead of oversized headline typography.",
  "New ritual portal navigation, demonic frame vectors, Oni identity in the mobile header and central bottom dock.",
  "Approved concept and source art archived in Google Drive under Zoro Nexus / Design Assets / Demonic UI v1.",
  "Zoro OS 4.0: unified Today Action Inbox across approvals, tasks, actionable email, follow-ups and reminders.",
  "Personal Context Graph foundation for durable structured context instead of isolated records.",
  "Tool Registry and autonomy policy levels establish one controlled action architecture across Zoro.",
  "Autonomous Core 3.0: persistent observation ledger, action proposals, human approval policy and audited execution.",
  "Core Control workspace for reviewing and approving Zoro actions before execution.",
  "Initial safe executor allowlist supports task and reminder creation while consequential integrations remain approval-gated.",
  "Cinematic mobile Command home inspired by the Himalayan Dark Realm reference, with red/cyan neon hierarchy.",
  "Rebuilt five-slot mobile dock with a large central Zoro action button and direct More/Settings access.",
  "Visual Mission Control, Intelligence Feed, Timeline and System Setup command cards.",
  "Zoro Data Hub: normalized external intelligence API with source health and attribution.",
  "Darwin weather intelligence through Open-Meteo plus AUD reference rates through Frankfurter.",
  "New Data Hub workspace and authenticated /api/data-hub endpoint for future Zoro tools.",
  "Zoro Core System Health dashboard for database, authentication, Google, push, scheduler and deployment checks.",
  "Zoro notification and alert engine with Normal, Important and Critical priorities.",
  "Reminder Center with snooze, completion and a three-second foreground alarm.",
  "Darwin/NT public-holiday intelligence and Nepali calendar special-day alerts.",
  "Important Gmail, task deadline, follow-up, calendar and Darwin weather watchers.",
  "Notification history, per-category controls, quiet hours and Web Push infrastructure.",
  "House Five Dark Realm visual system with Himalayan environment, snowfall and Newari guardian artwork.",
  "Zoro Nexus Home Screen icon and improved installable PWA metadata.",
  "Core security hardening including safer Google account linking and stronger response headers.",
];

export default function AboutPage() {
  const meta = deploymentMetadata();
  const shortCommit = meta.commit === "unavailable" ? meta.commit : meta.commit.slice(0, 12);

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <img src="/zoro-nexus-icon.png" alt="Zoro Nexus" className="h-24 w-24 rounded-[26px] shadow-lg" />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-700">About Zoro Nexus</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">Your personal operating system.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Zoro Nexus is a private personal secretary built to observe your connected information, identify what matters,
              help you decide what to do next, carry out approved actions and keep track of the follow-up.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-slate-100 px-3 py-1.5">v{meta.version}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5">{meta.environment}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5">Australia/Darwin</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">How it works</p>
          <h2 className="mt-1 text-xl font-bold">Observe → Understand → Prioritise → Act → Record → Follow up</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Gmail, Google Calendar, tasks, reminders and local intelligence feed one command system. Sensitive write actions
            are designed to require confirmation, while the activity trail records what Zoro has done.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Product principles</p>
          <div className="mt-3 space-y-3 text-sm text-slate-600">
            <p><strong className="text-slate-900">Private by design.</strong> Your connected data is used to run your secretary workflows.</p>
            <p><strong className="text-slate-900">Human in control.</strong> Important external actions stay confirmation-gated.</p>
            <p><strong className="text-slate-900">Useful before flashy.</strong> The goal is fewer things forgotten, not another dashboard to babysit.</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Capabilities</p>
        <h2 className="mt-1 text-xl font-bold">One secretary, connected systems</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {capabilities.map(([title, description]) => (
            <div key={title} className="rounded-2xl bg-slate-50 p-4">
              <h3 className="font-bold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm leading-5 text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">Latest release</p>
            <h2 className="mt-1 text-2xl font-black">Zoro Nexus v{meta.version}</h2>
          </div>
          <span className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500">30 Sep 2026</span>
        </div>
        <ul className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          {releaseHighlights.map((item) => <li key={item} className="rounded-2xl bg-slate-50 p-3">✓ {item}</li>)}
        </ul>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Build information</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Info label="Release" value={`v${meta.version}`} />
          <Info label="Environment" value={meta.environment} />
          <Info label="Git branch" value={meta.branch} />
          <Info label="Git commit" value={shortCommit} mono />
          <Info label="Deployment ID" value={meta.deploymentId} mono />
          <Info label="Deployment URL" value={meta.deploymentUrl} mono />
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Production: <span className="font-mono">{PRODUCTION_URL}</span>
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/assistant" className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white">Open Zoro</Link>
        <Link href="/connections" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800">Connections</Link>
        <Link href="/activity" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800">Activity</Link>
      </div>
    </div>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 break-all text-sm font-semibold text-slate-900 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
