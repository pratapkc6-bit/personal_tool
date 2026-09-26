import type { AssistantContext } from "@/lib/intelligence/context-builder";

export type AssistantHistoryMessage = {
  role: "user" | "assistant";
  text: string;
};

type Intent =
  | "CAPABILITIES"
  | "BRIEFING"
  | "PRIORITIES"
  | "EMAIL"
  | "DEADLINES"
  | "FOLLOWUPS"
  | "CALENDAR"
  | "SECURITY"
  | "EXPLAIN_PRIORITY"
  | "GENERAL";

function normalize(text: string) {
  return text.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
}

function baseIntent(message: string): Intent {
  const text = normalize(message);

  if (
    /\b(what can you do|what do you do|how can you help|what are your capabilities|what are your features|what can i ask you)\b/.test(text)
  ) return "CAPABILITIES";

  if (/\b(why (is|are|was|were)? ?(this|that|it|the first|the second|the third)?.*(urgent|important|priority)|why this|why that|explain (this|that|the priority))\b/.test(text)) {
    return "EXPLAIN_PRIORITY";
  }

  if (/\b(security|sign[- ]?in|suspicious|password|account alert)\b/.test(text)) return "SECURITY";
  if (/\b(deadline|deadlines|due|overdue|when.*due|expires?|expiry)\b/.test(text)) return "DEADLINES";
  if (/\b(waiting|follow[- ]?up|pending|response|reply from|heard back)\b/.test(text)) return "FOLLOWUPS";
  if (/\b(email|emails|gmail|inbox|message|messages)\b/.test(text)) return "EMAIL";

  if (
    /\b(calendar|schedule|appointment|appointments|meeting|meetings|shift|shifts|free|available|busy|tomorrow|today|this evening|tonight|this morning|this afternoon)\b/.test(text)
  ) return "CALENDAR";

  if (
    /\b(what should i do|what do i need to do|what to do|priorities|priority|focus on|next action|what should i focus on|what's most important|whats most important)\b/.test(text)
  ) return "PRIORITIES";

  if (
    /\b(what'?s new|whats new|brief me|briefing|update me|anything important|what should i know|give me an update|how does my day look)\b/.test(text)
  ) return "BRIEFING";

  return "GENERAL";
}

function inferIntent(message: string, history: AssistantHistoryMessage[]): Intent {
  const direct = baseIntent(message);
  if (direct !== "GENERAL") return direct;

  const text = normalize(message);
  const looksLikeFollowUp =
    text.length < 80 &&
    /^(and |what about|how about|why|when|which|the first|the second|the third|first|second|third|tomorrow|today|tonight|then|that|it)/.test(text);

  if (!looksLikeFollowUp) return "GENERAL";

  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role !== "user") continue;
    const previous = baseIntent(history[i].text);
    if (previous !== "GENERAL") return previous;
  }

  return "GENERAL";
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
    "• reason over your next 7 days of Google Calendar",
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
      : "You have no stored action items or upcoming calendar events in the next 7 days.";
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

function calendarAnswer(message: string, context: AssistantContext) {
  const now = new Date(context.generatedAt);
  const requestedDay = targetDay(message, now, context.timezone);
  const events = requestedDay
    ? context.calendarEvents.filter((event) => dateKey(event.start, context.timezone) === requestedDay)
    : context.calendarEvents;

  const isAvailabilityQuestion = /\b(free|available|busy|time available)\b/i.test(message);

  if (!events.length) {
    if (requestedDay && isAvailabilityQuestion) {
      return "I do not see any Google Calendar events for that day, so your calendar currently looks open. That only reflects events stored in Google Calendar.";
    }
    return requestedDay
      ? "I do not see any Google Calendar events for that day."
      : "I do not see any events on your Google Calendar in the next 7 days.";
  }

  if (requestedDay && isAvailabilityQuestion) {
    return [
      `You have ${events.length} calendar commitment${events.length === 1 ? "" : "s"} that day:`,
      "",
      ...events.map((event) => `• ${event.title} — ${formatWhen(event.start, context.timezone)}${event.end ? ` to ${formatWhen(event.end, context.timezone)}` : ""}`),
      "",
      "Outside those stored events, I do not see another calendar conflict.",
    ].join("\n");
  }

  return [
    requestedDay ? "Your schedule for that day:" : "Your next calendar items:",
    "",
    ...events.slice(0, 8).map((event, index) =>
      `${index + 1}. ${event.title} — ${formatWhen(event.start, context.timezone)}`
    ),
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

export function answerWithLocalIntelligence(
  message: string,
  context: AssistantContext,
  history: AssistantHistoryMessage[] = []
) {
  const intent = inferIntent(message, history);

  switch (intent) {
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
        "I did not map that request to a specific secretary function yet.",
        "",
        "I can still help with priorities, Gmail, deadlines, Calendar, follow-ups, tasks, roster sync and explaining why something matters.",
        "",
        "Try phrasing the goal directly, for example: “What should I do now?” or “Am I free tomorrow?”",
      ].join("\n");
  }
}
