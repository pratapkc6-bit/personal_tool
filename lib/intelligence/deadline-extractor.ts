import * as chrono from "chrono-node";

function addBusinessDays(reference: Date, amount: number) {
  const date = new Date(reference);
  let remaining = amount;
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) remaining--;
  }
  return date;
}

function validFutureCandidate(date: Date, reference: Date) {
  return Number.isFinite(date.getTime()) && date.getTime() >= reference.getTime() - 12 * 60 * 60 * 1000;
}

export function extractDeadline(text: string, reference = new Date()): Date | null {
  const compact = text.replace(/\s+/g, " ").trim();
  if (!compact) return null;

  const relative = compact.match(/\b(?:within|in)\s+(\d{1,3})\s+(business\s+)?(hours?|days?|weeks?)\b/i);
  if (relative && /(?:action|required|reply|respond|complete|submit|payment|pay|due|deadline|expire|within)/i.test(compact)) {
    const amount = Number(relative[1]);
    const business = Boolean(relative[2]);
    const unit = relative[3].toLowerCase();
    const result = new Date(reference);
    if (unit.startsWith("hour")) result.setHours(result.getHours() + amount);
    else if (unit.startsWith("week")) result.setDate(result.getDate() + amount * 7);
    else if (business) return addBusinessDays(reference, amount);
    else result.setDate(result.getDate() + amount);
    return result;
  }

  const cuePattern = /\b(?:due|deadline|submit(?:ted)?|respond|reply|complete|payment|pay|expires?|valid until|no later than|before|by)\b[^.!?\n]{0,100}/gi;
  const candidates: Date[] = [];

  for (const match of compact.matchAll(cuePattern)) {
    const parsed = chrono.parse(match[0], reference, { forwardDate: true })[0];
    if (!parsed) continue;
    const date = parsed.start.date();
    if (validFutureCandidate(date, reference)) candidates.push(date);
  }

  if (!candidates.length) return null;
  return candidates.sort((a, b) => a.getTime() - b.getTime())[0];
}

export function deadlineLabel(deadline: Date, now = new Date()) {
  const hours = (deadline.getTime() - now.getTime()) / 3_600_000;
  if (hours < 0) return "overdue";
  if (hours <= 24) return "due within 24 hours";
  if (hours <= 72) return "due within 3 days";
  if (hours <= 168) return "due this week";
  return "upcoming deadline";
}
