import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getGoogleServices } from "@/lib/google";
import { audit, activity } from "@/lib/audit";

const updateSchema = z.object({
  summary: z.string().min(1).max(180).optional(),
  description: z.string().max(5000).optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  category: z.enum(["WORK", "PROFESSIONAL_YEAR", "WORKOUT", "APPOINTMENT", "PERSONAL", "DEADLINE", "REMINDER"]).optional(),
  confirmed: z.literal(true),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  try {
    const input = updateSchema.parse(await request.json());
    const { calendar } = await getGoogleServices(session.user.id);
    const before = await calendar.events.get({ calendarId: "primary", eventId: id });

    const updated = await calendar.events.patch({
      calendarId: "primary",
      eventId: id,
      requestBody: {
        summary: input.summary,
        description: input.description,
        start: input.start ? { dateTime: input.start, timeZone: process.env.APP_TIMEZONE || "Australia/Darwin" } : undefined,
        end: input.end ? { dateTime: input.end, timeZone: process.env.APP_TIMEZONE || "Australia/Darwin" } : undefined,
        extendedProperties: input.category ? {
          private: {
            ...(before.data.extendedProperties?.private || {}),
            secretaryCategory: input.category,
          },
        } : undefined,
      },
    });

    await audit({
      userId: session.user.id,
      action: "CALENDAR_EVENT_UPDATED",
      source: "User",
      sourceRef: id,
      previousState: before.data,
      newState: updated.data,
      result: "SUCCESS",
    });
    await activity({ userId: session.user.id, type: "CALENDAR", summary: `Calendar event updated: ${updated.data.summary || "event"}`, details: { eventId: id } });

    return NextResponse.json({ event: updated.data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update event" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  try {
    const body = await request.json();
    if (body?.confirmed !== true) return NextResponse.json({ error: "Explicit confirmation is required." }, { status: 400 });

    const { calendar } = await getGoogleServices(session.user.id);
    const before = await calendar.events.get({ calendarId: "primary", eventId: id });
    await calendar.events.delete({ calendarId: "primary", eventId: id });

    await audit({
      userId: session.user.id,
      action: "CALENDAR_EVENT_DELETED",
      source: "User",
      sourceRef: id,
      previousState: before.data,
      result: "SUCCESS",
    });
    await activity({ userId: session.user.id, type: "CALENDAR", summary: `Calendar event deleted: ${before.data.summary || "event"}`, details: { eventId: id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete event" }, { status: 400 });
  }
}
