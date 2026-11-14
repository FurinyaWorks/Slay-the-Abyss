import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{pathToFileURL}from'node:url';import{createHash}from'node:crypto';
const out=path.resolve(process.argv[2]??'.artifacts/sts-character-reference-20261113/integrated-a73043a');
const helper=out+'-entry';assert(!fs.existsSync(helper));fs.mkdirSync(helper,{recursive:true});
let source=fs.readFileSync('docs/evidence/shared-run-hud-20261113/prepare-visual.mjs','utf8');
source=source.replaceAll('docs/evidence/shared-run-hud-20261113','docs/evidence/sts-character-reference-20261113')
 .replace("['blessing','map','battle']","['character']")
 .replaceAll("'run-fixture.lua'","'run-integrated-fixture.lua'")
 .replaceAll("'source-manifest.json'","'source-integrated-manifest.json'")
 .replaceAll('seed42 opening blessing/map/combat fixtures, sparse potion inventory and deterministic 17-card permanent deck','production traveler/Geo selection and shared starter browser; no Run/RNG creation or loadout drift');
fs.writeFileSync(path.join(helper,'prepare.mjs'),source);process.argv[2]=out;
await import(pathToFileURL(path.join(helper,'prepare.mjs')));
const receipt=JSON.parse(fs.readFileSync(path.join(out,'receipt.json')));
receipt.evidenceScripts=Object.fromEntries(['prepare-integrated.mjs','capture-integrated.mjs','verify-integrated.mjs','run-integrated-fixture.lua'].map(name=>[name,createHash('sha256').update(fs.readFileSync(path.join('docs/evidence/sts-character-reference-20261113',name))).digest('hex')]));
fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2));
fs.writeFileSync('docs/evidence/sts-character-reference-20261113/source-integrated-manifest.json',JSON.stringify(receipt,null,2));
