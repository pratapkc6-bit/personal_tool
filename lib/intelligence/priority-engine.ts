import type { Priority } from "@prisma/client";

const weight: Record<Priority, number> = {
  URGENT: 50,
  HIGH: 35,
  MEDIUM: 20,
  LOW: 10,
};

export function daysUntil(date: Date | null | undefined, now = new Date()) {
  if (!date) return null;
  return (date.getTime() - now.getTime()) / 86_400_000;
}

export function elevatePriority(base: Priority, dueAt: Date | null, now = new Date()): Priority {
  const days = daysUntil(dueAt, now);
  if (days === null) return base;
  if (days < 0 || days <= 1) return "URGENT";
  if (days <= 3 && base !== "URGENT") return "HIGH";
  if (days <= 7 && base === "LOW") return "MEDIUM";
  return base;
}

export function priorityScore(input: {
  priority: Priority;
  dueAt?: Date | null;
  classification?: string | null;
  receivedAt?: Date | null;
  source?: "TASK" | "EMAIL" | "FOLLOWUP";
}, now = new Date()) {
  let score = weight[input.priority];
  const days = daysUntil(input.dueAt, now);

  if (days !== null) {
    if (days < 0) score += 50;
    else if (days <= 1) score += 35;
    else if (days <= 3) score += 25;
    else if (days <= 7) score += 12;
  }

  if (input.classification === "SECURITY") score += 25;
  if (input.classification === "ACTION_REQUIRED") score += 12;
  if (input.classification === "WAITING") score += 5;
  if (input.source === "EMAIL") score += 3;

  if (input.receivedAt) {
    const ageDays = (now.getTime() - input.receivedAt.getTime()) / 86_400_000;
    if (ageDays >= 7) score += 8;
    else if (ageDays >= 3) score += 4;
  }

  return score;
}
