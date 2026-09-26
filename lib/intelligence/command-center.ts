import type { AssistantContext } from "./context-builder";
import { dayKey, planDay } from "./day-planner";

export function buildCommandCenter(context: AssistantContext) {
  const now = new Date(context.generatedAt);
  const plan = planDay(context.calendarEvents, dayKey(now, context.timezone), context.timezone, now, 15);
  const verified = context.calendarStatus === "available" && !plan.incomplete;
  const overdue = context.deadlines.filter(item => item.dueAt && new Date(item.dueAt).getTime() < now.getTime());
  const dueToday = context.deadlines.filter(item => item.dueAt && new Date(item.dueAt).getTime() >= now.getTime() && dayKey(new Date(item.dueAt), context.timezone) === dayKey(now, context.timezone));
  const scanAge = context.lastGmailScanAt ? now.getTime() - Date.parse(context.lastGmailScanAt) : Infinity;
  const signals: Array<{ title: string; detail: string; href: string; level: "attention" | "info" }> = [];
  if (!verified) signals.push({ title: "Calendar needs verification", detail: "Available time is hidden until a complete calendar can be read.", href: "/connections", level: "attention" });
  if (overdue.length) signals.push({ title: `${overdue.length} overdue item${overdue.length === 1 ? "" : "s"}`, detail: overdue.slice(0, 2).map(item => item.title).join(" · "), href: overdue[0].href, level: "attention" });
  if (verified && plan.conflicts.length) signals.push({ title: "Your schedule overlaps", detail: plan.conflicts.slice(0, 2).join(" · "), href: "/calendar", level: "attention" });
  if (dueToday.length) signals.push({ title: `${dueToday.length} due before today ends`, detail: dueToday.map(item => item.title).slice(0, 2).join(" · "), href: dueToday[0].href, level: "attention" });
  if (!Number.isFinite(scanAge) || scanAge > 86_400_000) signals.push({ title: "Refresh your inbox intelligence", detail: "Email insights may be out of date. Run a scan to bring them up to date.", href: "/inbox", level: "info" });
  if (!signals.length) signals.push({ title: "No immediate alerts detected", detail: "Based on loaded tasks, follow-ups, email summaries and today's calendar. New items may still arrive.", href: "/tasks", level: "info" });
  return {
    generatedAt: context.generatedAt, timezone: context.timezone, verified,
    calendarStatus: context.calendarStatus, signals,
    overdue: overdue.length, dueToday: dueToday.length,
    taskCount: context.tasks.length, emailCount: context.emailActions.length,
    priorities: context.topPriorities.map(item => ({ id: `${item.source}:${item.id}`, title: item.title, nextAction: item.nextAction || item.reason, reason: item.reason, href: item.href, priority: item.priority })),
    windows: verified ? plan.slots.map(slot => ({ start: new Date(slot.start).toISOString(), end: new Date(slot.end).toISOString() })) : [],
    timeline: plan.commitments.filter(item => item.to > now.getTime()).slice(0, 12).map((item, index) => ({ id: `${item.from}:${index}`, title: item.title, start: new Date(item.from).toISOString(), end: new Date(item.to).toISOString(), allDay: !item.start?.includes("T") })),
  };
}

export function fitFocusSessions(windows: Array<{ start: string; end: string }>, minutes: number, buffer: number, now: number) {
  if (!Number.isFinite(now) || !Number.isInteger(minutes) || minutes < 15 || minutes > 120 || !Number.isInteger(buffer) || buffer < 0 || buffer > 30) return [];
  const sessions: Array<{ start: string; end: string }> = [];
  // Windows come from the merged calendar planner; never extend them to fit a session.
  for (const window of windows) {
    let cursor = Math.max(Date.parse(window.start), now);
    const end = Date.parse(window.end);
    while (cursor + (minutes + buffer) * 60_000 <= end && sessions.length < 6) {
      sessions.push({ start: new Date(cursor).toISOString(), end: new Date(cursor + minutes * 60_000).toISOString() });
      cursor += (minutes + buffer) * 60_000;
    }
  }
  return sessions;
}
