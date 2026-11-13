import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{pathToFileURL}from'node:url';import{createHash}from'node:crypto';
const input=path.resolve(process.argv[2]??'.artifacts/sts-character-reference-20261113/integrated-a73043a');
process.argv[2]=input;process.argv[3]??='docs/evidence/sts-character-reference-20261113/visual-integrated';
const hash=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(fs.readFileSync(path.join(input,'receipt.json')));
const drift=()=>Object.entries(receipt.inputs).filter(([p,sha])=>hash(fs.readFileSync(p))!==sha).map(([p])=>p);
assert.deepEqual(drift(),[],'source changed since prepare');
let source=fs.readFileSync('docs/evidence/shared-run-hud-20261113/capture-visual.mjs','utf8');
source=source.replace("from'../../../experiments/noncombat-review/renderer-ticker-patch.mjs'",`from${JSON.stringify(pathToFileURL(path.resolve('experiments/noncombat-review/renderer-ticker-patch.mjs')).href)}`)
 .replace('const deadline=Date.now()+15000','const deadline=Date.now()+60000')
 .replace("['blessing','map','battle']","['character']")
 .replaceAll('OFFLINE_SHARED_HUD_FIXTURE','OFFLINE_STS_CHARACTER_FIXTURE')
 .replace('headless-current-source-shared-run-hud','headless-integrated-character-shared-starter-browser')
 .replace("scenario+'-hud'","'character-select'")
 .replace('same identity, hp, gold, potion faces, resource bar and utility style','integrated original PC selection; completed shared approved idle half-body')
 .replace("find(s.tree,scenario==='blessing'?'nodePanel':scenario==='map'?'mapPanel':'battlePanel')","find(s.tree,'characterPanel')");
const begin=source.indexOf("  if(scenario==='blessing'){");const end=source.indexOf('  report.logs=s.logs;',begin);assert(begin>=0&&end>begin);
source=source.slice(0,begin)+`
  const clear=s=>!find(s.tree,'pageReveal').visible;
  const panel=find(s.tree,'characterPanel');
  await tap(s,find(child(panel,'traveler'),'hit'));await waitState(clear);
  s=await shot('character-selected-idle','same live approved battle source, original roster slot; no constellation');
  await tap(s,find(child(child(find(s.tree,'characterPanel'),'details'),'deckOpen'),'hit'));
  await waitState(s=>find(s.tree,'deckPanel').visible&&clear(s));
  s=await shot('character-starter-browser','actual production starter deck through shared five-column pileGrid');
  const deck=find(s.tree,'deckPanel');assert(child(deck,'pileGrid').visible);
  const cardCell=n=>child(n,'face')&&child(n,'hit')?n:(n.children??[]).map(cardCell).find(Boolean);
  const cell=cardCell(child(deck,'pileGrid'));assert(cell,'actual shared grid card required');
  await tap(s,child(cell,'hit'));await waitState(s=>child(find(s.tree,'deckPanel'),'details').visible&&clear(s));
  s=await shot('character-starter-detail','card detail and upgrade preview use existing shared browser');
  await tap(s,find(child(find(s.tree,'deckPanel'),'pileReturn'),'hit'));
  s=await waitState(s=>!child(find(s.tree,'deckPanel'),'details').visible&&clear(s));
  await tap(s,find(child(find(s.tree,'deckPanel'),'pileReturn'),'hit'));
  await waitState(s=>!find(s.tree,'deckPanel').visible&&find(s.tree,'characterPanel').visible&&clear(s));
  s=await shot('character-returned-selection','shared return restores original selection and unchanged loadout, without Run/RNG');
`+source.slice(end);
source=source.replace("let s=await shot(","await waitState(s=>s.logs.some(l=>l.text?.includes('ABYSS_PORTRAIT selection phase=ready'))&&!find(s.tree,'pageReveal').visible);let s=await shot(");
const file=path.join(input,'capture-integrated-current.mjs');fs.writeFileSync(file,source);await import(pathToFileURL(file));
const reportPath=path.resolve(process.argv[3],'render-receipt.json');const report=JSON.parse(fs.readFileSync(reportPath));
report.sourceDrift=drift();assert.deepEqual(report.sourceDrift,[],'source changed during capture');
report.fixtureAssertions='Production select/browser commands; after Host construction every refreshed frame asserts no Run, no RNG call and unchanged loadout projection.';
fs.writeFileSync(reportPath,JSON.stringify(report,null,2));
