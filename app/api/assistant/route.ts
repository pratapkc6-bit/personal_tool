import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import * as chrono from "chrono-node";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getGoogleServices } from "@/lib/google";
import { buildAssistantContext } from "@/lib/intelligence/context-builder";
import { answerWithLocalIntelligence, type AssistantHistoryMessage } from "@/lib/intelligence/local-assistant";
import { scanGmail } from "@/lib/gmail-scan";
import { syncLatestMyobRoster } from "@/lib/roster-sync";
import { audit, activity } from "@/lib/audit";

type PendingAction =
  | {
      type: "CREATE_CALENDAR_EVENT";
      summary: string;
      start: string;
      end: string;
      category: "WORKOUT" | "APPOINTMENT" | "PERSONAL" | "REMINDER";
      description?: string;
    }
  | {
      type: "CREATE_TASK";
      title: string;
      dueAt?: string;
      priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
      category: string;
      nextAction?: string;
    }
  | {
      type: "SYNC_MYOB_ROSTER";
    };

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
  if (!/\b(add|schedule|book|create)\b.*\b(appointment|workout|meeting|event)\b/i.test(message) &&
      !/\b(add|schedule|book)\b/i.test(message)) return null;

  const startDate = parseDarwinDate(message);
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
  if (!/\b(remind me|create task|add task|i have to|i need to)\b/i.test(message)) return null;
  const due = parseDarwinDate(message);
  const title = message
    .replace(/^(remind me to|create task|add task|i have to|i need to)\s*/i, "")
    .replace(/\s+(today|tomorrow|on\s+\w+|next\s+\w+|at\s+\d.*)$/i, "")
    .trim();

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
      event.start?.dateTime === action.start
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

function safeHistory(value: unknown): AssistantHistoryMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(-10)
    .filter((item): item is { role: string; text: string } =>
      Boolean(
        item &&
        typeof item === "object" &&
        "role" in item &&
        "text" in item &&
        typeof (item as { role?: unknown }).role === "string" &&
        typeof (item as { text?: unknown }).text === "string"
      )
    )
    .filter((item) => item.role === "user" || item.role === "assistant")
    .map((item) => ({
      role: item.role as "user" | "assistant",
      text: item.text.slice(0, 2000),
    }));
}

async function answerWithIntelligence(userId: string, message: string, history: AssistantHistoryMessage[]) {
  const context = await buildAssistantContext(userId);
  return answerWithLocalIntelligence(message, context, history);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();

    if (body.confirmedAction) {
      return NextResponse.json(await executeAction(session.user.id, body.confirmedAction as PendingAction));
    }

    const message = String(body.message || "").trim();
    if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 });

    if (/\b(check|scan)\b.*\b(email|gmail|inbox)\b/i.test(message)) {
      const result = await scanGmail(session.user.id);
      return NextResponse.json({
        message: `Gmail scan complete. ${result.processed} new message${result.processed === 1 ? "" : "s"} processed and ${result.actionItems.length} action item${result.actionItems.length === 1 ? "" : "s"} detected.`,
      });
    }

    if (/\b(sync|add|check)\b.*\broster\b/i.test(message)) {
      return NextResponse.json({
        message: "I can reconcile the latest MYOB roster with Google Calendar. Confirm before I make roster-managed Calendar changes.",
        pendingAction: { type: "SYNC_MYOB_ROSTER" },
      });
    }

    const calendarAction = eventPreview(message);
    if (calendarAction) {
      return NextResponse.json({
        message: `I understood this as: ${calendarAction.summary}, starting ${new Date(calendarAction.start).toLocaleString("en-AU", { timeZone: "Australia/Darwin" })}. Confirm before I change Google Calendar.`,
        pendingAction: calendarAction,
      });
    }

    const taskAction = taskPreview(message);
    if (taskAction) {
      return NextResponse.json({
        message: `I can create the task "${taskAction.title}"${taskAction.dueAt ? ` due ${new Date(taskAction.dueAt).toLocaleString("en-AU", { timeZone: "Australia/Darwin" })}` : ""}. Confirm to add it.`,
        pendingAction: taskAction,
      });
    }

    return NextResponse.json({
      message: await answerWithIntelligence(session.user.id, message, safeHistory(body.history)),
      engine: "local",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Assistant request failed" }, { status: 500 });
  }
}
