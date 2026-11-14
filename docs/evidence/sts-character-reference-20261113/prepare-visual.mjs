import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{pathToFileURL}from'node:url';
const out=path.resolve(process.argv[2]??'.artifacts/sts-character-reference-20261113/current-1');
const helper=out+'-entry';assert(!fs.existsSync(helper));fs.mkdirSync(helper,{recursive:true});
let source=fs.readFileSync('docs/evidence/shared-run-hud-20261113/prepare-visual.mjs','utf8');
source=source.replaceAll('docs/evidence/shared-run-hud-20261113','docs/evidence/sts-character-reference-20261113')
 .replace("['blessing','map','battle']","['character']")
 .replaceAll('seed42 opening blessing/map/combat fixtures, sparse potion inventory and deterministic 17-card permanent deck','production traveler/Geo selection only; no Run; shared approved battle idle crop');
fs.writeFileSync(path.join(helper,'prepare.mjs'),source);process.argv[2]=out;
await import(pathToFileURL(path.join(helper,'prepare.mjs')));
