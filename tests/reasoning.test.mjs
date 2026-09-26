import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { pendingActionSchema, requestSchema, toPendingAction } from "../lib/intelligence/assistant-contract.ts";

async function loadLogic(name, rewrites) {
  let source = readFileSync(new URL(`../lib/intelligence/${name}.ts`, import.meta.url), "utf8");
  for (const relative of rewrites) source = source.replace(`"./${relative}"`, JSON.stringify(new URL(`../lib/intelligence/${relative}.ts`, import.meta.url).href));
  return import("data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(source)).toString("base64"));
}
const { reasonWithAI } = await loadLogic("reasoning", ["assistant-contract"]);
const { buildMission } = await loadLogic("mission", ["day-planner"]);
const context = {
  generatedAt: "2026-09-26T00:00:00Z", timezone: "Australia/Darwin", calendarStatus: "available",
  calendarHorizon: "2026-10-03T00:00:00Z", lastGmailScanAt: null,
  summary: { urgentCount: 0, dueSoonCount: 0, actionEmailCount: 0, waitingCount: 0 },
  topPriorities: [], deadlines: [], emailActions: [], followups: [],
  tasks: [{ id: "t1", title: "Prepare interview", priority: "HIGH", status: "OPEN", dueAt: null, nextAction: null }], calendarEvents: [],
};
const valid = { message: "Start preparing for your interview.", suggestedPrompts: ["Help me prepare"], evidenceIds: ["task:t1", "invented:id"], proposedAction: null };
function response(result = valid, status = "completed") {
  return new Response(JSON.stringify({ status, output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(result) }] }] }), { status: 200 });
}
test("AI receives bounded context and history, disables response storage, and filters invented evidence", async () => {
  const previous = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key-not-real";
  try {
    let payload;
    const answer = await reasonWithAI({ message: "What first?", history: [], context, personalBrief: "Find an IT job", fetcher: async (url, options) => {
      assert.equal(url, "https://api.openai.com/v1/responses");
      payload = JSON.parse(options.body);
      return response();
    } });
    assert.equal(payload.store, false);
    assert.equal(payload.text.format.strict, true);
    assert.match(payload.input[0].content, /Find an IT job/);
    assert.equal(answer.sources.length, 1);
    assert.equal(answer.sources[0].href, "/tasks");
    assert.equal(answer.pendingAction, null);
  } finally { if (previous === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previous; }
});
test("API errors, incomplete output and malformed actions cannot produce an executable proposal", async () => {
  const previous = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key-not-real";
  try {
    const args = { message: "Help", history: [], context, personalBrief: "" };
    await assert.rejects(reasonWithAI({ ...args, fetcher: async () => new Response("unavailable", { status: 429 }) }), /AI_UNAVAILABLE/);
    await assert.rejects(reasonWithAI({ ...args, fetcher: async () => response(valid, "incomplete") }), /AI_INCOMPLETE/);
    await assert.rejects(reasonWithAI({ ...args, fetcher: async () => response({ ...valid, proposedAction: { type: "SEND_EMAIL" } }) }));
  } finally { if (previous === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previous; }
});
test("no API key means no external request", async () => {
  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  let called = false;
  try {
    await assert.rejects(reasonWithAI({ message: "Hi", history: [], context, personalBrief: "", fetcher: async () => { called = true; return response(); } }), /AI_NOT_CONFIGURED/);
    assert.equal(called, false);
  } finally { if (previous !== undefined) process.env.OPENAI_API_KEY = previous; }
});
test("confirmation endpoint rejects arbitrary action payloads and oversized input", () => {
  assert.equal(requestSchema.safeParse({ confirmedAction: { type: "CREATE_TASK", title: "Injected" } }).success, false);
  assert.equal(requestSchema.safeParse({ message: "x".repeat(4001) }).success, false);
  assert.equal(requestSchema.safeParse({ message: "Hi", confirmationToken: "00000000-0000-4000-8000-000000000000" }).success, false);
});
test("actions validate times and preserve a real task title", () => {
  assert.equal(toPendingAction({ type: "CREATE_TASK", title: "Prepare interview", start: null, end: null, dueAt: null, priority: "HIGH" }).title, "Prepare interview");
  assert.equal(pendingActionSchema.safeParse({ type: "CREATE_CALENDAR_EVENT", summary: "Wrong order", start: "2026-09-26T12:00:00Z", end: "2026-09-26T11:00:00Z", category: "PERSONAL" }).success, false);
  assert.throws(() => toPendingAction({ type: "CREATE_CALENDAR_EVENT", title: "Unknown time", start: null, end: null, dueAt: null, priority: "MEDIUM" }));
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
