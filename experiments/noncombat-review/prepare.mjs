// Actual GIL readback, reusing the validated battle preview adapter unchanged
// apart from input locations, expected inventory counts, and its proven defaults.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {loadNativeUiEncoder} from '../../scripts/native-ui-encoder.mjs';
import {embeddedScripts} from '../../scripts/native-script-inventory.mjs';
const [candidateArg,outArg,adapterArg]=process.argv.slice(2);
assert(candidateArg&&outArg&&adapterArg,'Usage: prepare.mjs <candidate.json> <new-output> <existing validated adapter.mjs>');
const root=process.cwd(),candidatePath=path.resolve(candidateArg),out=path.resolve(outArg),pinned=path.join(out,'readback');
assert(!fs.existsSync(out),'choose a new output directory');fs.mkdirSync(pinned,{recursive:true});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const candidate=JSON.parse(fs.readFileSync(candidatePath)),mapPath=candidate.candidate.path;
assert.equal(hash(fs.readFileSync(mapPath)),candidate.candidate.sha256);
const tool=process.env.MILIASTRA_MCP_ROOT??'D:/MiliastraTools/genshin-miliastra-mcp';
const {native}=await loadNativeUiEncoder(tool),wire=await import(pathToFileURL(path.join(tool,'src/scene/wire.mjs')));
const write=(name,value)=>fs.writeFileSync(path.join(pinned,name+'.json'),JSON.stringify(value));
const scripts=embeddedScripts({mapPath,includeSource:true},wire);
for(const script of scripts.scripts)assert.equal(hash(script.source),candidate.moduleDigests[script.name]);
write('scripts',scripts);const ui=native.getClientUi({mapPath,ui:'SlayTheAbyss'});write('ui',ui);
const names=new Set(['AbyssDeckCard','AbyssMonsterActor','AbyssMonsterPower','AbyssReadyCardImage','AbyssReadyCardGroup']);
function collect(node){for(const key of ['itemTemplate','template'])if(node[key])names.add(node[key]);for(const child of node.children??node.controls??[])collect(child)}
collect(ui.interface);
for(const name of names){const result=native.getClientUi({mapPath,template:name});assert.equal(result.template.name,name);collect(result.template);write(name,result)}
write('readback-receipt',{ok:true,sourceCommit:candidate.sourceCommit,candidate:{sha256Before:candidate.candidate.sha256}});
let source=fs.readFileSync(adapterArg,'utf8');
const adapterSourceSha256=hash(source);
assert.equal(adapterSourceSha256,'bf6a46a780905b2693d2f0060a2d8f610c0ac5478bf9f3ad25bea2d50fc5a152','existing validated adapter identity changed');
source=source.replace(/const root=.*?out=.*?;/,`const root=${JSON.stringify(root)},out=${JSON.stringify(out)};`)
 .replace(/const pinned=.*?;/,`const pinned=${JSON.stringify(pinned)};`)
 .replace(/const candidatePath=.*?;/,`const candidatePath=${JSON.stringify(candidatePath)};`)
 .replaceAll('templateRecords.length!==5',`templateRecords.length!==${names.size}`).replaceAll('.size!==5',`.size!==${names.size}`)
 .replace(/inverse.scripts.length!==\d+/g,'inverse.scripts.length!==scripts.length')
 .replace(/inverse.templates.length!==\d+/g,'inverse.templates.length!==templateRecords.length')
 .replace('sourceCommit:candidate.sourceCommit,buildId:', 'sourceCommit:candidate.sourceCommit,sourceDirty:candidate.sourceDirty,buildId:')
 .replace('imageType:spec.imageType??null',"imageType:spec.imageType??'Basic'")
 .replace('enableOutline:t.outline===true','enableOutline:t.outline!==false')
 .replace("?'Pixels':'Percentage'","?'Pixel':'Percentage'");
const adapter=path.join(out,'adapter.mjs');fs.writeFileSync(adapter,source);await import(pathToFileURL(adapter));
const receiptPath=path.join(out,'adapter-receipt.json'),receipt=JSON.parse(fs.readFileSync(receiptPath));
receipt.adapterSourceSha256=adapterSourceSha256;receipt.adapterSha256=hash(source);
fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2));
