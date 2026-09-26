import type { EmailClassification, Priority } from "@prisma/client";
import { classifyEmail } from "@/lib/email";
import { deadlineLabel, extractDeadline } from "@/lib/intelligence/deadline-extractor";
import { elevatePriority } from "@/lib/intelligence/priority-engine";

export function analyseEmail(input: {
  sender: string;
  subject: string;
  body: string;
  receivedAt?: Date | null;
}): {
  classification: EmailClassification;
  priority: Priority;
  requiresAction: boolean;
  whatHappened: string;
  whyItMatters: string;
  recommendedAction: string | null;
  deadlineAt: Date | null;
} {
  const base = classifyEmail(input);
  const reference = input.receivedAt && Number.isFinite(input.receivedAt.getTime()) ? input.receivedAt : new Date();
  const deadlineAt = extractDeadline(`${input.subject}\n${input.body}`, reference);
  const priority = elevatePriority(base.priority, deadlineAt);
  const deadlineRequiresAction = Boolean(
    deadlineAt &&
    base.classification !== "LOW_VALUE" &&
    base.classification !== "INFORMATION"
  );
  const requiresAction = base.requiresAction || deadlineRequiresAction;

  const whyItMatters = deadlineAt
    ? `${base.whyItMatters} A deadline was detected and is ${deadlineLabel(deadlineAt)}.`
    : base.whyItMatters;

  const deadlineText = deadlineAt
    ? new Intl.DateTimeFormat("en-AU", {
        timeZone: process.env.APP_TIMEZONE || "Australia/Darwin",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(deadlineAt)
    : null;

  const recommendedAction = deadlineText
    ? `${base.recommendedAction || "Review the message and decide the required action."} Target: ${deadlineText}.`
    : base.recommendedAction;

  return {
    ...base,
    priority,
    requiresAction,
    whyItMatters,
    recommendedAction,
    deadlineAt,
  };
}
