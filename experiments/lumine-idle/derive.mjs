// Explicit experimental overlay schema; never inherits a parent's load receipt.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';import {pathToFileURL} from 'node:url';
import {toLua} from '../../scripts/build-lua-data.mjs';
import {writeScriptBatch} from '../../scripts/native-script-batch.mjs';
import {embeddedScripts} from '../../scripts/native-script-inventory.mjs';
import {loadNativeUiEncoder} from '../../scripts/native-ui-encoder.mjs';
import {runNativeClientCheck} from '../../scripts/native-client-check.mjs';
const [parentPath,assetPath,output]=process.argv.slice(2);assert(parentPath&&assetPath&&output);
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const record=p=>({path:path.resolve(p),sha256:hash(fs.readFileSync(p)),bytes:fs.statSync(p).size});
const parent=read(parentPath),asset=assetPath==='-'?null:read(assetPath);
assert.equal(hash(fs.readFileSync(parent.candidate.path)),parent.candidate.sha256);
assert(!parent.experimentalOverlay,'overlay parent must be a normal source build');
const out=path.resolve(output);fs.mkdirSync(out,{recursive:true});
const tool='D:/MiliastraTools/genshin-miliastra-mcp',wire=await import(pathToFileURL(tool+'/src/scene/wire.mjs'));
const {native}=await loadNativeUiEncoder(tool),{luaSyntaxError}=await import(pathToFileURL(tool+'/src/client-check.mjs'));
const scripts=embeddedScripts({mapPath:parent.candidate.path,includeSource:true},wire).scripts;
const assets=scripts.find(s=>s.name==='abyss_traveler_portrait_assets'),entry=scripts.find(s=>s.name==='abyss_ui');
assert(assets&&entry&&entry.source.includes(parent.buildId));
const buildId=randomUUID(),updates=[],inputFiles=['experiments/lumine-idle/derive.mjs','experiments/lumine-idle/convert.py',
 'art/characters/traveler-geo/idle-approved-v1/lumine_static_approved.png'];
for(const name of ['abyss_traveler_portraits','abyss_lumine_idle','abyss_feedback_actor_painter']){
 const file='src/lua/'+name+'.lua';assert(scripts.some(s=>s.name===name));
 updates.push({name,source:fs.readFileSync(file,'utf8')});inputFiles.push(file);
}
if(asset){updates.push({name:assets.name,source:assets.source.trimEnd().replace(/\}\s*$/,',battleApprovedIdle='+toLua(asset)+'\n}')});inputFiles.push(assetPath)}
updates.push({name:entry.name,source:entry.source.replaceAll(parent.buildId,buildId)});
const gil=writeScriptBatch(parent.candidate.path,updates,out,{...wire,clientScriptRecord:native.clientScriptRecord,luaSyntaxError});
const candidate=path.join(out,'candidate.gil');fs.renameSync(gil,candidate);
const checked=runNativeClientCheck({mapPath:candidate},tool);assert(checked.ok,JSON.stringify(checked));
const readback=embeddedScripts({mapPath:candidate,includeSource:true},wire).scripts;assert.equal(readback.length,scripts.length);
for(const s of readback)assert.equal(s.source,updates.find(u=>u.name===s.name)?.source??scripts.find(p=>p.name===s.name)?.source);
const inputs=inputFiles.map(record),parentReceipt=record(parentPath);
const receipt={schemaVersion:1,kind:'experimental-native-idle-overlay',buildId,sourceCommit:parent.sourceCommit,sourceDirty:true,
 parentReceipt:{...parentReceipt,buildId:parent.buildId,gilSha256:parent.candidate.sha256,payloadDigest:parent.payloadDigest},
 inputs,payloadDigest:hash(JSON.stringify({parentReceipt,inputs})),
 experimentalOverlay:{profile:asset?'approved-idle-v1':'temporary-pixel-baseline',images:asset?.count??57,bands:asset?.bands.length??0,
  scope:'offline comparison; not a standard production build receipt or release approval',
  moduleChanges:updates.map(u=>({name:u.name,beforeSha256:hash(scripts.find(s=>s.name===u.name).source),sha256:hash(u.source)}))},
 moduleDigests:Object.fromEntries(readback.map(s=>[s.name,hash(s.source)])),mapPath:candidate,
 candidate:{path:candidate,sha256:hash(fs.readFileSync(candidate)),bytes:fs.statSync(candidate).size},
 check:checked,statuses:{build:'pass',readback:'pass',officialImport:'not_run',playtest:'not_run',devices:'not_run'},
 completedAt:new Date().toISOString(),receiptPath:path.join(out,'candidate.json')};
fs.writeFileSync(receipt.receiptPath,JSON.stringify(receipt,null,2));console.log(JSON.stringify({receipt:receipt.receiptPath,images:receipt.experimentalOverlay.images,sha256:receipt.candidate.sha256}));
