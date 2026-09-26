import type { AssistantContext } from "./context-builder";
import { dayKey, planDay } from "./day-planner";

export function buildMission(context: AssistantContext) {
  const now = new Date(context.generatedAt);
  const plan = planDay(context.calendarEvents, dayKey(now, context.timezone), context.timezone, now);
  const calendarReady = context.calendarStatus === "available" && !plan.incomplete;
  const overdue = context.deadlines.filter(d => d.dueAt && new Date(d.dueAt).getTime() < now.getTime()).length;
  const focus = context.topPriorities[0];
  return {
    generatedAt: context.generatedAt, timezone: context.timezone,
    calendarStatus: context.calendarStatus, lastGmailScanAt: context.lastGmailScanAt,
    headline: focus ? `Start with ${focus.title}` : "Make room for what matters.",
    nextStep: focus?.nextAction || focus?.reason || "Review your calendar, capture a task, or tell Zoro what you want to accomplish.",
    overdue, conflictCount: calendarReady ? plan.conflicts.length : null,
    conflicts: calendarReady ? plan.conflicts.slice(0, 5) : [],
    freeMinutes: calendarReady ? plan.slots.reduce((sum, s) => sum + Math.floor((s.end - s.start) / 60_000), 0) : null,
    priorities: context.topPriorities.map(p => ({ title: p.title, priority: p.priority, href: p.href, reason: p.reason })),
    nextWindow: calendarReady && plan.slots[0] ? { start: new Date(plan.slots[0].start).toISOString(), end: new Date(plan.slots[0].end).toISOString() } : null,
  };
}
