import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const contract = readFileSync(new URL("../lib/intelligence/assistant-contract.ts", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/api/assistant/route.ts", import.meta.url), "utf8");
const toolRouter = readFileSync(new URL("../lib/intelligence/assistant-tools.ts", import.meta.url), "utf8");
const scan = readFileSync(new URL("../lib/gmail-scan.ts", import.meta.url), "utf8");
const cron = readFileSync(new URL("../app/api/cron/secretary/route.ts", import.meta.url), "utf8");

test("assistant exposes the major personal-secretary write tools", () => {
  for (const action of ["CREATE_TASK","CREATE_CALENDAR_EVENT","CREATE_REMINDER","CREATE_EMAIL_DRAFT","SEND_EMAIL","SYNC_MYOB_ROSTER"]) {
    assert.match(contract, new RegExp(action));
  }
});
test("writes stay behind confirmation", () => {
  assert.match(route, /prepareConfirmation/);
  assert.match(route, /consumeConfirmation/);
});
test("tool router includes reminders alarms and email actions", () => {
  assert.match(toolRouter, /CREATE_REMINDER/);
  assert.match(toolRouter, /CREATE_EMAIL_DRAFT/);
  assert.match(toolRouter, /SEND_EMAIL/);
});
test("Gmail scanner can deliver important push alerts", () => {
  assert.match(scan, /createAndDeliverAlert/);
  assert.match(scan, /importantGmail/);
});
test("runtime checks alerts frequently while throttling heavier jobs", () => {
  assert.match(cron, /minute % 5/);
  assert.match(cron, /minute % 30/);
  assert.match(cron, /runAlertEngine/);
});
