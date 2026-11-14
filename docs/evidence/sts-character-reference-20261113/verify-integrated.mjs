import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{pathToFileURL}from'node:url';import{gunzipSync}from'node:zlib';import{createHash}from'node:crypto';
const dir=path.resolve(process.argv[2]??'docs/evidence/sts-character-reference-20261113/visual-integrated');
const input=path.resolve(process.argv[3]??'.artifacts/sts-character-reference-20261113/integrated-final');
process.argv[2]=dir;process.argv[3]=input;
const report=JSON.parse(fs.readFileSync(path.join(dir,'render-receipt.json')));
assert.deepEqual(report.sourceDrift,[]);assert.equal(report.shots.length,5);
const selectionNames=['character-select','character-selected-idle','character-returned-selection'];
// Reuse the existing ready/crop/whitelist/hash/render-pass admission verbatim,
// selecting only its three selection pages from this expanded five-shot run.
let verifier=fs.readFileSync('docs/evidence/sts-character-reference-20261113/verify-visual.mjs','utf8');
assert(verifier.includes('assert.equal(report.shots.length,2)'));
verifier=verifier.replace('assert.equal(report.shots.length,2)','assert.equal(report.shots.length,5)')
 .replace('for(const shot of report.shots){',`for(const shot of report.shots.filter(s=>${JSON.stringify(selectionNames)}.includes(s.name))){`);
const reused=path.join(input,'verify-integrated-selection.mjs');fs.writeFileSync(reused,verifier);await import(pathToFileURL(reused));
const result=JSON.parse(fs.readFileSync(path.join(dir,'verification.json')));
assert.equal(result.checks.length,3);assert.equal(result.checks[0].images,result.checks[2].images,'restored selection changed its source crop');
const hash=b=>createHash('sha256').update(b).digest('hex');
function find(n,key){if(Array.isArray(n)){for(const c of n){const f=find(c,key);if(f)return f;}return;}if(n.name===key)return n;return find(n.children??n.controls??[],key);}
const child=(n,key)=>n.children?.find(c=>c.name===key);
const grid=find(JSON.parse(fs.readFileSync(path.join(input,'generated/game-ui.json'))),'pileGrid');
assert.equal(grid.grid.columns,5);assert.equal(grid.itemTemplate,'AbyssBattlePileCard');
const browserChecks=[];
for(const shot of report.shots){
 const bytes=fs.readFileSync(path.join(dir,shot.name+'.png'));assert.equal(hash(bytes),shot.sha256);
 assert(shot.frontendRenderPasses.after-shot.frontendRenderPasses.before>=3);
 const state=JSON.parse(gunzipSync(fs.readFileSync(path.join(dir,shot.name+'.state.json.gz'))));
 assert(!find(state.tree,'pageReveal').visible,'shot preceded actual page reveal');
 assert(!state.logs.some(l=>l.level==='lua-error'||/ABYSS_UI failed/.test(l.text)));
 const audits=state.logs.filter(l=>l.text?.includes('OFFLINE_CHARACTER_BROWSER_AUDIT'));
 assert(audits.length>0);assert(audits.every(l=>l.text.includes('run=none runCreations=0 randomCalls=0 loadoutDrift=false')));
 if(selectionNames.includes(shot.name))continue;
 const deck=find(state.tree,'deckPanel');assert(deck.visible&&!find(state.tree,'characterPanel').visible);
 const latest=audits.at(-1).text;assert(latest.includes('browser=true starterCards=10 browserCards=10'));
 if(shot.name==='character-starter-browser'){
  assert(child(deck,'pileGrid').visible&&!child(deck,'details').visible);
  assert(find(child(deck,'pileChrome'),'heading').text.includes('初始牌组'));
 }else{assert.equal(shot.name,'character-starter-detail');assert(child(deck,'details').visible&&!child(deck,'pileGrid').visible);}
 assert(child(deck,'pileReturn').visible);browserChecks.push({name:shot.name,pngSha256:shot.sha256,sharedFiveColumnTemplate:true,cards:10,noRunOrRng:true,loadoutDrift:false});
}
result.browserChecks=browserChecks;result.sourceDrift=report.sourceDrift;
result.reusedAdmission={path:'verify-visual.mjs',sha256:hash(fs.readFileSync('docs/evidence/sts-character-reference-20261113/verify-visual.mjs')),adaptation:'five-shot receipt; original selection checks applied to three selection shots'};
fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
