import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { GmailScanButton } from "@/components/gmail-scan-button";
import { RosterSyncButton } from "@/components/roster-sync-button";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const session = await getServerSession(authOptions);
  const items = session?.user?.id ? await db.emailIntelligence.findMany({
    where: { userId: session.user.id },
    orderBy: { processedAt: "desc" },
    take: 40,
  }) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">GMAIL INTELLIGENCE</p>
          <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
          <p className="mt-1 text-sm text-slate-600">Meaning first, inbox clutter second. A small rebellion against email as a lifestyle.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/inbox/compose" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold">Compose</Link>
          <RosterSyncButton />
          <GmailScanButton />
        </div>
      </div>

      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No processed email yet. Run a Gmail scan.</div>
        ) : items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold">{item.subject || "(no subject)"}</p>
                <p className="truncate text-sm text-slate-500">{item.sender}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs font-bold ${item.requiresAction ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>{item.classification.replaceAll("_", " ")}</span>
            </div>
            <p className="mt-3 text-sm">{item.whatHappened}</p>
            {item.whyItMatters && <p className="mt-1 text-sm text-slate-500">{item.whyItMatters}</p>}
            {item.recommendedAction && (
              <div className="mt-3 rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Recommended action</p>
                <p className="mt-1 text-sm font-medium">{item.recommendedAction}</p>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
