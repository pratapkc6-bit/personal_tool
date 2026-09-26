import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import * as chrono from "chrono-node";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getGoogleServices } from "@/lib/google";
import { buildAssistantContext } from "@/lib/intelligence/context-builder";
import { answerWithLocalIntelligence, isOpenEndedConversation, normalizeAssistantInput, type AssistantHistoryMessage } from "@/lib/intelligence/local-assistant";
import { scanGmail } from "@/lib/gmail-scan";
import { syncLatestMyobRoster } from "@/lib/roster-sync";
import { audit, activity } from "@/lib/audit";

import { requestSchema, type PendingAction } from "@/lib/intelligence/assistant-contract";
import { prepareConfirmation, consumeConfirmation } from "@/lib/intelligence/confirmations";
import { buildMission } from "@/lib/intelligence/mission";

export const maxDuration = 60;

type CalendarPendingAction = Extract<PendingAction, { type: "CREATE_CALENDAR_EVENT" }>;
type TaskPendingAction = Extract<PendingAction, { type: "CREATE_TASK" }>;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseDarwinDate(text: string) {
  const result = chrono.parse(text, new Date(), { forwardDate: true })[0];
  if (!result) return null;

  const c = result.start;
  const year = c.get("year") ?? new Date().getFullYear();
  const month = c.get("month") ?? new Date().getMonth() + 1;
  const day = c.get("day") ?? new Date().getDate();
  const hour = c.get("hour") ?? 9;
  const minute = c.get("minute") ?? 0;
  return new Date(`${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00+09:30`);
}

function eventPreview(message: string): CalendarPendingAction | null {
  const understood = normalizeAssistantInput(message);
  if (/\b(remind me|remember me|create task|add task|make a task|i have to|i need to|note that i need to)\b/i.test(understood)) return null;
  if (/^(what|when|where|which|am i|do i|have i|show|tell me).*[?]?$/i.test(understood) &&
      !/\b(add|schedule|book|create|put|set)\b/i.test(understood)) return null;
  const hasEventWord = /\b(appointment|workout|meeting|event|gym|class|check-?up)\b/i.test(understood);
  const hasActionVerb = /\b(add|schedule|book|create|put|set|block|i have|i've got|need an?)\b/i.test(understood);
  if (!hasActionVerb || !hasEventWord) return null;

  const startDate = parseDarwinDate(understood);
  if (!startDate) return null;

  const lower = message.toLowerCase();
  const category =
    lower.includes("workout") ? "WORKOUT" :
    /(dentist|doctor|check-?up|appointment)/.test(lower) ? "APPOINTMENT" :
    "PERSONAL";

  const summary =
    category === "WORKOUT" ? "Workout" :
    lower.includes("dentist") ? "Dentist appointment" :
    /check-?up/.test(lower) ? "Health check-up" :
    lower.includes("appointment") ? "Appointment" :
    lower.includes("meeting") ? "Meeting" :
    "Personal event";

  const durationMinutes = category === "WORKOUT" ? 40 : 60;
  const endDate = new Date(startDate.getTime() + durationMinutes * 60_000);

  return {
    type: "CREATE_CALENDAR_EVENT",
    summary,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    category,
    description: "Created from Pratap Personal Secretary chat after confirmation.",
  };
}

function taskPreview(message: string): TaskPendingAction | null {
  const understood = normalizeAssistantInput(message);
  if (!/\b(remind me|remember me|create task|add task|make a task|i have to|i need to|note that i need to)\b/i.test(understood)) return null;
  const due = parseDarwinDate(understood);
  const rawTitle = understood
    .replace(/^(please\s+)?(remind me to|remember me to|create task|add task|make a task|i have to|i need to|note that i need to)\s*/i, "")
    .replace(/\s+(today|tomorrow|on\s+\w+|next\s+\w+|at\s+\d.*)$/i, "")
    .trim();
  const title = rawTitle ? rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1) : "";

  return {
    type: "CREATE_TASK",
    title: title || "Personal task",
    dueAt: due?.toISOString(),
    priority: /urgent|asap|important/i.test(message) ? "HIGH" : "MEDIUM",
    category: "PERSONAL",
    nextAction: title || "Complete the task",
  };
}

