import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getGoogleOAuthClient } from "@/lib/google";
import { audit } from "@/lib/audit";

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    try {
      const oauth = await getGoogleOAuthClient(session.user.id);
      await oauth.revokeCredentials();
    } catch {}

    await db.account.deleteMany({ where: { userId: session.user.id, provider: "google" } });
    await audit({ userId: session.user.id, action: "GOOGLE_DISCONNECTED", source: "User", result: "SUCCESS" });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Disconnect failed" }, { status: 500 });
  }
}
