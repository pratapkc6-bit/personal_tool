import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { buildSecretaryBriefing } from "@/lib/secretary";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await buildSecretaryBriefing(session.user.id));
}
