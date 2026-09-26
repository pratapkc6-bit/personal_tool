import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { pendingActionSchema, requestSchema } from "../lib/intelligence/assistant-contract.ts";

async function loadLogic(name, rewrites) {
  let source = readFileSync(new URL(`../lib/intelligence/${name}.ts`, import.meta.url), "utf8");
  for (const relative of rewrites) source = source.replace(`"./${relative}"`, JSON.stringify(new URL(`../lib/intelligence/${relative}.ts`, import.meta.url).href));
  return import("data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(source)).toString("base64"));
}
const { buildMission } = await loadLogic("mission", ["day-planner"]);
const context = {
  generatedAt: "2026-09-26T00:00:00Z", timezone: "Australia/Darwin", calendarStatus: "available",
  calendarHorizon: "2026-10-03T00:00:00Z", lastGmailScanAt: null,
  summary: { urgentCount: 0, dueSoonCount: 0, actionEmailCount: 0, waitingCount: 0 },
  topPriorities: [], deadlines: [], emailActions: [], followups: [],
  tasks: [{ id: "t1", title: "Prepare interview", priority: "HIGH", status: "OPEN", dueAt: null, nextAction: null }], calendarEvents: [],
};
test("confirmation endpoint rejects arbitrary action payloads and oversized input", () => {
  assert.equal(requestSchema.safeParse({ confirmedAction: { type: "CREATE_TASK", title: "Injected" } }).success, false);
  assert.equal(requestSchema.safeParse({ message: "x".repeat(4001) }).success, false);
  assert.equal(requestSchema.safeParse({ message: "Hi", confirmationToken: "00000000-0000-4000-8000-000000000000" }).success, false);
});
test("actions reject invalid calendar times", () => {
  assert.equal(pendingActionSchema.safeParse({ type: "CREATE_CALENDAR_EVENT", summary: "Wrong order", start: "2026-09-26T12:00:00Z", end: "2026-09-26T11:00:00Z", category: "PERSONAL" }).success, false);
});
test("mission reports unavailable time as unknown instead of free", () => {
  const result = buildMission({ ...context, calendarStatus: "unavailable" });
  assert.equal(result.freeMinutes, null);
  assert.equal(result.conflictCount, null);
  assert.equal(result.nextWindow, null);
});
test("mission counts overdue work and offers a future focus window", () => {
  const result = buildMission({ ...context, deadlines: [{ dueAt: "2026-09-25T00:00:00Z" }] });
  assert.equal(result.overdue, 1);
  assert.ok(Date.parse(result.nextWindow.start) >= Date.parse(context.generatedAt));
});
