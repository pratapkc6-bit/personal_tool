import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { zonedDateTime, zonedParts } from "../lib/time.ts";

test("Darwin 9 pm is stored as the correct UTC instant and round-trips to 21:00", () => {
  const instant=zonedDateTime({year:2026,month:10,day:3,hour:21,minute:0,second:0},"Australia/Darwin");
  assert.equal(instant.toISOString(),"2026-10-03T11:30:00.000Z");
  const local=zonedParts(instant,"Australia/Darwin");
  assert.equal(local.hour,21);
  assert.equal(local.minute,0);
  assert.equal(local.day,3);
});

test("reminder parser supports natural 'set the reminder' wording and recurring title cleanup", () => {
  const source=readFileSync(new URL("../lib/intelligence/assistant-tools.ts",import.meta.url),"utf8");
  assert.match(source,/set\\s\+\(\?:\(\?:a\|the\)/);
  assert.match(source,/every day\|everyday\|daily/);
  assert.match(source,/ring/);
});
