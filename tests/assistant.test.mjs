import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

// Erase type-only database imports so these logic tests need no credentials or database.
const source = readFileSync(new URL("../lib/intelligence/local-assistant.ts", import.meta.url), "utf8")
  .replace('"./day-planner"', JSON.stringify(new URL("../lib/intelligence/day-planner.ts", import.meta.url).href));
const { answerWithLocalIntelligence: answer } = await import("data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(source)).toString("base64"));
const priority = { title: "Submit assignment", priority: "HIGH", nextAction: "Review the draft", reason: "Due soon", dueAt: null };
const context = {
  generatedAt: "2026-09-26T00:00:00Z", timezone: "Australia/Darwin", calendarStatus: "available",
  summary: { urgentCount: 0, dueSoonCount: 0, actionEmailCount: 0, waitingCount: 0 },
  topPriorities: [priority], deadlines: [], emailActions: [], followups: [], tasks: [], calendarEvents: [],
};
test("priorities take precedence over today calendar keyword", () => {
  assert.match(answer("What's important today?", context), /Submit assignment/);
});
test("plan produces usable windows and focus order", () => {
  const result = answer("Find 45 minutes tomorrow", context);
  assert.match(result, /2026-09-27/);
  assert.match(result, /at least 45 minutes/);
  assert.match(result, /Submit assignment/);
  assert.match(result, /nothing has been scheduled/);
});
test("short planning follow-up keeps duration", () => {
  const result = answer("What about tomorrow?", context, [{ role: "user", text: "Find 45 minutes today" }]);
  assert.match(result, /2026-09-27/);
  assert.match(result, /at least 45 minutes/);
});
test("failed and truncated Calendar cannot imply availability", () => {
  for (const calendarStatus of ["unavailable", "partial"]) {
    assert.match(answer("Am I free tomorrow?", { ...context, calendarStatus }), /cannot reliably check free time/);
  }
});
test("day follow-up retains email topic", () => {
  assert.match(answer("Tomorrow?", context, [{ role: "user", text: "Which emails need action?" }]), /emails/);
});
