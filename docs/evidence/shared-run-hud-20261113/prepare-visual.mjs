import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL}from'node:url';
import {gunzipSync}from'node:zlib';
import {createHash}from'node:crypto';
const evidence='docs/evidence/shared-run-hud-20261113';
const out=path.resolve(process.argv[2]??'.artifacts/shared-run-hud-20261113/current');
assert(!fs.existsSync(out),'fresh output required');
const pipeline=out+'-adapter';fs.mkdirSync(pipeline,{recursive:true});
const adapter=path.join(pipeline,'readback-adapter.mjs');
fs.writeFileSync(adapter,gunzipSync(fs.readFileSync('docs/evidence/battle-piles-final-20261111/readback-adapter.mjs.gz')));
let source=fs.readFileSync('docs/evidence/shop-deck-parity-20261112/prepare-visual.mjs','utf8');
source=source.replaceAll('docs/evidence/shop-deck-parity-20261112',evidence)
 .replace("fs.readFileSync('.artifacts/shop-deck-parity-20261112/pipeline/readback-adapter.mjs','utf8')",`fs.readFileSync(${JSON.stringify(adapter)},'utf8')`)
 .replace("'shop-fixture.lua'","'run-fixture.lua'")
 .replace("['prepare-visual.mjs','capture-visual.mjs','verify-evidence.mjs','shop-fixture.lua']","['prepare-visual.mjs','capture-visual.mjs','run-fixture.lua']");
source=source.replace(/receipt.evidenceScripts=.*?;\r?\n/,'');
source=source.replace('canonical seed42 reachable shop and deterministic 17-card permanent deck','seed42 opening blessing/map/combat fixtures, sparse potion inventory and deterministic 17-card permanent deck');
process.argv[2]=out;
fs.writeFileSync(path.join(pipeline,'prepare-current.mjs'),source);
await import(pathToFileURL(path.join(pipeline,'prepare-current.mjs')));
const base=JSON.parse(fs.readFileSync(path.join(out,'current-shop.save.json')));
const receipt=JSON.parse(fs.readFileSync(path.join(out,'receipt.json')));
const hash=b=>createHash('sha256').update(b).digest('hex');
receipt.scenarios={};
for(const scenario of ['blessing','map','battle']){
 const save=structuredClone(base),script=save.assets.scripts.find(s=>s.path==='abyss_game_ui.lua');
 script.source=script.source.replace("local scenario='blessing'",`local scenario='${scenario}'`);
 const bytes=Buffer.from(JSON.stringify(save)),name=`current-${scenario}.save.json`;
 fs.writeFileSync(path.join(out,name),bytes);receipt.scenarios[scenario]={file:name,sha256:hash(bytes),startupSha256:hash(script.source)};
}
fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2));
fs.writeFileSync(path.join(evidence,'source-manifest.json'),JSON.stringify(receipt,null,2));
