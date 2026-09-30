import assert from "node:assert/strict";
import fs from "node:fs";

const schema=fs.readFileSync(new URL("../prisma/schema.prisma",import.meta.url),"utf8");
const engine=fs.readFileSync(new URL("../lib/alert-engine.ts",import.meta.url),"utf8");
const settings=fs.readFileSync(new URL("../lib/notification-settings.ts",import.meta.url),"utf8");
const push=fs.readFileSync(new URL("../lib/push.ts",import.meta.url),"utf8");
const cron=fs.readFileSync(new URL("../app/api/cron/secretary/route.ts",import.meta.url),"utf8");
const ui=fs.readFileSync(new URL("../components/notification-center.tsx",import.meta.url),"utf8");
const runtime=fs.readFileSync(new URL("../components/notification-runtime.tsx",import.meta.url),"utf8");
const sw=fs.readFileSync(new URL("../public/zoro-sw.js",import.meta.url),"utf8");
const vercel=JSON.parse(fs.readFileSync(new URL("../vercel.json",import.meta.url),"utf8"));

for(const token of ["PushSubscription","ringSeconds","snoozedUntil","deliveredAt"])assert.ok(schema.includes(token),token);
for(const token of ["ntHolidays","nepaliCalendar","importantGmail","deadlines","followups","calendar","weather","personalReminders"])assert.ok(settings.includes(token),token);
for(const token of ["REMINDER_DUE","IMPORTANT_EMAIL","TASK_DEADLINE","NT_HOLIDAY_TODAY","DARWIN_WEATHER_WATCH"])assert.ok(engine.includes(token),token);
assert.ok(push.includes("webpush.sendNotification"));
assert.ok(cron.includes("runAlertEngine"));
assert.ok(ui.includes("Test 3-sec alarm"));
assert.ok(ui.includes("What may notify me?"));
assert.ok(runtime.includes("playZoroAlarm"));
assert.ok(sw.includes('addEventListener("push"'));
assert.deepEqual(vercel.crons,[{path:"/api/cron/secretary",schedule:"0 21 * * *"}]);
console.log("PASS Zoro notification and alert engine contracts");
