import Link from "next/link";
import { deploymentMetadata, GOOGLE_CALLBACK_URL, PRODUCTION_URL } from "@/lib/release";

export const dynamic = "force-dynamic";

export default function AboutPage() {
  const meta = deploymentMetadata();
  const shortCommit = meta.commit === "unavailable" ? meta.commit : meta.commit.slice(0, 12);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-500">ABOUT APP</p>
        <h1 className="text-2xl font-bold tracking-tight">Pratap Personal Secretary</h1>
        <p className="mt-1 text-sm text-slate-600">
          Use this page to confirm exactly which release and deployment you are testing.
        </p>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="grid gap-3 sm:grid-cols-2">
          <Info label="Release version" value={`v${meta.version}`} />
          <Info label="Environment" value={meta.environment} />
          <Info label="Git branch" value={meta.branch} />
          <Info label="Git commit" value={shortCommit} mono />
          <Info label="Deployment ID" value={meta.deploymentId} mono />
          <Info label="Deployment URL" value={meta.deploymentUrl} mono />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="font-bold">What's new in v0.10.0</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
          <li>Black-and-orange Zoro Hub design across Home, Assistant, Calendar, Missions, Intelligence and Setup.</li><li>Capture a task from any screen, search and filter missions, edit next actions, and reopen completed work.</li><li>Save a focus plan to your account after a fresh calendar check. Plans are suggestions, not calendar reservations.</li><li>Filter email intelligence by action, urgency, deadline, sender or subject.</li><li>New Zoro command center with attention radar, ranked priorities and today's remaining schedule.</li><li>Interactive focus planning with adjustable duration and recovery buffers, plus a pauseable session timer.</li><li>Quick commands, mobile layouts and a refreshed visual identity.</li><li>Optional browser model download with WebGPU checks, progress, a generation test, and cache removal. No Mac or paid AI API required.</li>
          <li>Experimental on-device conversation. Compatibility and performance must be tested on your phone.</li>
          <li>Daily command briefing with priorities, focus windows, overdue items and conflicts.</li>
          <li>Local secretary intelligence with no paid AI service, API key, or model subscription.</li>
          <li>Day planning and follow-up questions using your existing tasks, email summaries and calendar.</li>
          <li>Task and event previews with expiring, single-use confirmations.</li>
        </ul>
        <Link href="/assistant" className="mt-4 inline-block font-semibold text-cyan-800">Open Zoro →</Link>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="font-bold">OAuth configuration</h2>
        <p className="mt-2 text-sm text-slate-600">Production URL</p>
        <code className="mt-1 block break-all rounded-xl bg-slate-100 p-3 text-xs">{PRODUCTION_URL}</code>
        <p className="mt-4 text-sm text-slate-600">Google authorized redirect URI must exactly match</p>
        <code className="mt-1 block break-all rounded-xl bg-slate-100 p-3 text-xs">{GOOGLE_CALLBACK_URL}</code>

        <div className="mt-5 rounded-2xl border border-slate-200 p-4">
          <p className="font-semibold">Running OAuth diagnostics</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Info label="Effective NEXTAUTH_URL" value={meta.effectiveNextAuthUrl} mono />
            <Info label="Actual callback base" value={meta.effectiveGoogleCallback} mono />
            <Info label="Google Client ID hint" value={meta.googleClientIdHint} mono />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            The Client ID hint lets you confirm that Vercel is using the same Google OAuth client that you edited in Google Cloud, without exposing the full credential.
          </p>
        </div>
      </section>

      <Link href="/connections" className="inline-flex rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white">
        Open Connections
      </Link>
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
