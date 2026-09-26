import Link from "next/link";
import { getServerSession } from "next-auth";
import { Inbox, Radar } from "lucide-react";
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
    <div className="nexus-page">
      <div className="nexus-page-heading">
        <div className="nexus-page-icon"><Radar size={22} /></div>
        <div className="nexus-page-title">
          <p className="nexus-kicker">INTELLIGENCE GRID</p>
          <h1>Signal over noise</h1>
          <p>Gmail distilled into actions, deadlines and meaningful signals.</p>
        </div>
        <div className="nexus-page-actions">
          <Link href="/inbox/compose" className="nexus-secondary-action"><Inbox size={16} /> Compose</Link>
          <RosterSyncButton />
          <GmailScanButton autoStart={params.scan === "1"} />
        </div>
      </div>

      <div className="nexus-metric-strip">
        <Metric label="Action required" value={actionCount} />
        <Metric label="Detected deadlines" value={deadlineCount} />
        <Metric label="Urgent signals" value={urgentCount} />
      </div>

      <form className="intelligence-filter" method="get">
        <label htmlFor="intel-search" className="sr-only">Search loaded email intelligence</label>
        <input id="intel-search" name="q" maxLength={200} defaultValue={query} placeholder="Search sender, subject or next action…" />
        <label htmlFor="intel-view" className="sr-only">Filter email intelligence</label>
        <select id="intel-view" name="view" defaultValue={view}>
          <option value="all">All intelligence</option>
          <option value="action">Action required</option>
          <option value="urgent">Urgent</option>
          <option value="deadline">Has deadline</option>
        </select>
        <button className="hub-primary">Apply filters</button>
      </form>
      <p className="hub-footnote">Showing {visible.length} of {items.length} loaded messages. Up to 60 records are loaded.</p>

      <div className="intelligence-grid">
        {visible.length === 0 ? (
          <div className="nexus-empty-state">{items.length === 0 ? "No processed email yet. Run a Gmail scan." : "No messages match these filters."}</div>
        ) : visible.map((item) => (
          <article key={item.id} className="nexus-intel-card">
            <div className="nexus-intel-top">
              <div className="min-w-0">
                <p className="nexus-intel-subject">{item.subject || "(no subject)"}</p>
                <p className="nexus-intel-sender">{item.sender}</p>
              </div>
              <div className="nexus-badges">
                <span>{item.importance}</span>
                <span className={item.requiresAction ? "is-action" : ""}>{item.classification.replaceAll("_", " ")}</span>
              </div>
            </div>
            {item.deadlineAt && <p className="nexus-deadline">Deadline · {formatDeadline(item.deadlineAt)}</p>}
            <p className="nexus-intel-summary">{item.whatHappened}</p>
            {item.whyItMatters && <p className="nexus-intel-muted">{item.whyItMatters}</p>}
            {item.recommendedAction && (
              <div className="nexus-recommendation">
                <span>NEXT MOVE</span>
                <p>{item.recommendedAction}</p>
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
    <div className="nexus-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
