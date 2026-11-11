// Re-read frozen inputs; this does not repeat SDK or device execution.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {embeddedScripts} from '../../scripts/native-script-inventory.mjs';
import {intervene} from './variants.mjs';
const [root,toolRoot,output]=process.argv.slice(2);
assert(root&&toolRoot&&output,'verify.mjs <private-experiment-directory> <MCP-root> <fresh-summary.json>');
assert(!fs.existsSync(output),'summary must be fresh');
const read=file=>JSON.parse(fs.readFileSync(file));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const sha=file=>digest(fs.readFileSync(file));
const wire=await import(pathToFileURL(path.join(toolRoot,'src/scene/wire.mjs')));
const variants={};
for(const mode of ['A','diff','tween']) {
 const reportPath=path.join(root,'paired-'+mode,'report.json'),report=read(reportPath);
 const directory=mode==='A'?path.join(root,'projected'):path.join(root,mode,'projected');
 const receiptPath=path.join(directory,'adapter-receipt.json'),receipt=read(receiptPath),save=read(receipt.output);
 assert.equal(sha(receipt.gil),receipt.gilSha256,'GIL changed');
 assert.equal(sha(receipt.output),receipt.saveSha256,'projection changed');
 assert.equal(report.identity.gilSha256,receipt.gilSha256);
 assert.equal(report.identity.projectionSha256,receipt.saveSha256);
 assert.equal(report.identity.workerSha256,sha(new URL('./run.mjs',import.meta.url)));
 assert.equal(report.status,'SDK_TRUE_V25_NATIVE_CONTROL_COUNT_PASS');
 assert.deepEqual(report.faults,[]);
 assert.equal(receipt.modifiedNativeOrLua,false);assert.equal(receipt.luaExact,true);
 const scripts=read(path.join(directory,'scripts-exact.json')).scripts;
 assert.equal(digest(JSON.stringify(scripts)),receipt.luaInventorySha256);
 assert.equal(scripts.length,save.assets.scripts.length);
 const actual=embeddedScripts({mapPath:receipt.gil,includeSource:true},wire).scripts;
 assert.deepEqual(actual,scripts.map(({name,file,source})=>({name,file,source})),'actual GIL Lua differs from inventory');
 for(const row of scripts) {
  const found=save.assets.scripts.filter(s=>s.guid===row.guid);
  assert.equal(found.length,1);assert.equal(found[0].source,row.source);assert.equal(found[0].path,row.file);
 }
 const closing=report.stages.find(s=>s.name==='engine-root-close').snapshot;
 assert.equal(closing.registeredModels,0);assert.equal(closing.createdTotal,closing.deletedTotal);
 variants[mode]={report,receipt,scripts,save,reportPath};
}
const a=variants.A;
const semantic=r=>Object.fromEntries(['hand','enemies','energy','turn','combatPhase','heroHp','cardIds','block'].map(k=>[k,r.beforeClose[k]??null]));
const identities={A:{gilSha256:a.receipt.gilSha256,projectionSha256:a.receipt.saveSha256,reportSha256:sha(a.reportPath)}};
for(const [mode,module] of [['diff','abyss_battle_render_actors'],['tween','abyss_feedback']]) {
 const b=variants[mode];
 assert.deepEqual(b.receipt.mountedValues,a.receipt.mountedValues,'mount parameters differ');
 assert.equal(b.report.identity.sdkExportSha256,a.report.identity.sdkExportSha256,'SDK differs');
 assert.deepEqual(b.report.environment.node,a.report.environment.node);
 assert.deepEqual(semantic(b.report),semantic(a.report),'gameplay result differs');
 const before=a.scripts.find(s=>s.name===module),after=b.scripts.find(s=>s.name===module);
 assert(before&&after);assert.equal(after.source,intervene(before.source,mode));
 assert.deepEqual(b.scripts.map(s=>s.name===module?{...s,source:before.source}:s),a.scripts,'extra source intervention');
 const normalized=structuredClone(b.save);
 normalized.assets.scripts.find(s=>s.guid===after.guid).source=before.source;
 // The existing adapter names its model after the input directory and records
 // the real GIL path. Check exact producer values before normalizing only these.
 for(const v of [a,b]) {
  assert.equal(v.save.meta.name,'Actual original-components GIL '+path.basename(path.dirname(v.receipt.gil)));
  assert.equal(v.save.assets.server.meta.sourceFile,v.receipt.gil);
  assert.equal(v.save.assets.client.meta.sourceFile,v.receipt.gil);
 }
 normalized.meta.name=a.save.meta.name;
 normalized.assets.server.meta.sourceFile=a.save.assets.server.meta.sourceFile;
 normalized.assets.client.meta.sourceFile=a.save.assets.client.meta.sourceFile;
 assert(isDeepStrictEqual(normalized,a.save),'non-intervention native model/resource/config differs');
 identities[mode]={gilSha256:b.receipt.gilSha256,projectionSha256:b.receipt.saveSha256,
  reportSha256:sha(b.reportPath),module,baselineModuleSha256:digest(before.source),interventionModuleSha256:digest(after.source),
  originSourceCommit:b.report.identity.sourceCommit,originBuildId:b.report.identity.buildId,
  originPayloadDigest:b.report.identity.payloadDigest,experimentalPayloadDigest:'NOT_A_PRODUCTION_REBUILD'};
}
const nameKey='容器节点/stage/battlePanel/actorLayer/AbyssMonsterActor/name:';
const requests=(mode,layer,key)=>variants[mode].report.nativeControlCounts['warm-ten-cards'][layer]?.[nameKey+key]?.attempts??0;
const diff={status:'EARLY_STOPPED',decision:'NO-GO',frames:600,actors:2,
 A:{writes:requests('A','setMethod','SetVisible'),reads:requests('A','propertyRead','visible')},
 B:{writes:requests('diff','setMethod','SetVisible'),reads:requests('diff','propertyRead','visible')}};
