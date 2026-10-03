import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const contract = readFileSync(new URL("../lib/intelligence/assistant-contract.ts", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/api/assistant/route.ts", import.meta.url), "utf8");
const toolRouter = readFileSync(new URL("../lib/intelligence/assistant-tools.ts", import.meta.url), "utf8");
const scan = readFileSync(new URL("../lib/gmail-scan.ts", import.meta.url), "utf8");
const cron = readFileSync(new URL("../app/api/cron/secretary/route.ts", import.meta.url), "utf8");
const runtime = readFileSync(new URL("../components/notification-runtime.tsx", import.meta.url), "utf8");

test("assistant exposes the major personal-secretary write tools", () => {
  for (const action of ["CREATE_TASK","CREATE_CALENDAR_EVENT","CREATE_REMINDER","CREATE_EMAIL_DRAFT","SEND_EMAIL","SYNC_MYOB_ROSTER"]) {
    assert.match(contract, new RegExp(action));
  }
});

test("assistant routes writes through confirmation instead of silent execution", () => {
  assert.match(route, /prepareConfirmation/);
  assert.match(route, /consumeConfirmation/);
  assert.match(route, /SEND_EMAIL/);
  assert.match(route, /CREATE_REMINDER/);
});

test("tool router includes reminders alarms and explicit email handling", () => {
  assert.match(toolRouter, /CREATE_REMINDER/);
  assert.match(toolRouter, /CREATE_EMAIL_DRAFT/);
  assert.match(toolRouter, /SEND_EMAIL/);
  assert.match(toolRouter, /addressMatch/);
});

test("Gmail scanner can immediately deliver important push alerts", () => {
  assert.match(scan, /createAndDeliverAlert/);
  assert.match(scan, /importantGmail/);
  assert.match(scan, /pushed/);
});

test("foreground runtime checks Gmail every five minutes and server cron remains the fallback", () => {
  assert.match(runtime, /5\*60_000/);
  assert.match(cron, /scanGmail/);
  assert.match(cron, /runAlertEngine/);
});
