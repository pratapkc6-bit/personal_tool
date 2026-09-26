import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { pendingActionSchema, type PendingAction } from "./assistant-contract";

const key = "assistant_pending_action";
export async function prepareConfirmation(userId: string, action: PendingAction) {
  const pendingAction = pendingActionSchema.parse(action);
  const confirmationToken = randomUUID();
  const value = JSON.parse(JSON.stringify({ token: confirmationToken, expiresAt: Date.now() + 10 * 60_000, action: pendingAction }));
  await db.setting.upsert({
    where: { userId_key: { userId, key } }, update: { value }, create: { userId, key, value },
  });
  return { pendingAction, confirmationToken };
}

export async function consumeConfirmation(userId: string, token: string): Promise<PendingAction | null> {
  const record = await db.setting.findUnique({ where: { userId_key: { userId, key } } });
  if (!record || !record.value || typeof record.value !== "object" || Array.isArray(record.value)) return null;
  const value = record.value;
  if (value.token !== token || typeof value.expiresAt !== "number" || value.expiresAt < Date.now()) return null;
  const action = pendingActionSchema.safeParse(value.action);
  if (!action.success) return null;
  // Compare and delete atomically: double-clicks and concurrent requests cannot consume twice.
  const consumed = await db.setting.deleteMany({ where: { userId, key, value: { equals: record.value } } });
  return consumed.count === 1 ? action.data : null;
}
