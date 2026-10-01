import assert from "node:assert/strict";
import fs from "node:fs";

const doc=fs.readFileSync(new URL("../docs/ZORO_V7_50_UPGRADES.md",import.meta.url),"utf8");
const items=doc.split("\n").filter(line=>/^\d+\.\s/.test(line));
assert.equal(items.length,50,"v7 manifest must contain exactly 50 numbered changes");

const briefing=fs.readFileSync(new URL("../lib/briefing-engine.ts",import.meta.url),"utf8");
for(const token of ["nextAction","calendarConflicts","gmailScanAgeHours","reminders24h"])assert.ok(briefing.includes(token),token);

const waiting=fs.readFileSync(new URL("../lib/waiting-radar.ts",import.meta.url),"utf8");
for(const token of ["overdue","dueToday","upcoming","unscheduled","longest"])assert.ok(waiting.includes(token),token);

const inbox=fs.readFileSync(new URL("../lib/inbox-triage.ts",import.meta.url),"utf8");
for(const token of ["due24","security","aging","senderHotspots","scanAgeHours"])assert.ok(inbox.includes(token),token);

const shell=fs.readFileSync(new URL("../components/app-shell.tsx",import.meta.url),"utf8");
assert.ok(shell.includes("ConnectivityBanner"));

console.log("PASS Zoro v7 exact 50-change release contract");
