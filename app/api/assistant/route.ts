import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getGoogleServices } from "@/lib/google";
import { buildAssistantContext } from "@/lib/intelligence/context-builder";
import { answerWithLocalIntelligence, normalizeAssistantInput, type AssistantHistoryMessage } from "@/lib/intelligence/local-assistant";
import { scanGmail } from "@/lib/gmail-scan";
import { syncLatestMyobRoster } from "@/lib/roster-sync";
import { audit, activity } from "@/lib/audit";
import { loadNotificationSettings } from "@/lib/notification-settings";
import { requestSchema, type PendingAction } from "@/lib/intelligence/assistant-contract";
import { prepareConfirmation, consumeConfirmation, consumeLatestConfirmation } from "@/lib/intelligence/confirmations";
import { buildMission } from "@/lib/intelligence/mission";
import { answerWithOpenAI, openAIConfigured } from "@/lib/openai-provider";
import { emailPreview, isGmailScanIntent, isReminderListIntent, parseAssistantDate, reminderPreview } from "@/lib/intelligence/assistant-tools";
import { formatZoroDateTime } from "@/lib/time";

export const maxDuration = 60;

type CalendarPendingAction = Extract<PendingAction, { type: "CREATE_CALENDAR_EVENT" }>;
type TaskPendingAction = Extract<PendingAction, { type: "CREATE_TASK" }>;
type UpdateReminderPendingAction = Extract<PendingAction, { type: "UPDATE_REMINDER" }>;
type AssistantChoice = { label: string; value: string };

function eventPreview(message: string): CalendarPendingAction | null {
  const understood = normalizeAssistantInput(message);
  if (/\b(remind me|remember me|reminder|alarm|create task|add task|make a task|i have to|i need to|note that i need to)\b/i.test(understood)) return null;
  if (/^(what|when|where|which|am i|do i|have i|show|tell me).*[?]?$/i.test(understood) && !/\b(add|schedule|book|create|put|set)\b/i.test(understood)) return null;
  const hasEventWord = /\b(appointment|workout|meeting|event|gym|class|check-?up)\b/i.test(understood);
  const hasActionVerb = /\b(add|schedule|book|create|put|set|block|i have|i've got|need an?)\b/i.test(understood);
  if (!hasActionVerb || !hasEventWord) return null;

  const parsed = parseAssistantDate(understood);
  if (!parsed) return null;
  const startDate = parsed.date;
  const lower = message.toLowerCase();
  const category = lower.includes("workout") ? "WORKOUT" : /(dentist|doctor|check-?up|appointment)/.test(lower) ? "APPOINTMENT" : "PERSONAL";
  const summary = category === "WORKOUT" ? "Workout" : lower.includes("dentist") ? "Dentist appointment" : /check-?up/.test(lower) ? "Health check-up" : lower.includes("appointment") ? "Appointment" : lower.includes("meeting") ? "Meeting" : "Personal event";
  const durationMinutes = category === "WORKOUT" ? 40 : 60;
  const endDate = new Date(startDate.getTime() + durationMinutes * 60_000);
  return { type: "CREATE_CALENDAR_EVENT", summary, start: startDate.toISOString(), end: endDate.toISOString(), category, description: "Created from Zoro Intelligence after confirmation." };
}

function taskPreview(message: string): TaskPendingAction | null {
  const understood = normalizeAssistantInput(message);
  if (!/\b(create task|add task|make a task|i have to|i need to|note that i need to)\b/i.test(understood)) return null;
  const due = parseAssistantDate(understood)?.date || null;
  const rawTitle = understood
    .replace(/^(please\s+)?(create task|add task|make a task|i have to|i need to|note that i need to)\s*/i, "")
    .replace(/\s+(today|tomorrow|on\s+\w+|next\s+\w+|at\s+\d.*)$/i, "")
    .trim();
  const title = rawTitle ? rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1) : "";
  return { type: "CREATE_TASK", title: title || "Personal task", dueAt: due?.toISOString(), priority: /urgent|asap|important/i.test(message) ? "HIGH" : "MEDIUM", category: "PERSONAL", nextAction: title || "Complete the task" };
}

