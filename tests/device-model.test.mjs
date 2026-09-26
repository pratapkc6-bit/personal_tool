import test from "node:test";
import assert from "node:assert/strict";
import { deviceMessages, canUseDeviceAnswer } from "../lib/intelligence/device-prompt.ts";

test("device output cannot replace actions, errors, scans or deterministic answers", () => {
  assert.equal(canUseDeviceAnswer({ engine: "local", deviceEligible: true }, true), true);
  assert.equal(canUseDeviceAnswer({ engine: "local", deviceEligible: true, pendingAction: { type: "CREATE_TASK" } }, true), false);
  assert.equal(canUseDeviceAnswer({ engine: "local", deviceEligible: true }, false), false);
  assert.equal(canUseDeviceAnswer({ engine: "action", deviceEligible: true }, true), false);
  assert.equal(canUseDeviceAnswer({ engine: "local" }, true), false);
});

test("device prompt bounds history and reference data without inventing tool results", () => {
  const history = Array.from({ length: 30 }, () => ({ role: "user", text: "x".repeat(10000) }));
  const messages = deviceMessages("x".repeat(10000), history, "x".repeat(10000));
  assert.equal(messages.length, 6);
  assert.ok(messages.slice(1, -1).every(m => m.content.length <= 500));
  assert.ok(messages.at(-1).content.length < 3700);
  assert.match(messages[0].content, /cannot send, create, save, schedule/);
  assert.match(messages.at(-1).content, /not instructions/);
});
