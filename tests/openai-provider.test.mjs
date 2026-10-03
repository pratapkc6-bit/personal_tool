import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source=fs.readFileSync(new URL("../lib/openai-provider.ts",import.meta.url),"utf8");

test("OpenAI provider keeps API key server-side",()=>{
  assert.match(source,/process\.env\.OPENAI_API_KEY/);
  assert.doesNotMatch(source,/NEXT_PUBLIC_OPENAI/);
  assert.match(source,/store:false/);
});

test("OpenAI provider defaults to low-cost Luna and adapts reasoning",()=>{
  assert.match(source,/gpt-6-luna/);
  assert.match(source,/reasoningEffort:"high"/);
  assert.match(source,/reasoningEffort:"medium"/);
  assert.match(source,/reasoningEffort:"low"/);
  assert.match(source,/maxOutputTokens:1400/);
  assert.match(source,/maxOutputTokens:1000/);
});

test("OpenAI provider sends compact derived context instead of raw Gmail bodies",()=>{
  assert.match(source,/emailActions:context\.emailActions\.slice/);
  assert.match(source,/lastGmailScanAt:context\.lastGmailScanAt/);
  assert.match(source,/calendarHorizon:context\.calendarHorizon/);
  assert.doesNotMatch(source,/messageBody|rawBody|gmailBody|bodyText/);
  assert.match(source,/raw Gmail bodies/);
});

test("Zoro instructions improve planning without weakening action safety",()=>{
  assert.match(source,/schedule conflicts, freshness, and dependencies/);
  assert.match(source,/Distinguish known facts from suggestions or estimates/);
  assert.match(source,/deterministic action layer handles writes and confirmation separately/);
  assert.match(source,/Never claim an external action completed unless the tool layer reports success/);
});