assert.equal(diff.A.writes,1200);assert.equal(diff.B.reads,1200);assert.equal(diff.B.writes,0);
assert.equal(diff.A.writes+diff.A.reads,diff.B.writes+diff.B.reads);
const curve=mode=>variants[mode].report.rows.filter(r=>r.playedCard).map(r=>r.playedCard);
const ac=curve('A'),bc=curve('tween');assert.equal(ac.length,bc.length);
const firstDifference=ac.findIndex((v,i)=>v.visible&&bc[i].visible&&Math.abs(v.sx-bc[i].sx)>1e-9);
assert(firstDifference>=0,'expected negative Tween equivalence result disappeared');
const firstHidden=ac.findIndex((v,i)=>i>firstDifference&&!v.visible);
const tween={status:'EARLY_STOPPED',decision:'NO-GO',sampleIndex:firstDifference,A:ac[firstDifference],B:bc[firstDifference],
 firstHiddenSample:{A:ac[firstHidden],B:bc[firstHidden]},curveSamples:ac.length,
 scope:'Control bridge calls only; game.Tween and Tween lifecycle/internal engine writes were not counted. No total-native-call saving claim.'};
const summary={schemaVersion:1,status:'EARLY_STOPPED',singleInterventionIdentity:'PASS',identities,diff,tween,
 environment:a.report.environment,timing:'REPORT_ONLY: one sequential sample each; readiness uses wall-clock budgets; observer and system load uncontrolled.',
 reportOnlyWarmTimings:Object.fromEntries(['A','diff','tween'].map(mode=>[mode,variants[mode].report.stages.find(s=>s.name==='warm-ten-cards').stepTiming])),
 completed:['actual GIL projection and complete Lua/mount/native-tree pairing','10 cards/2 enemies seed17','actual SDK cancel/play/enemy-turn pointers','SDK root close after animation completion','Fengari false/throw/other-writer retry and cancel/disable probes'],
 notRun:['20 real page round trips','target invalidation','late callback injection','native Tween destruction during animation','cold/warm repeated or order-balanced timing runs','renderer visual acceptance','official import/ready','PC and phone frame time/input latency/capacity'],
 deviceStatus:'UNVERIFIED',productionAdoption:'NO',baselineIdentityNote:'B reports retain A buildId/payloadDigest as origin metadata, not a rebuilt B payload identity. GIL/module hashes above identify actual interventions.'};
fs.writeFileSync(output,JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:summary.status,identity:summary.singleInterventionIdentity,diff:diff.decision,tween:tween.decision}));
