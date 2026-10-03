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
import { APP_TIMEZONE, formatZoroDateTime, zonedDateTime, zonedParts } from "@/lib/time";
import {
  createAssistantNote,
  deleteAssistantNote,
  isNoteListIntent,
  loadAssistantNotes,
  noteCreatePreview,
  noteMatchScore,
  noteSearchTerms,
} from "@/lib/intelligence/assistant-notes";
import { answerPatro, isPatroIntent } from "@/lib/intelligence/patro-assistant";

export const maxDuration = 60;

type CalendarPendingAction = Extract<PendingAction, { type: "CREATE_CALENDAR_EVENT" }>;
type TaskPendingAction = Extract<PendingAction, { type: "CREATE_TASK" }>;
type UpdateReminderPendingAction = Extract<PendingAction, { type: "UPDATE_REMINDER" }>;
type DeleteReminderPendingAction = Extract<PendingAction, { type: "DELETE_REMINDER" }>;
type DeleteNotePendingAction = Extract<PendingAction, { type: "DELETE_NOTE" }>;
type AssistantChoice = { label: string; value: string };

function contextualRequest(
  message: string,
  history: AssistantHistoryMessage[],
  anchor: RegExp,
) {
  const current = normalizeAssistantInput(message);
  if (anchor.test(current)) return message;
  if (current.split(/\s+/).filter(Boolean).length > 16) return message;
  const previous = [...history].reverse().find((item) =>
    item.role === "user" && anchor.test(normalizeAssistantInput(item.text))
  );
  return previous ? previous.text + " " + message : message;
}

function isTaskListIntent(message: string) {
  const understood = normalizeAssistantInput(message);
  return /\b(show|list|check|what|which|any|open)\b.*\b(tasks?|to-?dos?)\b/i.test(understood)
    && !/\b(create|add|make|complete|delete|remove)\b/i.test(understood);
}

