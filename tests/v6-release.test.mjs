import assert from "node:assert/strict";
import fs from "node:fs";

const doc=fs.readFileSync(new URL("../docs/ZORO_V6_100_UPGRADES.md",import.meta.url),"utf8");
const items=doc.split("\n").filter(line=>/^\d+\.\s/.test(line));
assert.equal(items.length,100,"v6 manifest must contain exactly 100 numbered upgrades");

const capture=fs.readFileSync(new URL("../components/quick-capture.tsx",import.meta.url),"utf8");
for(const token of ["Natural language","/api/capture/interpret","zoro:data-changed","Create daily reminder"])assert.ok(capture.includes(token),token);

const command=fs.readFileSync(new URL("../components/nexus-command.tsx",import.meta.url),"utf8");
for(const token of ["Capture task","Create reminder","ArrowDown","System Health"])assert.ok(command.includes(token),token);

const search=fs.readFileSync(new URL("../app/api/search/route.ts",import.meta.url),"utf8");
for(const token of ["reminder.findMany","actionProposal.findMany","contextNode.findMany"])assert.ok(search.includes(token),token);

console.log("PASS Zoro v6 100-point release contract");
