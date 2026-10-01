import assert from "node:assert/strict";
import test from "node:test";
import { analyzeCalendar } from "../lib/calendar-intelligence.ts";

const now=new Date("2026-10-01T00:00:00.000Z");

test("detects overlapping calendar events",()=>{
  const result=analyzeCalendar([
    {id:"1",title:"A",start:"2026-10-01T01:00:00.000Z",end:"2026-10-01T02:00:00.000Z"},
    {id:"2",title:"B",start:"2026-10-01T01:30:00.000Z",end:"2026-10-01T03:00:00.000Z"}
  ],now);
  assert.equal(result.conflicts.length,1);
  assert.equal(result.nextEvent?.title,"A");
});

test("merges overlaps when calculating busy minutes",()=>{
  const result=analyzeCalendar([
    {id:"1",title:"A",start:"2026-10-01T09:00:00.000Z",end:"2026-10-01T10:00:00.000Z"},
    {id:"2",title:"B",start:"2026-10-01T09:30:00.000Z",end:"2026-10-01T10:30:00.000Z"}
  ],new Date("2026-10-01T08:00:00.000Z"),8,20);
  assert.ok(result.busyMinutes<=120);
  assert.ok(result.loadScore>=0&&result.loadScore<=100);
});
