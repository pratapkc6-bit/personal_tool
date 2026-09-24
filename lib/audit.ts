import { db } from "@/lib/db";

export async function audit(input: {
  userId: string;
  action: string;
  source: string;
  sourceRef?: string | null;
  previousState?: unknown;
  newState?: unknown;
  result: string;
}) {
  return db.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      source: input.source,
      sourceRef: input.sourceRef ?? undefined,
      previousState: input.previousState as never,
      newState: input.newState as never,
      result: input.result,
    },
  });
}

export async function activity(input: {
  userId: string;
  type: string;
  summary: string;
  details?: unknown;
}) {
  return db.assistantActivity.create({
    data: {
      userId: input.userId,
      type: input.type,
      summary: input.summary,
      details: input.details as never,
    },
  });
}