function reminderMatchScore(text: string, title: string) {
  const normalizedTitle = normalizeAssistantInput(title).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!normalizedTitle) return 0;
  let score = text.includes(normalizedTitle) ? 100 : 0;
  for (const token of normalizedTitle.split(" ").filter((item) => item.length > 2)) {
    if (text.includes(token)) score += 10;
  }
  return score;
}

async function reminderUpdateResolution(
  userId: string,
  message: string,
  history: AssistantHistoryMessage[],
): Promise<{ action?: UpdateReminderPendingAction; message?: string; choices?: AssistantChoice[]; confirmed?: boolean } | null> {
  const current = normalizeAssistantInput(message);
  const updateVerb = /\b(change|update|move|reschedule|edit|modify)\b/i;
  const confirmIntent = /\b(confirm|confirmed|approve|approved|do it|go ahead|yes please)\b/i.test(current);
  const shortFollowUp = /^(change( it)?|do it|go ahead|confirm(ed)?|approve(d)?|yes( please)?|change and confirm(ed)?|change it and confirm(ed)?)[.!\s]*$/i.test(current);

  const reminders = await db.reminder.findMany({
    where: { userId, status: { in: ["OPEN", "FIRED"] } },
    orderBy: { remindAt: "asc" },
    take: 50,
  });
  if (!reminders.length) {
    return updateVerb.test(current) || shortFollowUp ? { message: "You do not have an open reminder to update." } : null;
  }

  const recentHistory = history.slice(-16);
  const recentUserTurns = recentHistory.filter((item) => item.role === "user").map((item) => item.text);
  const recentAssistantTurns = recentHistory.filter((item) => item.role === "assistant").map((item) => item.text);

  const reminderConversation = [...recentUserTurns, ...recentAssistantTurns].join(" ");
  const currentMentionsReminder = /\b(reminder|alarm)\b/i.test(current)
    || reminders.some((item) => reminderMatchScore(current, item.title) > 0);
  const historyMentionsReminder = /\b(reminder|alarm)\b/i.test(reminderConversation)
    || reminders.some((item) => reminderMatchScore(reminderConversation, item.title) > 0);

  const hasRecentUpdateAnchor = recentUserTurns.some((text) => {
    const normalized = normalizeAssistantInput(text);
    return updateVerb.test(normalized)
      && (/\b(reminder|alarm|time)\b/i.test(normalized)
        || reminders.some((item) => reminderMatchScore(normalized, item.title) > 0));
  });

  if (!updateVerb.test(current) && !currentMentionsReminder && !(shortFollowUp && hasRecentUpdateAnchor && historyMentionsReminder)) {
    return null;
  }

  let anchor = -1;
  for (let index = recentUserTurns.length - 1; index >= 0; index--) {
    const normalized = normalizeAssistantInput(recentUserTurns[index]);
    if (
      updateVerb.test(normalized)
      && (/\b(reminder|alarm|time)\b/i.test(normalized)
        || reminders.some((item) => reminderMatchScore(normalized, item.title) > 0))
    ) {
      anchor = index;
      break;
    }
  }

  const contextualTurns = anchor >= 0 ? recentUserTurns.slice(anchor) : [];
  const requestText = [...contextualTurns, message].join(" ").trim();
  const understood = normalizeAssistantInput(requestText);

  let existing = reminders
    .map((item) => ({ item, score: reminderMatchScore(understood, item.title) }))
    .sort((a, b) => b.score - a.score || a.item.remindAt.getTime() - b.item.remindAt.getTime())[0];

  const selected = existing?.score ? existing.item : reminders.length === 1 ? reminders[0] : null;
  const timeZone = selected?.timezone || process.env.APP_TIMEZONE || "Australia/Darwin";

  const clockTurn = [...contextualTurns, message]
    .reverse()
    .find((text) => /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i.test(text));
  const parsed = parseAssistantDate(clockTurn || understood, new Date(), timeZone)
    || parseAssistantDate(understood, new Date(), timeZone);

  if (!parsed) {
    if (shortFollowUp && hasRecentUpdateAnchor) {
      return { message: "I remember you want to change the reminder, but I need the new time again." };
    }
    return updateVerb.test(current) || currentMentionsReminder
      ? { message: "What time should I change the reminder to?" }
      : null;
  }

  const timeLabel = new Intl.DateTimeFormat("en-AU", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed.date);

  if (!selected) {
    return {
      message: "Which reminder should I change?",
      choices: reminders.slice(0, 5).map((item) => ({
        label: item.title,
        value: `Change "${item.title}" reminder to ${timeLabel}`,
      })),
    };
  }

  const recurrenceTurn = [...contextualTurns, message]
    .reverse()
    .find((text) => /\b(daily|every day|everyday|once|one time|today only|tonight only|do not repeat|don't repeat)\b/i.test(text));
  const recurrenceText = normalizeAssistantInput(recurrenceTurn || understood);
  const explicitDaily = /\b(daily|every day|everyday)\b/i.test(recurrenceText);
  const explicitOnce = /\b(once|one time|today only|tonight only|do not repeat|don't repeat)\b/i.test(recurrenceText);

  if (!explicitDaily && !explicitOnce && selected.recurrence !== "DAILY" && selected.remindAt.getTime() <= Date.now()) {
    return {
      message: `"${selected.title}" is from an earlier date. How should I apply ${timeLabel}?`,
      choices: [
        { label: `Once at ${timeLabel}`, value: `Change "${selected.title}" reminder to ${timeLabel} once` },
        { label: `Daily at ${timeLabel}`, value: `Change "${selected.title}" reminder to ${timeLabel} daily` },
        { label: "Cancel", value: "Cancel" },
      ],
    };
  }

  const recurrence: "NONE" | "DAILY" = explicitDaily
    ? "DAILY"
    : explicitOnce
      ? "NONE"
      : selected.recurrence === "DAILY"
        ? "DAILY"
        : "NONE";
  const recurrenceTime = recurrence === "DAILY"
    ? String(parsed.hour).padStart(2, "0") + ":" + String(parsed.minute).padStart(2, "0")
    : undefined;

  return {
    confirmed: confirmIntent,
    action: {
      type: "UPDATE_REMINDER",
      reminderId: selected.id,
      title: selected.title,
      remindAt: parsed.date.toISOString(),
      recurrence,
      recurrenceTime,
      timezone: timeZone,
      ringSeconds: selected.ringSeconds,
    },
  };
}

function encodeRawEmail(input: { to: string; subject: string; message: string }) {
  const encodedSubject = Buffer.from(input.subject, "utf8").toString("base64");
  const raw = [`To: ${input.to}`, `Subject: =?UTF-8?B?${encodedSubject}?=`, "MIME-Version: 1.0", "Content-Type: text/plain; charset=utf-8", "Content-Transfer-Encoding: 8bit", "", input.message].join("\r\n");
  return Buffer.from(raw).toString("base64url");
}

async function executeAction(userId: string, action: PendingAction) {
  if (action.type === "SYNC_MYOB_ROSTER") {
    const result = await syncLatestMyobRoster(userId);
    return { message: `Roster sync complete: ${result.created || 0} new, ${result.updated || 0} changed, ${result.removed || 0} removed.` };
  }

  if (action.type === "CREATE_CALENDAR_EVENT") {
    const { calendar } = await getGoogleServices(userId);
    const duplicates = await calendar.events.list({ calendarId: "primary", timeMin: action.start, timeMax: action.end, singleEvents: true, q: action.summary, maxResults: 10 });
    const duplicate = (duplicates.data.items ?? []).some((event) => event.summary?.toLowerCase() === action.summary.toLowerCase() && event.start?.dateTime && Date.parse(event.start.dateTime) === Date.parse(action.start));
    if (duplicate) return { message: "That calendar event already exists, so I did not create a duplicate." };
    const created = await calendar.events.insert({
      calendarId: "primary",
      requestBody: { summary: action.summary, description: action.description, start: { dateTime: action.start, timeZone: process.env.APP_TIMEZONE || "Australia/Darwin" }, end: { dateTime: action.end, timeZone: process.env.APP_TIMEZONE || "Australia/Darwin" }, extendedProperties: { private: { secretarySource: "ASSISTANT", secretaryCategory: action.category } } },
    });
    await audit({ userId, action: "CALENDAR_EVENT_CREATED", source: "AssistantConfirmed", sourceRef: created.data.id, newState: created.data, result: "SUCCESS" });
    await activity({ userId, type: "ASSISTANT", summary: `Zoro created calendar event: ${action.summary}`, details: { eventId: created.data.id } });
    return { message: `Created "${action.summary}" in Google Calendar.` };
  }

  if (action.type === "CREATE_REMINDER") {
    const reminder = await db.reminder.create({ data: { userId, title: action.title, remindAt: new Date(action.remindAt), status: "OPEN", source: "Assistant", ringSeconds: action.ringSeconds, recurrence: action.recurrence, recurrenceTime: action.recurrenceTime, timezone: action.timezone } });
    const [subscriptions, settings] = await Promise.all([db.pushSubscription.count({ where: { userId } }), loadNotificationSettings(userId)]);
    await audit({ userId, action: action.mode === "ALARM" ? "ALARM_CREATED" : "REMINDER_CREATED", source: "AssistantConfirmed", sourceRef: reminder.id, newState: reminder, result: "SUCCESS" });
    await activity({ userId, type: "REMINDER", summary: `${action.mode === "ALARM" ? "Alarm" : "Reminder"} created: ${reminder.title}`, details: { reminderId: reminder.id, remindAt: reminder.remindAt } });
    const delivery = settings.masterEnabled && settings.pushEnabled && subscriptions > 0 ? " Background push is enabled." : " It will ring while Zoro is open; enable Notifications for background alerts.";
    return { message: `Created ${action.mode.toLowerCase()} "${action.title}" for ${formatZoroDateTime(action.remindAt,action.timezone)} (${action.timezone}).${delivery}` };
  }

  if (action.type === "UPDATE_REMINDER") {
    const existing = await db.reminder.findFirst({ where: { id: action.reminderId, userId } });
    if (!existing) return { message: "That reminder no longer exists. Nothing was changed." };

    const reminder = await db.reminder.update({
      where: { id: existing.id },
      data: {
        remindAt: new Date(action.remindAt),
        recurrence: action.recurrence,
        recurrenceTime: action.recurrence === "DAILY" ? action.recurrenceTime : null,
        timezone: action.timezone,
        ringSeconds: action.ringSeconds,
        status: "OPEN",
        snoozedUntil: null,
        completedAt: null,
      },
    });

    await audit({
      userId,
      action: "REMINDER_UPDATED",
      source: "AssistantConfirmed",
      sourceRef: reminder.id,
      previousState: existing,
      newState: reminder,
      result: "SUCCESS",
    });
    await activity({
      userId,
      type: "REMINDER",
      summary: `Reminder updated: ${reminder.title}`,
      details: { reminderId: reminder.id, remindAt: reminder.remindAt, recurrence: reminder.recurrence },
    });

    return {
      message: `Updated "${reminder.title}" to ${formatZoroDateTime(reminder.remindAt, action.timezone)}${action.recurrence === "DAILY" ? " · daily" : ""}.`,
    };
  }

  if (action.type === "CREATE_EMAIL_DRAFT" || action.type === "SEND_EMAIL") {
    const { gmail } = await getGoogleServices(userId);
    const raw = encodeRawEmail(action);
    if (action.type === "CREATE_EMAIL_DRAFT") {
      const draft = await gmail.users.drafts.create({ userId: "me", requestBody: { message: { raw } } });
      await db.emailAction.create({ data: { userId, actionType: "DRAFT_CREATED", status: "SAVED", draftId: draft.data.id ?? undefined, payload: { to: action.to, subject: action.subject } } });
      await audit({ userId, action: "EMAIL_DRAFT_CREATED", source: "AssistantConfirmed", sourceRef: draft.data.id, newState: { to: action.to, subject: action.subject }, result: "SUCCESS" });
      await activity({ userId, type: "EMAIL", summary: `Zoro created email draft: ${action.subject}`, details: { draftId: draft.data.id, to: action.to } });
      return { message: `Drafted the email to ${action.to}. Nothing was sent.` };
    }
    const sent = await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
    await db.emailAction.create({ data: { userId, gmailMessageId: sent.data.id ?? undefined, actionType: "EMAIL_SENT", status: "SENT", payload: { to: action.to, subject: action.subject } } });
    await audit({ userId, action: "EMAIL_SENT", source: "AssistantConfirmed", sourceRef: sent.data.id, newState: { to: action.to, subject: action.subject }, result: "SUCCESS" });
    await activity({ userId, type: "EMAIL", summary: `Zoro sent email: ${action.subject}`, details: { messageId: sent.data.id, to: action.to } });
    return { message: `Sent the email to ${action.to}.` };
  }

  const task = await db.task.create({ data: { userId, title: action.title, category: action.category, priority: action.priority, dueAt: action.dueAt ? new Date(action.dueAt) : undefined, source: "Assistant", nextAction: action.nextAction } });
  await audit({ userId, action: "TASK_CREATED", source: "AssistantConfirmed", sourceRef: task.id, newState: task, result: "SUCCESS" });
  await activity({ userId, type: "ASSISTANT", summary: `Zoro created task: ${task.title}`, details: { taskId: task.id } });
  return { message: `Created task "${task.title}".` };
}

async function gmailSummary(userId: string) {
  const scan = await scanGmail(userId);
  const recent = await db.emailIntelligence.findMany({ where: { userId, importance: { in: ["URGENT", "HIGH"] } }, orderBy: { processedAt: "desc" }, take: 5 });
  const lines = recent.map((email) => `• ${email.importance}: ${email.subject || "No subject"}${email.sender ? " — " + email.sender : ""}`);
  const summary = lines.length ? `\n\nNeeds attention:\n${lines.join("\n")}` : "\n\nNo urgent or high-priority email is currently stored.";
  return { message: `Gmail checked. ${scan.processed} new message${scan.processed === 1 ? "" : "s"} processed, ${scan.actionItems.length} action item${scan.actionItems.length === 1 ? "" : "s"} detected, and ${scan.pushed} push alert${scan.pushed === 1 ? "" : "s"} delivered.${summary}` };
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
    const history: AssistantHistoryMessage[] = body.history || [];

    if (/^(confirm|confirmed|approve|approved|yes|yes please|do it|go ahead)[.!\s]*$/i.test(understood)) {
      const action = await consumeLatestConfirmation(session.user.id);
      if (action) return NextResponse.json({ ...await executeAction(session.user.id, action), engine: "action" });
    }

    if (/^(cancel|cancel it|no|never mind|nevermind|stop)[.!\s]*$/i.test(understood)) {
      const cleared = await db.setting.deleteMany({ where: { userId: session.user.id, key: "assistant_pending_action" } });
      if (cleared.count) return NextResponse.json({ message: "Cancelled. I did not change anything.", engine: "action" });
    }

    await db.setting.deleteMany({ where: { userId: session.user.id, key: "assistant_pending_action" } });

    if (isGmailScanIntent(message)) {
      const result = await gmailSummary(session.user.id);
      return NextResponse.json({ message: result.message, engine: "tool", tool: "gmail", suggestedPrompts: ["Which email should I handle first?", "Draft an email reply", "What should I do now?"] });
    }

    if (isReminderListIntent(message)) {
      const reminders = await db.reminder.findMany({ where: { userId: session.user.id, status: { in: ["OPEN", "FIRED"] } }, orderBy: { remindAt: "asc" }, take: 10 });
      const text = reminders.length ? reminders.map((item) => `• ${item.title} — ${formatZoroDateTime(item.snoozedUntil || item.remindAt,item.timezone || undefined)}${item.recurrence === "DAILY" ? " · daily" : ""}`).join("\n") : "You have no open reminders or alarms.";
      return NextResponse.json({ message: text, engine: "tool", tool: "reminders" });
    }

    if (/^(please )?(sync|add|check|update|refresh)\s+(my |the )?(myob )?roster[.!?]*$/i.test(understood)) {
      return NextResponse.json({ message: "I can reconcile your latest MYOB roster with Google Calendar. Review the action first.", ...await prepareConfirmation(session.user.id, { type: "SYNC_MYOB_ROSTER" }), engine: "tool", tool: "roster" });
    }

    const reminderUpdate = await reminderUpdateResolution(session.user.id, message, history);
    if (reminderUpdate?.choices?.length) {
      return NextResponse.json({
        message: reminderUpdate.message || "Choose an option.",
        choices: reminderUpdate.choices,
        engine: "tool",
        tool: "reminders",
      });
    }
    if (reminderUpdate?.message && !reminderUpdate.action) {
      return NextResponse.json({ message: reminderUpdate.message, engine: "tool", tool: "reminders" });
    }
    if (reminderUpdate?.action) {
      if (reminderUpdate.confirmed) {
        return NextResponse.json({
          ...await executeAction(session.user.id, reminderUpdate.action),
          engine: "action",
          tool: "update_reminder",
        });
      }
      return NextResponse.json({
        message: `Ready to update "${reminderUpdate.action.title}".`,
        ...await prepareConfirmation(session.user.id, reminderUpdate.action),
        engine: "tool",
        tool: "update_reminder",
      });
    }

    const action = emailPreview(message) || reminderPreview(message) || taskPreview(message) || eventPreview(message);
    if (action) {
      const label = action.type === "SEND_EMAIL" ? "send this email" : action.type === "CREATE_EMAIL_DRAFT" ? "create this Gmail draft" : action.type === "CREATE_REMINDER" ? `create this ${action.mode.toLowerCase()}` : action.type === "CREATE_CALENDAR_EVENT" ? "schedule this event" : "create this task";
      return NextResponse.json({ message: `I’m ready to ${label}. Review the details and confirm.`, ...await prepareConfirmation(session.user.id, action), engine: "tool", tool: action.type.toLowerCase() });
    }

    const context = await buildAssistantContext(session.user.id);
    const localAnswer = answerWithLocalIntelligence(message, context, history);
    let cloud: null | Awaited<ReturnType<typeof answerWithOpenAI>> = null;
    if (openAIConfigured()) {
      try { cloud = await answerWithOpenAI(message, context, history); }
      catch (error) { console.warn("OpenAI provider unavailable; using deterministic fallback.", error instanceof Error ? error.message : "unknown"); }
    }

    return NextResponse.json({
      message: cloud?.text || localAnswer,
      engine: cloud ? "openai" : "local",
      model: cloud?.model,
      suggestedPrompts: ["Check my urgent emails", "Plan my day around my calendar", "Show my reminders", "What should I do now and why?"],
    });
  } catch (error) {
    console.error("Assistant request failed", error);
    return NextResponse.json({ error: "I couldn't complete that request. Check your connection and try again. If an action was being confirmed, check the relevant tool before preparing it again." }, { status: 500 });
  }
}
