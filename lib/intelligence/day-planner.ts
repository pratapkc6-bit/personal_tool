export type PlanningEvent = { title: string; start: string | null; end: string | null };

export function dayKey(value: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(value);
  return ["year", "month", "day"].map((key) => parts.find((p) => p.type === key)?.value).join("-");
}

// Resolve wall-clock time in the configured zone, including fractional offsets and DST.
export function zonedTime(day: string, hour: number, timezone: string) {
  const target = Date.parse(`${day}T${String(hour).padStart(2, "0")}:00:00Z`);
  let candidate = target;
  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(candidate));
    const get = (key: string) => parts.find((p) => p.type === key)?.value;
    const wall = Date.parse(`${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}Z`);
    const delta = target - wall;
    candidate += delta;
    if (!delta) break;
  }
  return candidate;
}

function eventTime(value: string | null, timezone: string) {
  if (!value) return NaN;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? zonedTime(value, 0, timezone) : Date.parse(value);
}

export function planDay(events: PlanningEvent[], day: string, timezone: string, now: Date, minimumMinutes = 30) {
  const dayStart = zonedTime(day, 0, timezone);
  const nextDay = new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  const dayEnd = zonedTime(nextDay, 0, timezone);
  const windowStart = Math.max(zonedTime(day, 9, timezone), now.getTime());
  const windowEnd = zonedTime(day, 18, timezone);
  const intervals = events.map((event) => ({
    ...event, from: eventTime(event.start, timezone), to: eventTime(event.end, timezone),
  }));
  const incomplete = intervals.some((e) => !Number.isFinite(e.from) || !Number.isFinite(e.to) || e.to <= e.from);
  const commitments = intervals.filter((e) => e.from < dayEnd && e.to > dayStart).sort((a, b) => a.from - b.from);
  const conflicts: string[] = [];
  for (let i = 0; i < commitments.length; i++) {
    for (let j = i + 1; j < commitments.length && commitments[j].from < commitments[i].to; j++) {
      conflicts.push(`${commitments[i].title} overlaps ${commitments[j].title}`);
    }
  }
  const slots: Array<{ start: number; end: number }> = [];
  let cursor = windowStart;
  for (const event of commitments) {
    const start = Math.max(windowStart, event.from);
    const end = Math.min(windowEnd, event.to);
    if (end <= windowStart || start >= windowEnd) continue;
    if (start - cursor >= minimumMinutes * 60_000) slots.push({ start: cursor, end: start });
    cursor = Math.max(cursor, end);
  }
  if (windowEnd - cursor >= minimumMinutes * 60_000) slots.push({ start: cursor, end: windowEnd });
  return { commitments, conflicts, slots: incomplete ? [] : slots, incomplete };
}
