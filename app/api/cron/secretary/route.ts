import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scanGmail } from "@/lib/gmail-scan";
import { syncLatestMyobRoster } from "@/lib/roster-sync";

export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await db.account.findMany({
    where: { provider: "google" },
    select: { userId: true },
    distinct: ["userId"],
  });

  const results = [];
  for (const account of accounts) {
    try {
      const gmail = await scanGmail(account.userId);
      let roster: unknown;
      try {
        roster = await syncLatestMyobRoster(account.userId);
      } catch (error) {
        roster = { error: error instanceof Error ? error.message : "Roster sync failed" };
      }
      results.push({ userId: account.userId, gmail, roster });
    } catch (error) {
      results.push({ userId: account.userId, error: error instanceof Error ? error.message : "Secretary scan failed" });
    }
  }

  return NextResponse.json({ ok: true, users: results.length, results });
}
