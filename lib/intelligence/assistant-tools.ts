import * as chrono from "chrono-node";
import type { PendingAction } from "@/lib/intelligence/assistant-contract";
import { normalizeAssistantInput } from "@/lib/intelligence/local-assistant";

type ReminderAction = Extract<PendingAction, { type: "CREATE_REMINDER" }>;
type EmailAction = Extract<PendingAction, { type: "CREATE_EMAIL_DRAFT" | "SEND_EMAIL" }>;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function parseAssistantDate(text: string, now = new Date()) {
  const result = chrono.parse(text, now, { forwardDate: true })[0];
  if (!result) return null;
  const c = result.start;
  const year = c.get("year") ?? now.getFullYear();
  const month = c.get("month") ?? now.getMonth() + 1;
  const day = c.get("day") ?? now.getDate();
  const hour = c.get("hour") ?? 9;
  const minute = c.get("minute") ?? 0;
  const date = new Date(`${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00+09:30`);
  return { date, matchedText: result.text, hour, minute };
}

function cleanTitle(value: string) {
  const title = value
    .replace(/\b(every day|everyday|daily)\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/^[,.:;\-\s]+|[,.:;\-\s]+$/g, "")
    .trim();
  return title ? title.charAt(0).toUpperCase() + title.slice(1) : "";
}

export function reminderPreview(message: string): ReminderAction | null {
  const understood = normalizeAssistantInput(message);
  const alarm = /\b(set\s+(?:an?\s+)?alarm|alarm me|wake me|alarm)\b/i.test(understood);
  const reminder = /\b(remind me|remember me|set\s+(?:a\s+)?reminder|reminder)\b/i.test(understood);
  if (!alarm && !reminder) return null;
  const parsed = parseAssistantDate(understood);
  if (!parsed) return null;
  const recurrence = /\b(every day|everyday|daily)\b/i.test(understood) ? "DAILY" : "NONE";
  let title = understood
    .replace(/^(please\s+)?(remind me(?: to)?|remember me(?: to)?|set\s+(?:a\s+)?reminder(?: to)?|set\s+(?:an?\s+)?alarm(?: for| to)?|alarm me(?: to)?|wake me(?: up)?(?: to)?|alarm)\s*/i, "")
    .replace(parsed.matchedText, "");
  title = cleanTitle(title);
  if (!title) title = alarm ? "Alarm" : "Reminder";
  return {
    type: "CREATE_REMINDER",
    title,
    remindAt: parsed.date.toISOString(),
    mode: alarm ? "ALARM" : "REMINDER",
    recurrence,
    recurrenceTime: recurrence === "DAILY" ? `${pad(parsed.hour)}:${pad(parsed.minute)}` : undefined,
    timezone: process.env.APP_TIMEZONE || "Australia/Darwin",
    ringSeconds: alarm ? 10 : 3,
  };
}

function parseLabel(text: string, label: string) {
  const pattern = new RegExp(
    "\\b" + label + "\\s*(?:is|:|-)\\s*(.+?)(?=\\s+\\b(?:subject|message|body|saying)\\b\\s*(?:is|:|-)|$)",
    "i",
  );
  return pattern.exec(text)?.[1]?.trim() || "";
}

export function emailPreview(message: string): EmailAction | null {
  const understood = normalizeAssistantInput(message);
  if (!/\b(email|e-mail|mail|draft|send)\b/i.test(understood)) return null;
  const addressMatch = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.exec(message);
  if (!addressMatch) return null;

  const wantsDraft = /\b(draft|prepare|write)\b/i.test(understood) && !/\bsend\b/i.test(understood);
  const type: EmailAction["type"] = wantsDraft ? "CREATE_EMAIL_DRAFT" : "SEND_EMAIL";
  let subject = parseLabel(message, "subject");
  let body = parseLabel(message, "message") || parseLabel(message, "body");

  if (!body) {
    const afterAddress = message.slice((addressMatch.index || 0) + addressMatch[0].length);
    body = afterAddress
      .replace(/^\s*[,.:;\-]*\s*(?:saying|that|with the message|message|body)?\s*[:\-]?\s*/i, "")
      .trim();
    body = body.replace(/\bsubject\s*(?:is|:|-)\s*.+$/i, "").trim();
  }

  if (!body) return null;
  if (!subject) {
    const sentence = body.split(/[.!?\n]/)[0]?.trim() || "";
    subject = sentence.length >= 4 && sentence.length <= 70 ? sentence : "Quick note";
  }

  return { type, to: addressMatch[0], subject: subject.slice(0, 300), message: body.slice(0, 50000) };
}

export function isGmailScanIntent(message: string) {
  const understood = normalizeAssistantInput(message);
  return /\b(check|scan|refresh|look at|show|see|review|read)\b.*\b(email|emails|mail|gmail|inbox|messages)\b/i.test(understood)
    || /\b(urgent|important)\b.*\b(email|emails|mail|gmail|inbox)\b/i.test(understood);
}

export function isReminderListIntent(message: string) {
  const understood = normalizeAssistantInput(message);
  return /^(what|which|show|list|check|do i have|any).*(reminders?|alarms?)/i.test(understood)
    && !/\b(set|create|add|remind|alarm me|wake me)\b/i.test(understood);
}
