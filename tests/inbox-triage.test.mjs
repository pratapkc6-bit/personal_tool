import assert from "node:assert/strict";
import test from "node:test";
import { buildInboxTriage } from "../lib/inbox-triage.ts";

const now=new Date("2026-10-01T12:00:00.000Z");

test("classifies urgent due security waiting and aging mail",()=>{
  const items=[
    {id:"1",sender:"Boss",classification:"WORK",requiresAction:true,importance:"URGENT",deadlineAt:new Date("2026-10-01T18:00:00.000Z"),receivedAt:new Date("2026-09-27T12:00:00.000Z"),processedAt:new Date("2026-10-01T11:00:00.000Z")},
    {id:"2",sender:"Security",classification:"SECURITY",requiresAction:false,importance:"HIGH",deadlineAt:null,receivedAt:now,processedAt:now},
    {id:"3",sender:"Recruiter",classification:"WAITING",requiresAction:false,importance:"LOW",deadlineAt:null,receivedAt:now,processedAt:now}
  ];
  const result=buildInboxTriage(items,now);
  assert.equal(result.counts.urgent,1);
  assert.equal(result.counts.due24,1);
  assert.equal(result.counts.security,1);
  assert.equal(result.counts.waiting,1);
  assert.equal(result.counts.aging,1);
  assert.equal(result.senderHotspots[0].sender,"Boss");
});
