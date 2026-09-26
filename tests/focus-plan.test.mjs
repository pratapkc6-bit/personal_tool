import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { planRequestSchema, readSavedPlan } from "../lib/intelligence/saved-plan.ts";
const uri = source => "data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(source)).toString("base64");
const planner = uri(readFileSync(new URL("../lib/intelligence/command-center.ts", import.meta.url), "utf8").replace('"./day-planner"', JSON.stringify(new URL("../lib/intelligence/day-planner.ts", import.meta.url).href)));
const schemaUrl = new URL("../lib/intelligence/saved-plan.ts", import.meta.url).href;
const source = readFileSync(new URL("../app/api/focus-plan/route.ts", import.meta.url), "utf8")
  .replace('import { getServerSession } from "next-auth";', 'const getServerSession = async () => globalThis.planFixture.session;')
  .replace('import { NextRequest, NextResponse } from "next/server";', 'const NextResponse = { json: (value, init) => Response.json(value, init) };')
  .replace('import { authOptions } from "@/lib/auth";', 'const authOptions = {};')
  .replace('import { db } from "@/lib/db";', 'const db = { setting: { findUnique: async args => { globalThis.planFixture.read = args; return { value: globalThis.planFixture.saved }; }, upsert: async args => { globalThis.planFixture.write = args; return args; }, deleteMany: async args => { globalThis.planFixture.deleted = args; } } };')
  .replace('import { buildAssistantContext } from "@/lib/intelligence/context-builder";', 'const buildAssistantContext = async userId => { globalThis.planFixture.contextUser = userId; return globalThis.planFixture.context; };')
  .replace('"@/lib/intelligence/command-center"', JSON.stringify(planner))
  .replace('"@/lib/intelligence/saved-plan"', JSON.stringify(schemaUrl));
const route = await import(uri(source));
const request = body => new Request("https://test.invalid/api/focus-plan", {method:"PUT",body:JSON.stringify(body),headers:{"Content-Type":"application/json"}});
const input = { title:"My focus",minutes:25,buffer:5 };
test("focus plan input rejects client-supplied times, invalid durations and blank titles", () => {
  assert.equal(planRequestSchema.safeParse({...input,sessions:[]}).success,false);
  for (const change of [{minutes:0},{minutes:91},{buffer:-1},{buffer:31},{title:"   "}]) assert.equal(planRequestSchema.safeParse({...input,...change}).success,false);
  assert.equal(readSavedPlan({title:"Corrupted"}),null);
});
test("all focus plan operations require an authenticated account", async () => {
  globalThis.planFixture = { session:null };
  assert.equal((await route.GET()).status,401);
  assert.equal((await route.PUT(request(input))).status,401);
  assert.equal((await route.DELETE()).status,401);
  assert.equal(globalThis.planFixture.write,undefined);
});
test("focus plan reads and clears only the authenticated user's setting", async () => {
  globalThis.planFixture = {session:{user:{id:"owner"}},saved:null};
  assert.deepEqual(await (await route.GET()).json(),{plan:null});
  assert.equal(globalThis.planFixture.read.where.userId_key.userId,"owner");
  await route.DELETE();
  assert.equal(globalThis.planFixture.deleted.where.userId,"owner");
});
test("saving rejects unverified calendars without writing to storage", async () => {
  globalThis.planFixture = {session:{user:{id:"owner"}},context:{generatedAt:new Date().toISOString(),timezone:"Australia/Darwin",calendarStatus:"unavailable",calendarEvents:[],deadlines:[],topPriorities:[],tasks:[],emailActions:[],lastGmailScanAt:null}};
  assert.equal((await route.PUT(request(input))).status,409);
  assert.equal(globalThis.planFixture.contextUser,"owner");
  assert.equal(globalThis.planFixture.write,undefined);
});
test("save recomputes future slots and binds the stored plan to the account", async () => {
  // Use tomorrow at 09:30 UTC so this fixture remains valid at every real test time.
  const future = new Date(Date.now()+86_400_000); future.setUTCHours(9,30,0,0);
  globalThis.planFixture = {session:{user:{id:"owner"}},context:{generatedAt:future.toISOString(),timezone:"UTC",calendarStatus:"available",calendarEvents:[],deadlines:[],topPriorities:[],tasks:[],emailActions:[],lastGmailScanAt:null}};
  const response = await route.PUT(request(input));
  assert.equal(response.status,200);
  const {plan} = await response.json();
  assert.equal(plan.sessions.length,6);
  assert.ok(plan.sessions.every(slot=>Date.parse(slot.start)>Date.now() && Date.parse(slot.end)-Date.parse(slot.start)===25*60_000));
  assert.equal(globalThis.planFixture.write.where.userId_key.userId,"owner");
  assert.equal(globalThis.planFixture.write.create.userId,"owner");
});
