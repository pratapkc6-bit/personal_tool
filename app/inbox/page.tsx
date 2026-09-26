import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { GmailScanButton } from "@/components/gmail-scan-button";
import { RosterSyncButton } from "@/components/roster-sync-button";

export const dynamic = "force-dynamic";

const tz = process.env.APP_TIMEZONE || "Australia/Darwin";

function formatDeadline(date: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: tz,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ scan?: string; view?: string; q?: string }>;
}) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);
  const items = session?.user?.id ? await db.emailIntelligence.findMany({
    where: { userId: session.user.id },
    orderBy: [{ requiresAction: "desc" }, { deadlineAt: "asc" }, { processedAt: "desc" }],
    take: 60,
  }) : [];

  const view = ["action", "urgent", "deadline"].includes(params.view || "") ? params.view : "all";
  const query = (params.q || "").slice(0, 200);
  const visible = items.filter(item => (view === "all" || (view === "action" && item.requiresAction) || (view === "urgent" && item.importance === "URGENT") || (view === "deadline" && !!item.deadlineAt)) && `${item.subject || ""} ${item.sender || ""} ${item.recommendedAction || ""}`.toLowerCase().includes(query.toLowerCase()));
  const actionCount = items.filter((item) => item.requiresAction).length;
  const deadlineCount = items.filter((item) => item.deadlineAt).length;
  const urgentCount = items.filter((item) => item.importance === "URGENT").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">INTELLIGENCE FEED</p>
          <h1 className="text-2xl font-bold tracking-tight">Your intelligence feed</h1>
          <p className="mt-1 text-sm text-slate-600">Prioritised by action, deadline and urgency rather than whichever email arrived last.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/inbox/compose" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold">Compose</Link>
          <RosterSyncButton />
          <GmailScanButton autoStart={params.scan === "1"} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Metric label="Action required" value={actionCount} />
        <Metric label="Detected deadlines" value={deadlineCount} />
        <Metric label="Urgent" value={urgentCount} />
      </div>

      <form className="intelligence-filter" method="get"><label htmlFor="intel-search" className="sr-only">Search loaded email intelligence</label><input id="intel-search" name="q" maxLength={200} defaultValue={query} placeholder="Search sender, subject or next action…" /><label htmlFor="intel-view" className="sr-only">Filter email intelligence</label><select id="intel-view" name="view" defaultValue={view}><option value="all">All intelligence</option><option value="action">Action required</option><option value="urgent">Urgent</option><option value="deadline">Has deadline</option></select><button className="hub-primary">Apply filters</button></form><p className="hub-footnote">Showing {visible.length} of {items.length} loaded messages. Up to 60 records are loaded.</p>
      <div className="intelligence-grid">
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">{items.length === 0 ? "No processed email yet. Run a Gmail scan." : "No messages match these filters."}</div>
        ) : visible.map((item) => (
          <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold">{item.subject || "(no subject)"}</p>
                <p className="truncate text-sm text-slate-500">{item.sender}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{item.importance}</span>
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${item.requiresAction ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>
                  {item.classification.replaceAll("_", " ")}
                </span>
              </div>
            </div>

            {item.deadlineAt && (
              <p className="mt-3 text-sm font-semibold text-amber-800">Deadline: {formatDeadline(item.deadlineAt)}</p>
            )}

            <p className="mt-3 text-sm">{item.whatHappened}</p>
            {item.whyItMatters && <p className="mt-1 text-sm text-slate-500">{item.whyItMatters}</p>}
            {item.recommendedAction && (
              <div className="mt-3 rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Secretary recommendation</p>
                <p className="mt-1 text-sm font-medium">{item.recommendedAction}</p>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

