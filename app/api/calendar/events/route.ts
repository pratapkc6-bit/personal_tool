import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getGoogleServices } from "@/lib/google";
import { audit, activity } from "@/lib/audit";

const createSchema = z.object({
  summary: z.string().min(1).max(180),
  description: z.string().max(5000).optional(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  category: z.enum(["WORK", "PROFESSIONAL_YEAR", "WORKOUT", "APPOINTMENT", "PERSONAL", "DEADLINE", "REMINDER"]).default("PERSONAL"),
  confirmed: z.literal(true),
});

const categoryColor: Record<string, string> = {
  WORK: "#2563eb",
  PROFESSIONAL_YEAR: "#7c3aed",
  WORKOUT: "#059669",
  APPOINTMENT: "#dc2626",
  PERSONAL: "#475569",
  DEADLINE: "#ea580c",
  REMINDER: "#ca8a04",
};

function inferCategory(summary: string) {
  const s = summary.toLowerCase();
  if (s.startsWith("work")) return "WORK";
  if (s.includes("professional year") || s.includes("py class")) return "PROFESSIONAL_YEAR";
  if (s.includes("workout") || s.includes("gym")) return "WORKOUT";
  if (s.includes("deadline") || s.includes("due")) return "DEADLINE";
  if (s.includes("reminder")) return "REMINDER";
  if (s.includes("appointment") || s.includes("dentist") || s.includes("doctor") || s.includes("check-up")) return "APPOINTMENT";
  return "PERSONAL";
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { calendar } = await getGoogleServices(session.user.id);
    const url = new URL(request.url);
    const now = new Date();
    const start = url.searchParams.get("start") || new Date(now.getTime() - 30 * 86400000).toISOString();
    const end = url.searchParams.get("end") || new Date(now.getTime() + 120 * 86400000).toISOString();

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: start,
      timeMax: end,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 500,
    });

    return NextResponse.json((response.data.items ?? []).map((event) => {
      const category = event.extendedProperties?.private?.secretaryCategory || inferCategory(event.summary || "");
      return {
        id: event.id,
        title: event.summary || "Untitled event",
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        allDay: Boolean(event.start?.date && !event.start?.dateTime),
        backgroundColor: categoryColor[category] || categoryColor.PERSONAL,
        borderColor: categoryColor[category] || categoryColor.PERSONAL,
        extendedProps: {
          category,
          description: event.description || "",
        },
      };
    }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Calendar unavailable" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const input = createSchema.parse(await request.json());
    const { calendar } = await getGoogleServices(session.user.id);

    const duplicates = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date(input.start).toISOString(),
      timeMax: new Date(input.end).toISOString(),
      singleEvents: true,
      q: input.summary,
      maxResults: 10,
    });

    const duplicate = (duplicates.data.items ?? []).find((event) =>
      event.summary?.trim().toLowerCase() === input.summary.trim().toLowerCase() &&
      event.start?.dateTime === input.start
    );

    if (duplicate) {
      return NextResponse.json({ error: "A matching event already exists.", eventId: duplicate.id }, { status: 409 });
    }

    const created = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.start, timeZone: process.env.APP_TIMEZONE || "Australia/Darwin" },
        end: { dateTime: input.end, timeZone: process.env.APP_TIMEZONE || "Australia/Darwin" },
        extendedProperties: { private: { secretaryCategory: input.category, secretarySource: "USER" } },
      },
    });

    await audit({
      userId: session.user.id,
      action: "CALENDAR_EVENT_CREATED",
      source: "User",
      sourceRef: created.data.id,
      newState: created.data,
      result: "SUCCESS",
    });
    await activity({
      userId: session.user.id,
      type: "CALENDAR",
      summary: `Calendar event created: ${input.summary}`,
      details: { eventId: created.data.id, start: input.start },
    });

    return NextResponse.json({ event: created.data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create event" }, { status: 400 });
  }
}
