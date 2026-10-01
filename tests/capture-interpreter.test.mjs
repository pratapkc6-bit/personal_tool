import assert from "node:assert/strict";
import test from "node:test";
import { interpretCapture } from "../lib/capture-interpreter.ts";

const now=new Date("2026-10-01T00:00:00.000Z");

test("detects reminder intent and future date",()=>{
  const x=interpretCapture("Remind me to call the clinic tomorrow at 2pm",now);
  assert.equal(x.mode,"reminder");
  assert.ok(x.remindAt);
  assert.match(x.title,/call the clinic/i);
});

test("detects daily recurrence",()=>{
  const x=interpretCapture("Remind me every day at 9pm to review tomorrow",now);
  assert.equal(x.recurrence,"DAILY");
  assert.ok(x.recurrenceTime);
});

test("detects urgent task priority",()=>{
  const x=interpretCapture("urgent submit assignment Friday",now);
  assert.equal(x.mode,"task");
  assert.equal(x.priority,"URGENT");
  assert.equal(x.category,"STUDY");
});

test("detects work category",()=>{
  const x=interpretCapture("send manager the roster",now);
  assert.equal(x.category,"WORK");
});

test("plain capture remains a task",()=>{
  const x=interpretCapture("buy groceries",now);
  assert.equal(x.mode,"task");
  assert.equal(x.dueAt,null);
  assert.equal(x.priority,"MEDIUM");
});
