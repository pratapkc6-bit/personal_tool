import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const records = new Map();
const id = (userId, key) => `${userId}:${key}`;
globalThis.__confirmationTestDb = { setting: {
  async upsert({ where, create, update }) { const { userId, key } = where.userId_key; records.set(id(userId, key), { userId, key, value: records.has(id(userId, key)) ? update.value : create.value }); },
  async findUnique({ where }) { return records.get(id(where.userId_key.userId, where.userId_key.key)) ?? null; },
  async deleteMany({ where }) {
    const key = id(where.userId, where.key);
    if (JSON.stringify(records.get(key)?.value) !== JSON.stringify(where.value.equals)) return { count: 0 };
    records.delete(key); return { count: 1 };
  },
} };
const source = readFileSync(new URL("../lib/intelligence/confirmations.ts", import.meta.url), "utf8")
  .replace('import { db } from "@/lib/db";', 'const db = globalThis.__confirmationTestDb;')
  .replace('"./assistant-contract"', JSON.stringify(new URL("../lib/intelligence/assistant-contract.ts", import.meta.url).href));
const { prepareConfirmation, consumeConfirmation } = await import("data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(source)).toString("base64"));
const action = { type: "CREATE_TASK", title: "Prepare interview", priority: "HIGH", category: "PERSONAL" };
test("only the owner can confirm the exact stored preview", async () => {
  records.clear();
  const preview = await prepareConfirmation("alice", action);
  assert.equal(await consumeConfirmation("bob", preview.confirmationToken), null);
  assert.deepEqual(await consumeConfirmation("alice", preview.confirmationToken), action);
});
test("concurrent confirmations consume once", async () => {
  records.clear();
  const preview = await prepareConfirmation("alice", action);
  const results = await Promise.all([consumeConfirmation("alice", preview.confirmationToken), consumeConfirmation("alice", preview.confirmationToken)]);
  assert.equal(results.filter(Boolean).length, 1);
});
test("replaced and expired previews cannot be executed", async () => {
  records.clear();
  const old = await prepareConfirmation("alice", action);
  const current = await prepareConfirmation("alice", { ...action, title: "Updated title" });
  assert.equal(await consumeConfirmation("alice", old.confirmationToken), null);
  records.get(id("alice", "assistant_pending_action")).value.expiresAt = Date.now() - 1;
  assert.equal(await consumeConfirmation("alice", current.confirmationToken), null);
});
