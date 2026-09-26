import type { Priority } from "@prisma/client";
import { db } from "@/lib/db";
import { priorityScore } from "@/lib/intelligence/priority-engine";

export type BriefingPriority = {
  id: string;
  source: "TASK" | "EMAIL" | "FOLLOWUP";
  title: string;
  priority: Priority;
  dueAt: Date | null;
  nextAction: string | null;
  reason: string;
  href: string;
  score: number;
};

function readScanAt(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const at = (value as { at?: unknown }).at;
  return typeof at === "string" ? at : null;
}

function normalisePriorityTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/^(re|fw|fwd):\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function collapseRepeatedPriorities(items: BriefingPriority[]) {
  const seen = new Map<string, { item: BriefingPriority; count: number }>();

  for (const item of items) {
    const key = `${item.source}:${normalisePriorityTitle(item.title)}`;
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, { item, count: 1 });
      continue;
    }

    existing.count += 1;
    if (item.score > existing.item.score) existing.item = item;
  }

  return [...seen.values()].map(({ item, count }) => ({
    ...item,
    reason: count > 1 ? `${count} similar items detected. ${item.reason}` : item.reason,
  }));
}

export async function buildSecretaryBriefing(userId: string) {
  const now = new Date();
  const inThirtyDays = new Date(now.getTime() + 30 * 86_400_000);

  const [tasks, followups, emails, scanSetting] = await Promise.all([
    db.task.findMany({
      where: {
        userId,
        status: { in: ["OPEN", "WAITING"] },
        OR: [{ dueAt: null }, { dueAt: { lte: inThirtyDays } }],
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 30,
    }),
    db.followup.findMany({
      where: {
        userId,
        status: "OPEN",
      },
      orderBy: { nextFollowupAt: "asc" },
      take: 20,
    }),
    db.emailIntelligence.findMany({
      where: { userId, requiresAction: true },
      orderBy: [{ deadlineAt: "asc" }, { processedAt: "desc" }],
      take: 30,
    }),
    db.setting.findUnique({
      where: { userId_key: { userId, key: "gmail_last_scan" } },
    }),
  ]);

  const taskItems: BriefingPriority[] = tasks.map((task) => ({
    id: task.id,
    source: "TASK",
    title: task.title,
    priority: task.priority,
    dueAt: task.dueAt,
    nextAction: task.nextAction,
    reason: task.dueAt && task.dueAt < now ? "Task is overdue." : task.dueAt ? "Task has an upcoming deadline." : "Open task.",
    href: "/tasks",
    score: priorityScore({
      priority: task.priority,
      dueAt: task.dueAt,
      receivedAt: task.createdAt,
      source: "TASK",
    }, now),
  }));

  const emailItems: BriefingPriority[] = emails.map((email) => ({
    id: email.id,
    source: "EMAIL",
    title: email.subject || "Email requiring attention",
    priority: email.importance,
    dueAt: email.deadlineAt,
    nextAction: email.recommendedAction,
    reason: email.deadlineAt ? "Email contains a detected deadline." : email.whyItMatters || "Email requires action.",
    href: "/inbox",
    score: priorityScore({
      priority: email.importance,
      dueAt: email.deadlineAt,
      classification: email.classification,
      receivedAt: email.receivedAt || email.processedAt,
      source: "EMAIL",
    }, now),
  }));

  const followupItems: BriefingPriority[] = followups.map((item) => {
    const overdue = Boolean(item.nextFollowupAt && item.nextFollowupAt < now);
    const priority: Priority = overdue ? "HIGH" : "MEDIUM";
    return {
      id: item.id,
      source: "FOLLOWUP",
      title: item.subject,
      priority,
      dueAt: item.nextFollowupAt,
      nextAction: item.expectedResponse ? `Follow up on: ${item.expectedResponse}` : "Check whether an update is needed.",
      reason: overdue ? "Follow-up date has passed." : "Waiting for a response or outcome.",
      href: "/tasks",
      score: priorityScore({
        priority,
        dueAt: item.nextFollowupAt,
        receivedAt: item.lastUpdate,
        classification: "WAITING",
        source: "FOLLOWUP",
      }, now),
    };
  });

  const sorted = [...taskItems, ...emailItems, ...followupItems]
    .sort((a, b) => b.score - a.score || (a.dueAt?.getTime() || Infinity) - (b.dueAt?.getTime() || Infinity));

  const allPriorities = collapseRepeatedPriorities(sorted);

  const deadlines = allPriorities
    .filter((item) => item.dueAt)
    .sort((a, b) => (a.dueAt?.getTime() || Infinity) - (b.dueAt?.getTime() || Infinity));

  const dueSoonCount = deadlines.filter((item) => {
    if (!item.dueAt) return false;
    const hours = (item.dueAt.getTime() - now.getTime()) / 3_600_000;
    return hours >= 0 && hours <= 72;
  }).length;

  return {
    topPriorities: allPriorities.slice(0, 3),
    deadlines,
    tasks,
    followups,
    emails,
    lastGmailScanAt: readScanAt(scanSetting?.value),
    summary: {
      urgentCount: allPriorities.filter((item) => item.priority === "URGENT").length,
      dueSoonCount,
      waitingCount: followups.length,
      actionEmailCount: emails.length,
    },
  };
}
