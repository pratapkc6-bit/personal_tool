import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const session = await getServerSession(authOptions);
  const rows = session?.user?.id ? await db.assistantActivity.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  }) : [];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-500">AUDITABLE AUTOMATION</p>
        <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
        <p className="mt-1 text-sm text-slate-600">Only meaningful activity is shown. The database keeps the deeper audit history separately.</p>
      </div>
      <div className="space-y-2">
        {rows.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No meaningful activity recorded yet.</div> : rows.map((row) => (
          <article key={row.id} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <time className="w-16 shrink-0 text-xs font-semibold text-slate-500">{row.createdAt.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", timeZone: "Australia/Darwin" })}</time>
            <div>
              <p className="font-medium">{row.summary}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{row.type.replaceAll("_", " ")}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
