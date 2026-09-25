import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions, runtimeAuthConfigured } from "@/lib/auth";
import { buildSecretaryBriefing } from "@/lib/secretary";
import { getGoogleServices } from "@/lib/google";
import { Section } from "@/components/section";
import { QuickActions } from "@/components/quick-actions";

export const dynamic = "force-dynamic";

const tz = process.env.APP_TIMEZONE || "Australia/Darwin";

function formatDate(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-AU", { timeZone: tz, ...options }).format(date);
}

export default async function HomePage() {
  if (!runtimeAuthConfigured) {
    const missing = [
      !process.env.DATABASE_URL && "DATABASE_URL",
      !process.env.NEXTAUTH_SECRET && "NEXTAUTH_SECRET",
      !process.env.GOOGLE_CLIENT_ID && "GOOGLE_CLIENT_ID",
      !process.env.GOOGLE_CLIENT_SECRET && "GOOGLE_CLIENT_SECRET",
    ].filter(Boolean) as string[];

    return (
      <div className="mx-auto max-w-2xl py-8">
        <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-card">
          <p className="text-sm font-semibold text-amber-700">DEPLOYMENT LIVE · SETUP REQUIRED</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Pratap Personal Secretary is running.</h1>
          <p className="mt-3 text-slate-600">
            The server is healthy, but Google and database integrations are not configured in this Vercel environment yet.
          </p>
          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">Missing runtime configuration</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              {missing.map((name) => <li key={name}>{name}</li>)}
            </ul>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Gmail, Calendar, MYOB roster sync and database-backed tasks will activate after these secrets are connected.
          </p>
        </div>
      </div>
    );
  }

  const session = await getServerSession(authOptions);
  const now = new Date();

  if (!session?.user?.id) {
    return (
      <div className="mx-auto max-w-xl py-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-card">
          <p className="text-sm font-semibold text-slate-500">PRIVATE PERSONAL PRODUCTIVITY</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Your admin work, compressed into one secretary.</h1>
          <p className="mt-3 text-slate-600">Connect Google to enable Calendar, Gmail intelligence, MYOB roster sync, tasks and briefings.</p>
          <Link href="/connections" className="mt-6 inline-flex rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white">Open Connections</Link>
        </div>
      </div>
    );
  }

  const briefing = await buildSecretaryBriefing(session.user.id);
  let events: Array<{ id?: string | null; summary?: string | null; start?: { dateTime?: string | null; date?: string | null } | null }> = [];

  try {
    const { calendar } = await getGoogleServices(session.user.id);
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      maxResults: 8,
      singleEvents: true,
      orderBy: "startTime",
    });
    events = response.data.items ?? [];
  } catch {}

  const nextEvent = events[0];
  const nextWork = events.find((e) => e.summary?.toLowerCase().startsWith("work"));
  const greetingHour = Number(new Intl.DateTimeFormat("en-AU", { timeZone: tz, hour: "2-digit", hour12: false }).format(now));
  const greeting = greetingHour < 12 ? "Good morning" : greetingHour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-slate-950 p-5 text-white shadow-card">
        <p className="text-sm text-slate-300">{formatDate(now, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        <h1 className="mt-1 text-2xl font-bold">{greeting}, {session.user.name?.split(" ")[0] || "Pratap"}.</h1>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Next appointment" value={nextEvent?.summary || "Nothing scheduled"} />
          <Stat label="Next work shift" value={nextWork?.summary || "No shift found"} />
          <Stat label="Email actions" value={String(briefing.emails.length)} />
          <Stat label="Open tasks" value={String(briefing.tasks.length)} />
        </div>
      </section>

      {briefing.topPriorities.length > 0 && (
        <Section title="Top 3 priorities">
          <div className="space-y-2">
            {briefing.topPriorities.map((task) => (
              <Link key={task.id} href="/tasks" className="block rounded-xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{task.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{task.nextAction || task.category}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{task.priority}</span>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Today's calendar" action={<Link className="text-sm font-semibold" href="/calendar">View all</Link>}>
          {events.length === 0 ? <Empty text="No upcoming events found." /> : (
            <div className="space-y-2">
              {events.slice(0, 5).map((event) => (
                <div key={event.id} className="rounded-xl bg-slate-50 p-3">
                  <p className="font-medium">{event.summary || "Untitled event"}</p>
                  <p className="mt-1 text-sm text-slate-500">{event.start?.dateTime ? formatDate(new Date(event.start.dateTime), { weekday: "short", hour: "numeric", minute: "2-digit" }) : event.start?.date}</p>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Email actions" action={<Link className="text-sm font-semibold" href="/inbox">Open inbox</Link>}>
          {briefing.emails.length === 0 ? <Empty text="No stored email actions." /> : (
            <div className="space-y-2">
              {briefing.emails.slice(0, 5).map((email) => (
                <div key={email.id} className="rounded-xl border border-slate-200 p-3">
                  <p className="font-medium">{email.subject || "Email"}</p>
                  <p className="mt-1 text-sm text-slate-500">{email.recommendedAction || email.whyItMatters}</p>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {briefing.followups.length > 0 && (
        <Section title="Waiting / follow-up">
          <div className="space-y-2">
            {briefing.followups.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                <p className="font-semibold">{item.subject}</p>
                <p className="mt-1 text-sm text-slate-500">{item.personCompany || item.expectedResponse || "Waiting for an update"}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Quick actions"><QuickActions /></Section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-white/10 p-3"><p className="text-xs text-slate-300">{label}</p><p className="mt-1 truncate text-sm font-semibold">{value}</p></div>;
}

function Empty({ text }: { text: string }) {
  return <p className="py-5 text-center text-sm text-slate-500">{text}</p>;
}