async function executeAction(userId: string, action: PendingAction) {
  if (action.type === "SYNC_MYOB_ROSTER") {
    const result = await syncLatestMyobRoster(userId);
    return { message: `Roster sync complete: ${result.created || 0} new, ${result.updated || 0} changed, ${result.removed || 0} removed.` };
  }

  if (action.type === "CREATE_CALENDAR_EVENT") {
    const { calendar } = await getGoogleServices(userId);
    const duplicates = await calendar.events.list({
      calendarId: "primary",
      timeMin: action.start,
      timeMax: action.end,
      singleEvents: true,
      q: action.summary,
      maxResults: 10,
    });

    const duplicate = (duplicates.data.items ?? []).some((event) =>
      event.summary?.toLowerCase() === action.summary.toLowerCase() &&
      event.start?.dateTime && Date.parse(event.start.dateTime) === Date.parse(action.start)
    );

    if (duplicate) return { message: "That calendar event already exists, so I did not create a duplicate." };

    const created = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: action.summary,
        description: action.description,
        start: { dateTime: action.start, timeZone: process.env.APP_TIMEZONE || "Australia/Darwin" },
        end: { dateTime: action.end, timeZone: process.env.APP_TIMEZONE || "Australia/Darwin" },
        extendedProperties: { private: { secretarySource: "ASSISTANT", secretaryCategory: action.category } },
      },
    });

    await audit({ userId, action: "CALENDAR_EVENT_CREATED", source: "AssistantConfirmed", sourceRef: created.data.id, newState: created.data, result: "SUCCESS" });
    await activity({ userId, type: "ASSISTANT", summary: `Assistant created calendar event: ${action.summary}`, details: { eventId: created.data.id } });
    return { message: `Created "${action.summary}" in Google Calendar.` };
  }

  const task = await db.task.create({
    data: {
      userId,
      title: action.title,
      category: action.category,
      priority: action.priority,
      dueAt: action.dueAt ? new Date(action.dueAt) : undefined,
      source: "Assistant",
      nextAction: action.nextAction,
    },
  });

  await audit({ userId, action: "TASK_CREATED", source: "AssistantConfirmed", sourceRef: task.id, newState: task, result: "SUCCESS" });
  await activity({ userId, type: "ASSISTANT", summary: `Assistant created task: ${task.title}`, details: { taskId: task.id } });
  return { message: `Created task "${task.title}".` };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const context = await buildAssistantContext(session.user.id);
    return NextResponse.json({ mission: buildMission(context) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Your briefing could not be loaded. Please try again." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Send a message up to 4,000 characters, or confirm the latest preview." }, { status: 400 });
    const body = parsed.data;
    if (body.confirmationToken) {
      const action = await consumeConfirmation(session.user.id, body.confirmationToken);
      if (!action) return NextResponse.json({ error: "That preview expired or was already used. Ask me to prepare it again." }, { status: 409 });
      return NextResponse.json({ ...await executeAction(session.user.id, action), engine: "action" });
    }
    const message = body.message!;
    const understood = normalizeAssistantInput(message);
    await db.setting.deleteMany({ where: { userId: session.user.id, key: "assistant_pending_action" } });
    const history: AssistantHistoryMessage[] = body.history || [];
    if (/^(please )?(check|scan|refresh|look at|show|see)\s+(my )?(email|emails|mail|gmail|inbox|messages)[.!?]*$/i.test(understood)) {
      const result = await scanGmail(session.user.id);
      return NextResponse.json({ message: `Gmail scan complete. ${result.processed} new messages processed and ${result.actionItems.length} action items detected.`, engine: "local", suggestedPrompts: ["Which emails need action?", "What should I do now?"] });
    }
    if (/^(please )?(sync|add|check|update|refresh)\s+(my |the )?(myob )?roster[.!?]*$/i.test(understood)) {
      return NextResponse.json({ message: "Review and confirm to reconcile the latest MYOB roster with Google Calendar.", ...await prepareConfirmation(session.user.id, { type: "SYNC_MYOB_ROSTER" }), engine: "local" });
    }
    const action = taskPreview(message) || eventPreview(message);
    if (action) {
      return NextResponse.json({ message: "I've prepared an action. Review the details below before confirming.", ...await prepareConfirmation(session.user.id, action), engine: "local" });
    }
    const context = await buildAssistantContext(session.user.id);
    return NextResponse.json({
      message: answerWithLocalIntelligence(message, context, history), engine: "local",
      deviceEligible: isOpenEndedConversation(message, history),
      deviceReference: JSON.stringify({ generatedAt: context.generatedAt, timezone: context.timezone,
        calendarStatus: context.calendarStatus,
        priorities: context.topPriorities.map(p => ({ title: p.title.slice(0, 180), nextAction: p.nextAction?.slice(0, 200), dueAt: p.dueAt })),
      }),
      suggestedPrompts: ["Plan my day", "Which emails need action?", "What deadlines are coming?"],
    });
  } catch {
    return NextResponse.json({ error: "I couldn't complete that request. Check your connection and try again. If an action was being confirmed, check Calendar or Tasks before preparing it again." }, { status: 500 });
  }
}
