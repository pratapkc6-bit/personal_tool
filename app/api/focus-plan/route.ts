import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildAssistantContext } from "@/lib/intelligence/context-builder";
import { buildCommandCenter, fitFocusSessions } from "@/lib/intelligence/command-center";
import { planRequestSchema, readSavedPlan } from "@/lib/intelligence/saved-plan";

const key = "zoro_focus_plan_v1";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to load your plan." }, { status: 401 });
  const record = await db.setting.findUnique({ where: { userId_key: { userId: session.user.id, key } } });
  return NextResponse.json({ plan: readSavedPlan(record?.value) }, { headers });
}
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to save a plan." }, { status: 401 });
  const input = planRequestSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Choose a title, 15–90 focus minutes, and a 0–30 minute buffer." }, { status: 400 });
  try {
    // Never accept client-proposed times: re-read this account's calendar before saving.
    const context = await buildAssistantContext(session.user.id);
    const snapshot = buildCommandCenter(context);
    if (!snapshot.verified) return NextResponse.json({ error: "A complete calendar is required. Reconnect or refresh your calendar first." }, { status: 409 });
    const sessions = fitFocusSessions(snapshot.windows, input.data.minutes, input.data.buffer, Date.now());
    if (!sessions.length) return NextResponse.json({ error: "No remaining gap fits this plan. Try a shorter focus session." }, { status: 409 });
    const plan = { ...input.data, createdAt: new Date().toISOString(), timezone: context.timezone, sessions };
    await db.setting.upsert({ where: { userId_key: { userId: session.user.id, key } }, create: { userId: session.user.id, key, value: plan }, update: { value: plan } });
    return NextResponse.json({ plan }, { headers });
  } catch { return NextResponse.json({ error: "Could not verify or save this plan. Please try again." }, { status: 503 }); }
}
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to clear your plan." }, { status: 401 });
  await db.setting.deleteMany({ where: { userId: session.user.id, key } });
  return NextResponse.json({ plan: null }, { headers });
}
