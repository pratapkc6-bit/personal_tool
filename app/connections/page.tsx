import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ConnectionsClient } from "@/components/connections-client";
import { GOOGLE_CALLBACK_URL } from "@/lib/release";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage() {
  const missing = [
    !process.env.DATABASE_URL && "DATABASE_URL",
    !process.env.NEXTAUTH_SECRET && "NEXTAUTH_SECRET",
    !process.env.GOOGLE_CLIENT_ID && "GOOGLE_CLIENT_ID",
    !process.env.GOOGLE_CLIENT_SECRET && "GOOGLE_CLIENT_SECRET",
  ].filter(Boolean) as string[];

  const commit = process.env.VERCEL_GIT_COMMIT_SHA || "unavailable";
  const shortCommit = commit === "unavailable" ? commit : commit.slice(0, 12);

  if (missing.length > 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">ACCOUNT CONNECTIONS</p>
          <h1 className="text-2xl font-bold tracking-tight">Google connection</h1>
        </div>

        <div className="rounded-3xl border border-amber-300 bg-white p-5 shadow-card">
          <p className="text-sm font-bold text-amber-700">GOOGLE LOGIN IS NOT READY</p>
          <h2 className="mt-2 text-xl font-bold">Vercel is missing required runtime configuration.</h2>
          <p className="mt-2 text-sm text-slate-600">
            Google OAuth cannot start until every item below exists in the Production environment.
          </p>

          <div className="mt-4 rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold">Missing variables</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {missing.map((name) => <li key={name}>{name}</li>)}
            </ul>
          </div>

          <div className="mt-4">
            <p className="text-sm font-semibold">Google Authorized redirect URI must be</p>
            <code className="mt-2 block break-all rounded-xl bg-slate-100 p-3 text-xs">{GOOGLE_CALLBACK_URL}</code>
          </div>

          <p className="mt-4 text-xs text-slate-500">Deployed commit: {shortCommit}</p>
        </div>
      </div>
    );
  }

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
        <p className="mt-4 text-xs text-slate-400">Deployed commit: {shortCommit}</p>
      </div>
    </div>
  );
}
