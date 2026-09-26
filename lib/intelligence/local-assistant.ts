import type { AssistantContext } from "@/lib/intelligence/context-builder";
import { dayKey, planDay } from "./day-planner";

export type AssistantHistoryMessage = {
  role: "user" | "assistant";
  text: string;
};

type Intent =
  | "GREETING"
  | "THANKS"
  | "CAPABILITIES"
  | "PLAN"
  | "BRIEFING"
  | "PRIORITIES"
  | "EMAIL"
  | "DEADLINES"
  | "FOLLOWUPS"
  | "CALENDAR"
  | "SECURITY"
  | "EXPLAIN_PRIORITY"
  | "GENERAL";

export function normalizeAssistantInput(text: string) {
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\b(tomm?orow|tomorow)\b/g, "tomorrow")
    .replace(/\b(calender|calandar)\b/g, "calendar")
    .replace(/\b(schedual|shedule)\b/g, "schedule")
    .replace(/\b(emial|emaill|e-mail)\b/g, "email")
    .replace(/\b(mails)\b/g, "emails")
    .replace(/\b(appoinment|appointement)\b/g, "appointment")
    .replace(/\b(roaster)\b/g, "roster")
    .replace(/\b(rember|remeber)\b/g, "remember")
    .replace(/\b(whats)\b/g, "what's")
    .replace(/\b(ive)\b/g, "i've")
    .replace(/\b(dont)\b/g, "don't")
    .replace(/\b(cant)\b/g, "can't")
    .replace(/\b(uh+|um+|erm+|hmm+)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(text: string) {
  return normalizeAssistantInput(text);
}

function baseIntent(message: string): Intent {
  const text = normalize(message);

  if (/^(hey|hi|hello|hello zoro|hey zoro|good morning|good afternoon|good evening|morning|afternoon|evening|how are you|are you there)[.!? ]*$/.test(text)) return "GREETING";
  if (/^(thanks|thank you|cheers|got it|okay thanks|ok thanks)[.!? ]*$/.test(text)) return "THANKS";

  if (/\b(plan (my |the )?(day|today|tomorrow)|make (me )?a plan|time ?block|fit .* in|find .*time|find .*\d+.*(minutes?|hours?)|when .*\d+.*(minutes?|hours?))\b/.test(text)) return "PLAN";
  if (/\b(what should i do|what do i need to do|what i do|what do i do|tell me what to do|what next|next thing|priorities|focus on|important today)\b/.test(text)) return "PRIORITIES";

  if (
    /\b(what can you do|what can do for me|what do you do|how can you help|how you help me|what are your capabilities|what are your features|what can i ask you)\b/.test(text)
  ) return "CAPABILITIES";

  if (/\b(why (is|are|was|were)? ?(this|that|it|the first|the second|the third)?.*(urgent|important|priority)|why this|why that|explain (this|that|the priority))\b/.test(text)) {
    return "EXPLAIN_PRIORITY";
  }

  if (/\b(security|sign[- ]?in|suspicious|password|account alert)\b/.test(text)) return "SECURITY";
  if (/\b(deadline|deadlines|due|overdue|when.*due|expires?|expiry)\b/.test(text)) return "DEADLINES";
  if (/\b(waiting|follow[- ]?up|pending|response|reply from|heard back)\b/.test(text)) return "FOLLOWUPS";
  if (/\b(email|emails|mail|gmail|inbox|message|messages)\b/.test(text)) return "EMAIL";

  if (
    /\b(calendar|schedule|appointment|appointments|meeting|meetings|shift|shifts|free|available|busy|tomorrow|today|this evening|tonight|this morning|this afternoon)\b/.test(text)
  ) return "CALENDAR";

  if (
    /\b(what should i do|what do i need to do|what to do|priorities|priority|focus on|next action|what should i focus on|what's most important|whats most important)\b/.test(text)
  ) return "PRIORITIES";

  if (
    /\b(what'?s new|brief me|briefing|update me|anything important|anything for me|got anything for me|what have you got for me|what you got for me|what's up|what should i know|give me an update|tell me what's happening|how does my day look)\b/.test(text)
  ) return "BRIEFING";

  return "GENERAL";
}

function inferIntent(message: string, history: AssistantHistoryMessage[]): Intent {
  const direct = baseIntent(message);
  const text = normalize(message);
  const dayOnly = /^(and |what about |how about )?(today|tomorrow|tonight)[?.!]*$/.test(text);
  if (direct !== "GENERAL" && !dayOnly) return direct;
  const looksLikeFollowUp =
    text.length < 80 &&
    /^(and |what about|how about|why|when|which|the first|the second|the third|first|second|third|tomorrow|today|tonight|then|that|it)/.test(text);

  if (!looksLikeFollowUp) return direct;

  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role !== "user") continue;
    const previous = baseIntent(history[i].text);
    if (previous !== "GENERAL") return previous;
  }

  return direct;
}

function formatWhen(value: string | Date | null | undefined, timezone: string) {
  if (!value) return "time not specified";
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-AU", {
    timeZone: timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function dateKey(value: string | Date | null | undefined, timezone: string) {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : null;
}

function targetDay(message: string, now: Date, timezone: string) {
  const text = normalize(message);
  if (/\btomorrow\b/.test(text)) {
    return dateKey(new Date(now.getTime() + 86_400_000), timezone);
  }
  if (/\b(today|tonight|this morning|this afternoon|this evening)\b/.test(text)) {
    return dateKey(now, timezone);
  }
  return null;
}

function groupedEmailActions(context: AssistantContext) {
  const map = new Map<string, {
    item: AssistantContext["emailActions"][number];
    count: number;
  }>();

  for (const item of context.emailActions) {
    const key = (item.subject || "email")
      .toLowerCase()
      .replace(/^(re|fw|fwd):\s*/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const existing = map.get(key);
    if (existing) existing.count += 1;
    else map.set(key, { item, count: 1 });
  }

  return [...map.values()];
}


function greetingAnswer(context: AssistantContext) {
  const hour = Number(new Intl.DateTimeFormat("en-AU", {
    timeZone: context.timezone,
    hour: "2-digit",
    hour12: false,
  }).format(new Date(context.generatedAt)));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const first = context.topPriorities[0];
  if (first) return greeting + ". I’m here. Your current top priority is " + first.title + ". " + (first.nextAction || first.reason);
  const next = context.calendarEvents[0];
  if (next) return greeting + ". I’m here. Your next calendar item is " + next.title + " at " + formatWhen(next.start, context.timezone) + ".";
  return greeting + ". I’m here and ready. Nothing urgent is showing in the stored secretary data right now.";
}

function thanksAnswer() {
  return "You’re welcome. I’ll keep the context from this conversation, so you can continue naturally.";
}

function capabilitiesAnswer(context: AssistantContext) {
  const summary = context.summary;
  const current =
    summary.urgentCount || summary.dueSoonCount || summary.actionEmailCount
      ? `Right now I see ${summary.urgentCount} urgent, ${summary.dueSoonCount} due-soon, and ${summary.actionEmailCount} email action item${summary.actionEmailCount === 1 ? "" : "s"}.`
      : "Right now I do not see anything urgent in the stored data.";

  return [
    "I can act like a local Chief of Staff without sending your Gmail or Calendar content to an external AI model.",
    "",
    "I can currently:",
    "• scan Gmail and separate action, deadline, security, waiting and low-value messages",
    "• rank what deserves attention instead of repeating every alert",
    "• tell you what to do now, today, or next",
    "• show deadlines and explain why something is urgent",
    "• plan today or tomorrow with free-time windows and overlapping-event warnings",
    "• track waiting items and follow-ups",
    "• prepare tasks, calendar events and MYOB roster changes, then ask for confirmation before writing",
    "",
    current,
    "",
    'Useful examples: “What should I do now?”, “Am I free tomorrow?”, “Which emails need action?”, “What deadlines are coming?”, or “Why is the second item urgent?”',
  ].join("\n");
}

function priorityAnswer(context: AssistantContext) {
  if (!context.topPriorities.length) {
    const next = context.calendarEvents[0];
    return next
      ? `You have no stored action items right now. Your next calendar item is ${next.title} at ${formatWhen(next.start, context.timezone)}.`
      : context.calendarStatus === "available"
        ? "You have no stored action items or upcoming calendar events in the next 7 days."
        : "You have no stored action items. Calendar is unavailable or incomplete, so I cannot verify your next commitment.";
  }

  const now = new Date(context.generatedAt);
  const nextEvent = context.calendarEvents
    .filter((event) => event.start && new Date(event.start).getTime() > now.getTime())
    .sort((a, b) => new Date(a.start || 0).getTime() - new Date(b.start || 0).getTime())[0];

  const minutesUntilNext = nextEvent?.start
    ? Math.round((new Date(nextEvent.start).getTime() - now.getTime()) / 60_000)
    : null;

  const lead =
    nextEvent && minutesUntilNext !== null && minutesUntilNext > 0 && minutesUntilNext <= 90
      ? `You have about ${minutesUntilNext} minutes before ${nextEvent.title}. Use that block for the first item if it is quick; otherwise review it and schedule the work.`
      : "Best next move: start with the first item below.";

  return [
    lead,
    "",
    ...context.topPriorities.map((item, index) =>
      `${index + 1}. ${item.title} [${item.priority}]\n   ${item.nextAction || item.reason}${item.dueAt ? `\n   Due: ${formatWhen(item.dueAt, context.timezone)}` : ""}`
    ),
  ].join("\n");
}

function briefingAnswer(context: AssistantContext) {
  const groups = groupedEmailActions(context);
  const nextEvent = context.calendarEvents[0];

  const lines = [
    "Here is your current briefing:",
    "",
    `• Urgent: ${context.summary.urgentCount}`,
    `• Due within 72 hours: ${context.summary.dueSoonCount}`,
    `• Email actions: ${context.summary.actionEmailCount}`,
    `• Waiting/follow-up: ${context.summary.waitingCount}`,
  ];

  if (context.topPriorities[0]) {
    lines.push("", `Top action: ${context.topPriorities[0].title}`, `Next step: ${context.topPriorities[0].nextAction || context.topPriorities[0].reason}`);
  }

  if (nextEvent) {
    lines.push("", `Next calendar item: ${nextEvent.title} — ${formatWhen(nextEvent.start, context.timezone)}`);
  }

  if (groups.length) {
    const repeated = groups.filter((group) => group.count > 1);
    if (repeated.length) {
      lines.push("", `I also collapsed ${repeated.length} repeated email alert group${repeated.length === 1 ? "" : "s"} so duplicates do not dominate your priorities.`);
    }
  }

  return lines.join("\n");
}

function emailAnswer(context: AssistantContext) {
  const groups = groupedEmailActions(context);
  if (!groups.length) return "No stored emails currently require action.";

  return [
    `I found ${context.emailActions.length} actionable email record${context.emailActions.length === 1 ? "" : "s"}, grouped into ${groups.length} issue${groups.length === 1 ? "" : "s"}:`,
    "",
    ...groups.slice(0, 7).map(({ item, count }, index) =>
      `${index + 1}. ${item.subject || "Email"} [${item.priority}]${count > 1 ? ` ×${count}` : ""}\n   ${item.recommendedAction || item.whyItMatters || "Review it."}${item.deadlineAt ? `\n   Deadline: ${formatWhen(item.deadlineAt, context.timezone)}` : ""}`
    ),
  ].join("\n");
}

function deadlineAnswer(context: AssistantContext) {
  if (!context.deadlines.length) return "I do not have any stored deadlines requiring attention.";

  return [
    "Upcoming deadlines:",
    "",
    ...context.deadlines.slice(0, 7).map((item, index) =>
      `${index + 1}. ${item.title}\n   ${formatWhen(item.dueAt, context.timezone)} — ${item.nextAction || item.reason}`
    ),
  ].join("\n");
}

function followupAnswer(context: AssistantContext) {
  if (!context.followups.length) return "I do not have any open follow-ups stored.";

  return [
    "Waiting / follow-up:",
    "",
    ...context.followups.slice(0, 7).map((item, index) =>
      `${index + 1}. ${item.subject}\n   ${item.personCompany || item.expectedResponse || "Waiting for an update"}${item.nextFollowupAt ? `\n   Follow up: ${formatWhen(item.nextFollowupAt, context.timezone)}` : ""}`
    ),
  ].join("\n");
}

function planningAnswer(message: string, context: AssistantContext, includePriorities: boolean) {
  if (/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|next month)\b|\d{4}-\d{2}-\d{2}/i.test(message)) {
    return "I can currently plan today or tomorrow. Which of those days would you like?";
  }
  if (context.calendarStatus !== "available") {
    return "I cannot reliably check free time because Google Calendar is " +
      (context.calendarStatus === "partial" ? "only partially loaded." : "unavailable. Check your Google connection and try again.") +
      (includePriorities ? "\n\n" + priorityAnswer(context) : "");
  }
  const now = new Date(context.generatedAt);
  const day = targetDay(message, now, context.timezone) || dayKey(now, context.timezone);
  const duration = message.match(/(\d+)\s*(minutes?|mins?|hours?|hrs?)\b/i);
  const minutes = duration ? Number(duration[1]) * (/^(hour|hr)/i.test(duration[2]) ? 60 : 1) : 30;
  if (minutes < 1 || minutes > 540) return "Choose a focus block between 1 minute and 9 hours.";
  const plan = planDay(context.calendarEvents, day, context.timezone, now, minutes);
  const when = (value: number) => formatWhen(new Date(value), context.timezone);
  const lines = ["Plan for " + day + " (" + context.timezone + "):", ""];
  if (plan.incomplete) lines.push("Some events have missing or invalid times; I cannot reliably suggest free time.");
  lines.push(...plan.commitments.map(e => "• " + e.title + " — " + when(e.from) + " to " + when(e.to)));
  if (!plan.commitments.length) lines.push("No busy events found for this day.");
  if (plan.conflicts.length) lines.push("", "Conflicts to resolve:", ...plan.conflicts.map(c => "• " + c));
  if (!plan.incomplete) {
    lines.push("", "Available windows of at least " + minutes + " minutes (09:00–18:00):");
    lines.push(...plan.slots.map(s => "• " + when(s.start) + " to " + when(s.end) + " (" + Math.floor((s.end - s.start) / 60_000) + " minutes)"));
    if (!plan.slots.length) lines.push("No matching window remains in these planning hours.");
  }
  if (includePriorities && context.topPriorities.length) {
    lines.push("", "Suggested focus order (durations are not known):");
    lines.push(...context.topPriorities.map((p, i) => (i + 1) + ". " + p.title + " — " + (p.nextAction || p.reason)));
    if (plan.slots[0]) lines.push("Start with a " + minutes + "-minute review of the first item at " + when(plan.slots[0].start) + ".");
  }
  lines.push("", "Suggestions only; nothing has been scheduled. Availability reflects busy events on your primary Google Calendar.");
  return lines.join("\n");
}

function calendarAnswer(message: string, context: AssistantContext) {
  if (/\b(free|available|busy|time available)\b/i.test(message)) return planningAnswer(message, context, false);
  if (context.calendarStatus !== "available") return "Google Calendar is unavailable or incomplete. I cannot reliably report your schedule; check your connection and try again.";
  const now = new Date(context.generatedAt);
  const requestedDay = targetDay(message, now, context.timezone);
  const events = requestedDay
    ? planDay(context.calendarEvents, requestedDay, context.timezone, now).commitments
    : context.calendarEvents;
  if (!events.length) return requestedDay ? "No busy Calendar events found for that day." : "No busy Calendar events found in the next 7 days.";
  return [requestedDay ? "Your schedule for that day:" : "Your next calendar items:", "",
    ...events.slice(0, 12).map((e, i) => (i + 1) + ". " + e.title + " — " + formatWhen(e.start, context.timezone)),
  ].join("\n");
}

function securityAnswer(context: AssistantContext) {
  const groups = groupedEmailActions(context).filter(({ item }) => item.classification === "SECURITY");
  if (!groups.length) return "I do not have any stored security-alert emails requiring attention.";

  return [
    `I found ${groups.length} distinct security alert type${groups.length === 1 ? "" : "s"}:`,
    "",
    ...groups.slice(0, 6).map(({ item, count }, index) =>
      `${index + 1}. ${item.subject || "Security alert"}${count > 1 ? ` ×${count}` : ""}\n   ${item.recommendedAction || "Review the event directly in the relevant account."}`
    ),
    "",
    "Repeated alerts are grouped so the same subject does not occupy every priority slot.",
  ].join("\n");
}

function priorityFromMessage(message: string, context: AssistantContext) {
  const text = normalize(message);
  const index =
    /\b(second|2nd|number 2|#2)\b/.test(text) ? 1 :
    /\b(third|3rd|number 3|#3)\b/.test(text) ? 2 :
    0;

  const item = context.topPriorities[index];
  if (!item) return "I do not have that priority item in the current Top 3.";

  const parts = [
    `${item.title} is ranked ${item.priority}.`,
    item.reason,
  ];

  if (item.dueAt) parts.push(`Its current due time is ${formatWhen(item.dueAt, context.timezone)}.`);
  if (item.nextAction) parts.push(`Recommended next step: ${item.nextAction}`);

  return parts.join(" ");
}

export function isOpenEndedConversation(message: string, history: AssistantHistoryMessage[] = []) {
  return inferIntent(message, history) === "GENERAL";
}

export function answerWithLocalIntelligence(
  message: string,
  context: AssistantContext,
  history: AssistantHistoryMessage[] = []
) {
  const intent = inferIntent(message, history);
  if (intent === "PLAN" && /^(and |what about |how about )?(today|tomorrow|tonight)[?.!]*$/i.test(message.trim())) {
    const previous = [...history].reverse().find(item => item.role === "user" && baseIntent(item.text) === "PLAN");
    const duration = previous?.text.match(/\d+\s*(minutes?|mins?|hours?|hrs?)\b/i)?.[0];
    if (duration) message += " " + duration;
  }

  switch (intent) {
    case "GREETING":
      return greetingAnswer(context);
    case "THANKS":
      return thanksAnswer();
    case "PLAN":
      return planningAnswer(message, context, true);
    case "CAPABILITIES":
      return capabilitiesAnswer(context);
    case "BRIEFING":
      return briefingAnswer(context);
    case "PRIORITIES":
      return priorityAnswer(context);
    case "EMAIL":
      return emailAnswer(context);
    case "DEADLINES":
      return deadlineAnswer(context);
    case "FOLLOWUPS":
      return followupAnswer(context);
    case "CALENDAR":
      return calendarAnswer(message, context);
    case "SECURITY":
      return securityAnswer(context);
    case "EXPLAIN_PRIORITY":
      return priorityFromMessage(message, context);
    default:
      return [
        "I understand the request, but the local secretary engine does not have a reliable specialised answer for it yet.",
        "",
        "You can speak naturally. I can use the conversation to follow references like “that”, “tomorrow”, “the second one”, and “what about this?”.",
        "",
        "For personal operations I understand priorities, Gmail, deadlines, Calendar, follow-ups, tasks, roster sync and why something matters.",
      ].join("\n");
  }
}
