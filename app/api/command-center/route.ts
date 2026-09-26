import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { buildAssistantContext } from "@/lib/intelligence/context-builder";
import { buildCommandCenter } from "@/lib/intelligence/command-center";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(buildCommandCenter(await buildAssistantContext(session.user.id)), { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Your briefing could not be refreshed. Try again shortly." }, { status: 503 });
  }
}