function isCalendarAgendaIntent(message: string) {
  const understood = normalizeAssistantInput(message);
  return (
    /\b(what(?:'s| is)?|show|list|check|tell me|do i have)\b.*\b(calendar|schedule|agenda|events?)\b/i.test(understood)
    || /\b(calendar|schedule|agenda)\b.*\b(today|tomorrow|this morning|this afternoon|tonight)\b/i.test(understood)
  ) && !/\b(add|create|schedule|book|set|put|move|delete|remove)\b/i.test(understood);
}

function eventPreview(message: string): CalendarPendingAction | null {
  const understood = normalizeAssistantInput(message);
  if (/\b(remind me|remember me|reminder|alarm|create task|add task|make a task|i have to|i need to|note that i need to)\b/i.test(understood)) return null;
  if (/^(what|when|where|which|am i|do i|have i|show|tell me).*[?]?$/i.test(understood) && !/\b(add|schedule|book|create|put|set)\b/i.test(understood)) return null;

  const hasActionVerb = /\b(add|schedule|book|create|put|set|block|i have|i've got|need an?)\b/i.test(understood);
  const hasEventWord = /\b(appointment|workout|meeting|event|gym|class|check-?up|dinner|lunch|call|interview)\b/i.test(understood);
  if (!hasActionVerb || !hasEventWord) return null;

  const parsed = parseAssistantDate(understood);
  if (!parsed) return null;

  const startDate = parsed.date;
  const lower = message.toLowerCase();
  const category = lower.includes("workout") || lower.includes("gym")
    ? "WORKOUT"
    : /(dentist|doctor|check-?up|appointment)/.test(lower)
      ? "APPOINTMENT"
      : "PERSONAL";

  let summary = message
    .replace(parsed.matchedText, "")
    .replace(/^(?:please\s+)?(?:add|schedule|book|create|put|set|block)\s+(?:an?\s+)?/i, "")
    .replace(/\b(?:to|in)\s+(?:my\s+)?calendar\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/^[,.:;\-\s]+|[,.:;\-\s]+$/g, "")
    .trim();

  if (!summary || /^(event|calendar event)$/i.test(summary)) {
    summary = category === "WORKOUT"
      ? "Workout"
      : lower.includes("dentist")
        ? "Dentist appointment"
        : /check-?up/.test(lower)
          ? "Health check-up"
          : lower.includes("appointment")
            ? "Appointment"
            : lower.includes("meeting")
              ? "Meeting"
              : "Personal event";
  }
  summary = summary.charAt(0).toUpperCase() + summary.slice(1);
  summary = summary.slice(0, 240);

  const durationMatch = /\bfor\s+(\d+)\s*(minutes?|mins?|hours?|hrs?)\b/i.exec(understood);
  let durationMinutes = category === "WORKOUT" ? 40 : 60;
  if (durationMatch) {
    const amount = Number(durationMatch[1]);
    durationMinutes = /hour|hr/i.test(durationMatch[2]) ? amount * 60 : amount;
    durationMinutes = Math.max(1, Math.min(durationMinutes, 24 * 60));
  }

  const endDate = new Date(startDate.getTime() + durationMinutes * 60_000);
  return {
    type: "CREATE_CALENDAR_EVENT",
    summary,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    category,
    description: "Created from Zoro Intelligence after confirmation.",
  };
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

async function reminderDeleteResolution(
  userId: string,
  message: string,
  history: AssistantHistoryMessage[],
): Promise<{ action?: DeleteReminderPendingAction; message?: string; choices?: AssistantChoice[] } | null> {
  const current = normalizeAssistantInput(message);
  const deleteIntent = /\b(delete|remove|cancel)\b.*\b(reminder|alarm)\b|\b(delete|remove)\s+it\b/i;
  const anchor = /\b(delete|remove|cancel)\b.*\b(reminder|alarm)\b/i;
  if (!deleteIntent.test(current) && !anchor.test(normalizeAssistantInput(contextualRequest(message, history, anchor)))) return null;

  const requestText = contextualRequest(message, history, anchor);
  const understood = normalizeAssistantInput(requestText);
  const reminders = await db.reminder.findMany({
    where: { userId, status: { in: ["OPEN", "FIRED"] } },
    orderBy: { remindAt: "asc" },
    take: 50,
  });
  if (!reminders.length) return { message: "You have no open reminders to delete." };

  const ranked = reminders
    .map((item) => ({ item, score: reminderMatchScore(understood, item.title) }))
    .sort((a, b) => b.score - a.score || a.item.remindAt.getTime() - b.item.remindAt.getTime());

  const selected = ranked[0]?.score ? ranked[0].item : reminders.length === 1 ? reminders[0] : null;
  if (!selected) {
    return {
      message: "Which reminder should I delete?",
      choices: reminders.slice(0, 6).map((item) => ({
        label: item.title,
        value: `Delete reminder "${item.title}"`,
      })),
    };
  }
  return { action: { type: "DELETE_REMINDER", reminderId: selected.id, title: selected.title } };
}

async function noteDeleteResolution(
  userId: string,
  message: string,
  history: AssistantHistoryMessage[],
): Promise<{ action?: DeleteNotePendingAction; message?: string; choices?: AssistantChoice[] } | null> {
  const current = normalizeAssistantInput(message);
  const anchor = /\b(delete|remove)\b.*\bnote\b/i;
  if (!anchor.test(current) && !/^delete it[.!\s]*$/i.test(current)) return null;

  const requestText = contextualRequest(message, history, anchor);
  const notes = await loadAssistantNotes(userId);
  if (!notes.length) return { message: "You do not have any saved notes." };

  const ranked = notes
    .map((item) => ({ item, score: noteMatchScore(item, requestText) }))
    .sort((a, b) => b.score - a.score);

  const selected = ranked[0]?.score ? ranked[0].item : notes.length === 1 ? notes[0] : null;
  if (!selected) {
    return {
      message: "Which note should I delete?",
      choices: notes.slice(0, 6).map((item) => ({
        label: item.title,
        value: `Delete note "${item.title}"`,
      })),
    };
  }

  return { action: { type: "DELETE_NOTE", noteId: selected.id, title: selected.title } };
}

async function calendarAgenda(userId: string, message: string) {
  const timeZone = APP_TIMEZONE;
  const target = parseAssistantDate(message, new Date(), timeZone)?.date || new Date();
  const p = zonedParts(target, timeZone);
  const start = zonedDateTime({ year: p.year, month: p.month, day: p.day, hour: 0, minute: 0, second: 0 }, timeZone);
  const probe = new Date(start.getTime() + 30 * 60 * 60_000);
  const next = zonedParts(probe, timeZone);
  const end = zonedDateTime({ year: next.year, month: next.month, day: next.day, hour: 0, minute: 0, second: 0 }, timeZone);

  const { calendar } = await getGoogleServices(userId);
  const result = await calendar.events.list({
    calendarId: "primary",
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 30,
  });

  const events = result.data.items || [];
  const dateLabel = new Intl.DateTimeFormat("en-AU", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(start);

  if (!events.length) return { message: `Your Google Calendar has no events on ${dateLabel}.` };

  const lines = events.map((event) => {
    const when = event.start?.dateTime
      ? new Intl.DateTimeFormat("en-AU", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(event.start.dateTime))
      : "All day";
    return `• ${when} — ${event.summary || "Untitled event"}`;
  });
  return { message: `Your calendar for ${dateLabel}:\n${lines.join("\n")}` };
}

async function enrichEmailRecipient(
  userId: string,
  requestText: string,
): Promise<{ text: string; message?: string; choices?: AssistantChoice[] }> {
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(requestText)) return { text: requestText };

  const understood = normalizeAssistantInput(requestText);
  const recipientMatch = /\b(?:send|write|draft|prepare)?\s*(?:an?\s+)?(?:email|mail)\s+(?:to\s+)?([a-z][a-z .'-]{1,50}?)(?=\s+(?:saying|that|about|subject|message|body|to say)\b|$)/i.exec(understood);
  const name = recipientMatch?.[1]?.trim().replace(/^(?:to\s+)/i, "") || "";

  if (!name || /^(?:an?|the|email|mail)$/i.test(name)) {
    return { text: requestText, message: "Who should I email? You can say a name or email address." };
  }

  const rows = await db.emailIntelligence.findMany({
    where: { userId, sender: { contains: name, mode: "insensitive" } },
    select: { sender: true },
    orderBy: { processedAt: "desc" },
    take: 20,
  });

  const addresses = [...new Set(rows.flatMap((row) => {
    const match = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.exec(row.sender || "");
    return match ? [match[0]] : [];
  }))];

  if (addresses.length === 1 && recipientMatch) {
    const rawName = requestText.slice(recipientMatch.index + recipientMatch[0].toLowerCase().indexOf(name), recipientMatch.index + recipientMatch[0].toLowerCase().indexOf(name) + name.length);
    const enriched = rawName
      ? requestText.replace(rawName, rawName + " <" + addresses[0] + ">")
      : requestText + " " + addresses[0];
    return { text: enriched };
  }

  if (addresses.length > 1) {
    return {
      text: requestText,
      message: `I found more than one email address for ${name}. Which one should I use?`,
      choices: addresses.slice(0, 5).map((address) => ({
        label: address,
        value: requestText.replace(name, address),
      })),
    };
  }

  return { text: requestText, message: `What email address should I use for ${name}?` };
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

  if (action.type === "DELETE_REMINDER") {
    const existing = await db.reminder.findFirst({ where: { id: action.reminderId, userId } });
    if (!existing) return { message: "That reminder no longer exists." };
    await db.reminder.delete({ where: { id: existing.id } });
    await audit({ userId, action: "REMINDER_DELETED", source: "AssistantConfirmed", sourceRef: existing.id, previousState: existing, result: "SUCCESS" });
    await activity({ userId, type: "REMINDER", summary: `Reminder deleted: ${existing.title}`, details: { reminderId: existing.id } });
    return { message: `Deleted reminder "${existing.title}".` };
  }

  if (action.type === "CREATE_NOTE") {
    const note = await createAssistantNote(userId, { title: action.title, content: action.content });
    await audit({ userId, action: "NOTE_CREATED", source: "AssistantConfirmed", sourceRef: note.id, newState: note, result: "SUCCESS" });
    await activity({ userId, type: "ASSISTANT", summary: `Note saved: ${note.title}`, details: { noteId: note.id } });
    return { message: `Saved note "${note.title}".` };
  }

  if (action.type === "DELETE_NOTE") {
    const note = await deleteAssistantNote(userId, action.noteId);
    if (!note) return { message: "That note no longer exists." };
    await audit({ userId, action: "NOTE_DELETED", source: "AssistantConfirmed", sourceRef: note.id, previousState: note, result: "SUCCESS" });
    await activity({ userId, type: "ASSISTANT", summary: `Note deleted: ${note.title}`, details: { noteId: note.id } });
    return { message: `Deleted note "${note.title}".` };
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
  const recent = await db.emailIntelligence.findMany({
    where: { userId },
    orderBy: [{ receivedAt: "desc" }, { processedAt: "desc" }],
    take: 8,
  });
  const lines = recent.map((email) => {
    const flag = email.requiresAction ? "ACTION" : email.importance === "URGENT" || email.importance === "HIGH" ? email.importance : "INFO";
    const sender = email.sender ? " — " + email.sender : "";
    const next = email.recommendedAction ? " · " + email.recommendedAction : "";
    return `• ${flag}: ${email.subject || "No subject"}${sender}${next}`;
  });
  const summary = lines.length ? `\n\nLatest email intelligence:\n${lines.join("\n")}` : "\n\nNo email intelligence is stored yet.";
  return {
    message: `Gmail checked. ${scan.processed} new message${scan.processed === 1 ? "" : "s"} processed and ${scan.actionItems.length} action item${scan.actionItems.length === 1 ? "" : "s"} detected.${summary}`,
  };
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

    if (isPatroIntent(message)) {
      return NextResponse.json({ message: answerPatro(message), engine: "tool", tool: "nepali_patro" });
    }

    if (isGmailScanIntent(message)) {
      const result = await gmailSummary(session.user.id);
      return NextResponse.json({ message: result.message, engine: "tool", tool: "gmail", suggestedPrompts: ["Which email should I handle first?", "Draft an email reply", "What should I do now?"] });
    }

    if (isReminderListIntent(message)) {
      const reminders = await db.reminder.findMany({ where: { userId: session.user.id, status: { in: ["OPEN", "FIRED"] } }, orderBy: { remindAt: "asc" }, take: 10 });
      const text = reminders.length ? reminders.map((item) => `• ${item.title} — ${formatZoroDateTime(item.snoozedUntil || item.remindAt,item.timezone || undefined)}${item.recurrence === "DAILY" ? " · daily" : ""}`).join("\n") : "You have no open reminders or alarms.";
      return NextResponse.json({ message: text, engine: "tool", tool: "reminders" });
    }

    if (isNoteListIntent(message)) {
      const allNotes = await loadAssistantNotes(session.user.id);
      const query = noteSearchTerms(message);
      const notes = query
        ? allNotes
            .map((item) => ({ item, score: noteMatchScore(item, query) }))
            .filter((row) => row.score > 0)
            .sort((a, b) => b.score - a.score)
            .map((row) => row.item)
        : allNotes;
      const text = notes.length
        ? notes.slice(0, 10).map((item) => `• ${item.title} — ${item.content.slice(0, 180)}${item.content.length > 180 ? "…" : ""}`).join("\n")
        : query ? `I couldn't find a saved note about "${query}".` : "You do not have any saved notes.";
      return NextResponse.json({ message: text, engine: "tool", tool: "notes" });
    }

    if (isTaskListIntent(message)) {
      const tasks = await db.task.findMany({
        where: { userId: session.user.id, status: { in: ["OPEN", "WAITING"] } },
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
        take: 12,
      });
      const text = tasks.length
        ? tasks.map((item) => `• ${item.priority}: ${item.title}${item.dueAt ? " — due " + formatZoroDateTime(item.dueAt, APP_TIMEZONE) : ""}`).join("\n")
        : "You have no open tasks.";
      return NextResponse.json({ message: text, engine: "tool", tool: "tasks" });
    }

    if (isCalendarAgendaIntent(message)) {
      return NextResponse.json({ ...await calendarAgenda(session.user.id, message), engine: "tool", tool: "calendar" });
    }

    if (/^(please )?(sync|add|check|update|refresh)\s+(my |the )?(myob )?roster[.!?]*$/i.test(understood)) {
      return NextResponse.json({ message: "I can reconcile your latest MYOB roster with Google Calendar. Review the action first.", ...await prepareConfirmation(session.user.id, { type: "SYNC_MYOB_ROSTER" }), engine: "tool", tool: "roster" });
    }

    const reminderDelete = await reminderDeleteResolution(session.user.id, message, history);
    if (reminderDelete?.choices?.length) {
      return NextResponse.json({ message: reminderDelete.message || "Choose a reminder.", choices: reminderDelete.choices, engine: "tool", tool: "delete_reminder" });
    }
    if (reminderDelete?.message && !reminderDelete.action) {
      return NextResponse.json({ message: reminderDelete.message, engine: "tool", tool: "delete_reminder" });
    }
    if (reminderDelete?.action) {
      return NextResponse.json({
        message: `Ready to delete reminder "${reminderDelete.action.title}".`,
        ...await prepareConfirmation(session.user.id, reminderDelete.action),
        engine: "tool",
        tool: "delete_reminder",
      });
    }

    const noteDelete = await noteDeleteResolution(session.user.id, message, history);
    if (noteDelete?.choices?.length) {
      return NextResponse.json({ message: noteDelete.message || "Choose a note.", choices: noteDelete.choices, engine: "tool", tool: "delete_note" });
    }
    if (noteDelete?.message && !noteDelete.action) {
      return NextResponse.json({ message: noteDelete.message, engine: "tool", tool: "delete_note" });
    }
    if (noteDelete?.action) {
      return NextResponse.json({
        message: `Ready to delete note "${noteDelete.action.title}".`,
        ...await prepareConfirmation(session.user.id, noteDelete.action),
        engine: "tool",
        tool: "delete_note",
      });
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

    const noteRequest = contextualRequest(message, history, /\b(?:take|make|create|save|write|add)\s+(?:a\s+)?note\b|\bnote\s+(?:down|this)\b/i);
    const notePreview = noteCreatePreview(noteRequest);
    if (notePreview?.needsContent) {
      return NextResponse.json({ message: "What should I save in the note?", engine: "tool", tool: "notes" });
    }
    if (notePreview && !notePreview.needsContent) {
      const action: PendingAction = { type: "CREATE_NOTE", title: notePreview.title, content: notePreview.content };
      return NextResponse.json({
        message: `Ready to save note "${notePreview.title}".`,
        ...await prepareConfirmation(session.user.id, action),
        engine: "tool",
        tool: "create_note",
      });
    }

    const emailAnchor = /\b(?:send|write|draft|prepare)\b.*\b(?:email|mail)\b|\b(?:email|mail)\b.*\bto\b/i;
    const emailRequest = contextualRequest(message, history, emailAnchor);
    let emailAction = emailPreview(emailRequest);
    if (!emailAction && emailAnchor.test(normalizeAssistantInput(emailRequest))) {
      const enriched = await enrichEmailRecipient(session.user.id, emailRequest);
      if (enriched.choices?.length) {
        return NextResponse.json({ message: enriched.message, choices: enriched.choices, engine: "tool", tool: "email" });
      }
      emailAction = emailPreview(enriched.text);
      if (!emailAction) {
        const hasAddress = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(enriched.text);
        return NextResponse.json({
          message: enriched.message || (hasAddress ? "What should the email say?" : "Who should I email?"),
          engine: "tool",
          tool: "email",
        });
      }
    }

    const reminderAnchor = /\b(remind me|remember me|set\s+(?:a\s+)?reminder|set\s+(?:an?\s+)?alarm|alarm me|wake me)\b/i;
    const reminderRequest = contextualRequest(message, history, reminderAnchor);
    const reminderAction = reminderPreview(reminderRequest);
    if (!reminderAction && reminderAnchor.test(normalizeAssistantInput(reminderRequest))) {
      return NextResponse.json({ message: "What time should I set it for?", engine: "tool", tool: "reminders" });
    }

    const eventAnchor = /\b(add|schedule|book|create|put|set|block)\b.*\b(appointment|workout|meeting|event|gym|class|check-?up|dinner|lunch|call|interview)\b/i;
    const eventRequest = contextualRequest(message, history, eventAnchor);
    const eventAction = eventPreview(eventRequest);
    if (!eventAction && eventAnchor.test(normalizeAssistantInput(eventRequest))) {
      return NextResponse.json({ message: "When should I schedule it?", engine: "tool", tool: "calendar" });
    }

    const taskRequest = contextualRequest(message, history, /\b(create task|add task|make a task|i have to|i need to|note that i need to)\b/i);
    const action = emailAction || reminderAction || taskPreview(taskRequest) || eventAction;
    if (action) {
      const label = action.type === "SEND_EMAIL"
        ? "send this email"
        : action.type === "CREATE_EMAIL_DRAFT"
          ? "create this Gmail draft"
          : action.type === "CREATE_REMINDER"
            ? `create this ${action.mode.toLowerCase()}`
            : action.type === "CREATE_CALENDAR_EVENT"
              ? "schedule this event"
              : "create this task";
      return NextResponse.json({
        message: `I’m ready to ${label}. Review the details and confirm.`,
        ...await prepareConfirmation(session.user.id, action),
        engine: "tool",
        tool: action.type.toLowerCase(),
      });
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
