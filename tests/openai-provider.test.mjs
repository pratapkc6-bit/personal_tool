import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source=fs.readFileSync(new URL("../lib/openai-provider.ts",import.meta.url),"utf8");

test("OpenAI provider keeps API key server-side",()=>{
  assert.match(source,/process\.env\.OPENAI_API_KEY/);
  assert.doesNotMatch(source,/NEXT_PUBLIC_OPENAI/);
  assert.match(source,/store:false/);
});

test("OpenAI provider defaults to low-cost Luna and caps output",()=>{
  assert.match(source,/gpt-6-luna/);
  assert.match(source,/max_output_tokens:1000/);
  assert.match(source,/reasoning:\{effort:"medium"\}/);
});

test("OpenAI provider sends compact derived context instead of raw Gmail bodies",()=>{
  assert.match(source,/emailActions:context\.emailActions\.slice/);
  assert.doesNotMatch(source,/messageBody|rawBody|gmailBody|bodyText/);
  assert.match(source,/raw Gmail bodies/);
});

test("Zoro instructions preserve deterministic write-action boundary",()=>{
  assert.match(source,/deterministic action layer handles writes and confirmation separately/);
  assert.match(source,/Never claim you sent email, changed Calendar, created a task/);
});
