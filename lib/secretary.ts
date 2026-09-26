import { db } from "@/lib/db";

export async function buildSecretaryBriefing(userId: string) {
  const now = new Date();
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [tasks, followups, emails] = await Promise.all([
    db.task.findMany({
      where: {
        userId,
        status: { in: ["OPEN", "WAITING"] },
        OR: [{ dueAt: null }, { dueAt: { lte: inSevenDays } }],
      },
      orderBy: [{ priority: "asc" }, { dueAt: "asc" }],
      take: 12,
    }),
    db.followup.findMany({
      where: {
        userId,
        status: "OPEN",
        OR: [{ nextFollowupAt: null }, { nextFollowupAt: { lte: inSevenDays } }],
      },
      orderBy: { nextFollowupAt: "asc" },
      take: 8,
    }),
    db.emailIntelligence.findMany({
      where: { userId, requiresAction: true },
      orderBy: { processedAt: "desc" },
      take: 8,
    }),
  ]);

  const score = (priority: string) =>
    priority === "URGENT" ? 4 : priority === "HIGH" ? 3 : priority === "MEDIUM" ? 2 : 1;

  const topPriorities = tasks
    .slice()
    .sort((a, b) => score(b.priority) - score(a.priority))
    .slice(0, 3);

  return { topPriorities, tasks, followups, emails };
}
