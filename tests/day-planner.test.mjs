import test from "node:test";
import assert from "node:assert/strict";
import { dayKey, planDay, zonedTime } from "../lib/intelligence/day-planner.ts";

const zone = "Australia/Darwin";
const now = new Date("2026-09-26T00:00:00Z");
test("Darwin half-hour offset and local date", () => {
  assert.equal(new Date(zonedTime("2026-09-27", 9, zone)).toISOString(), "2026-09-26T23:30:00.000Z");
  assert.equal(dayKey(new Date("2026-09-26T16:00:00Z"), zone), "2026-09-27");
});
test("merges overlapping busy periods and reports conflicts", () => {
  const result = planDay([
    { title: "A", start: "2026-09-27T10:00:00+09:30", end: "2026-09-27T12:00:00+09:30" },
    { title: "B", start: "2026-09-27T11:00:00+09:30", end: "2026-09-27T13:00:00+09:30" },
  ], "2026-09-27", zone, now);
  assert.equal(result.conflicts.length, 1);
  assert.deepEqual(result.slots.map(s => (s.end - s.start) / 60_000), [60, 300]);
});
test("all-day and overnight events block time with exclusive end dates", () => {
  const events = [{ title: "Away", start: "2026-09-26", end: "2026-09-28" }];
  assert.equal(planDay(events, "2026-09-27", zone, now).slots.length, 0);
  assert.equal(planDay(events, "2026-09-28", zone, now).slots.length, 1);
  assert.equal(planDay([{ title: "Night shift", start: "2026-09-26T22:00:00+09:30", end: "2026-09-27T10:00:00+09:30" }], "2026-09-27", zone, now).slots[0].start, zonedTime("2026-09-27", 10, zone));
});
test("does not suggest elapsed time or availability from malformed events", () => {
  const late = new Date("2026-09-27T19:00:00+09:30");
  assert.equal(planDay([], "2026-09-27", zone, late).slots.length, 0);
  const invalid = planDay([{ title: "Unknown", start: "bad", end: null }], "2026-09-27", zone, now);
  assert.equal(invalid.incomplete, true);
  assert.equal(invalid.slots.length, 0);
});
test("resolves DST zone working hours", () => {
  assert.equal(new Date(zonedTime("2026-03-08", 9, "America/New_York")).toISOString(), "2026-03-08T13:00:00.000Z");
});
