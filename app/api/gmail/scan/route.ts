import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { scanGmail } from "@/lib/gmail-scan";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    return NextResponse.json(await scanGmail(session.user.id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gmail scan failed" }, { status: 500 });
  }
}
