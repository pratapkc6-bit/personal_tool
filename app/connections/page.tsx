import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ConnectionsClient } from "@/components/connections-client";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage() {
  const session = await getServerSession(authOptions);
  const account = session?.user?.id ? await db.account.findFirst({
    where: { userId: session.user.id, provider: "google" },
    select: { scope: true },
  }) : null;

  const scopes = account?.scope?.split(" ").filter(Boolean) ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-500">ACCOUNT CONNECTIONS</p>
        <h1 className="text-2xl font-bold tracking-tight">Google connection</h1>
        <p className="mt-1 text-sm text-slate-600">The app requests only identity, Gmail read/compose, and Calendar event access needed for the secretary workflow.</p>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
        <ConnectionsClient connected={Boolean(account)} scopes={scopes} />
        <div className="mt-5 border-t border-slate-200 pt-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">Safety rules</p>
          <p className="mt-1">Email content is treated as untrusted data. Sending email requires a separate explicit confirmation. Automatic roster edits are limited to MYOB-created Calendar events.</p>
        </div>
      </div>
    </div>
  );
}
