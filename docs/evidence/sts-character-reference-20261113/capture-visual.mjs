import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{pathToFileURL}from'node:url';
const input=path.resolve(process.argv[2]??'.artifacts/sts-character-reference-20261113/current-1');
process.argv[2]=input;process.argv[3]??='docs/evidence/sts-character-reference-20261113/visual-current-1';
let source=fs.readFileSync('F:/New folder/.worktrees/shared-run-hud/docs/evidence/shared-run-hud-20261113/capture-visual.mjs','utf8');
source=source.replace("from'../../../experiments/noncombat-review/renderer-ticker-patch.mjs'",`from${JSON.stringify(pathToFileURL(path.resolve('experiments/noncombat-review/renderer-ticker-patch.mjs')).href)}`)
 .replace('const deadline=Date.now()+15000','const deadline=Date.now()+60000')
 .replace("['blessing','map','battle']","['character']")
 .replaceAll('OFFLINE_SHARED_HUD_FIXTURE','OFFLINE_STS_CHARACTER_FIXTURE')
 .replace('headless-current-source-shared-run-hud','headless-original-sts-character-selection')
 .replace('same identity, hp, gold, potion faces, resource bar and utility style','original PC selection geometry and shared approved battle idle half-body')
 .replace("scenario+'-hud'","'character-select'")
 .replace("find(s.tree,scenario==='blessing'?'nodePanel':scenario==='map'?'mapPanel':'battlePanel')","find(s.tree,'characterPanel')");
const begin=source.indexOf("  if(scenario==='blessing'){");
const end=source.indexOf('  report.logs=s.logs;',begin);assert(begin>=0&&end>begin);
source=source.slice(0,begin)+`
  const panel=find(s.tree,'characterPanel');
  await tap(s,find(child(panel,'traveler'),'hit'));
  s=await shot('character-selected-idle','same approved battle figure, half-body; no constellation asset');
`+source.slice(end);
// Wait for the real portrait ready log, not just the root's ABYSS_UI ready.
source=source.replace("let s=await shot(","await waitState(s=>s.logs.some(l=>l.text?.includes('ABYSS_PORTRAIT selection phase=ready')));let s=await shot(");
const file=path.join(input,'capture-current.mjs');fs.writeFileSync(file,source);await import(pathToFileURL(file));
