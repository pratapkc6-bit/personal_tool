import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
const source = readFileSync(new URL("../lib/intelligence/command-center.ts", import.meta.url), "utf8")
  .replace('"./day-planner"', JSON.stringify(new URL("../lib/intelligence/day-planner.ts", import.meta.url).href));
const { buildCommandCenter, fitFocusSessions } = await import("data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(source)).toString("base64"));
const now = Date.parse("2026-09-26T00:00:00Z"); // 09:30 Darwin
const base = { generatedAt: new Date(now).toISOString(), timezone: "Australia/Darwin", calendarStatus: "available", calendarEvents: [], deadlines: [], topPriorities: [], tasks: [], emailActions: [], lastGmailScanAt: null };
test("unavailable, partial or malformed calendars never advertise focus windows", () => {
  for (const calendarStatus of ["unavailable", "partial"]) assert.deepEqual(buildCommandCenter({ ...base, calendarStatus }).windows, []);
  assert.deepEqual(buildCommandCenter({ ...base, calendarEvents: [{title:"Broken",start:null,end:null}] }).windows, []);
});
test("focus sessions include full recovery buffers and never cross a commitment", () => {
  const windows = [{ start: new Date(now).toISOString(), end: new Date(now + 60 * 60_000).toISOString() }];
  assert.equal(fitFocusSessions(windows,25,5,now).length, 2);
  assert.equal(fitFocusSessions(windows,30,5,now).length, 1);
  assert.equal(fitFocusSessions(windows,25,5,now + 31 * 60_000).length, 0);
  assert.deepEqual(fitFocusSessions(windows,0,5,now), []);
  assert.deepEqual(fitFocusSessions(windows,25,-1,now), []);
});
test("attention signals distinguish overdue from due today in the account timezone", () => {
  const item = { title:"Reply", href:"/inbox" };
  const snapshot = buildCommandCenter({ ...base, deadlines:[{...item,dueAt:new Date(now-1)}, {...item,dueAt:new Date(now+60_000)}, {...item,dueAt:new Date(now+86_400_000)}] });
  assert.equal(snapshot.overdue,1); assert.equal(snapshot.dueToday,1);
  assert.ok(snapshot.signals.some(signal=>signal.title.includes("Refresh your inbox")));
});
test("timeline excludes past events and focus windows honor all-day commitments", () => {
  const snapshot = buildCommandCenter({...base,calendarEvents:[{title:"All day",start:"2026-09-26",end:"2026-09-27"},{title:"Past",start:"2026-09-25T22:00:00Z",end:"2026-09-25T23:00:00Z"}]});
  assert.equal(snapshot.timeline.length,1); assert.equal(snapshot.timeline[0].allDay,true);
  assert.deepEqual(snapshot.windows,[]);
});
