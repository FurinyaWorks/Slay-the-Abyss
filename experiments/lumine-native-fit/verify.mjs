import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {toLua} from '../../scripts/build-lua-data.mjs';
const [candidateFile,previewFile]=process.argv.slice(2);assert(candidateFile&&previewFile);
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const c=read(candidateFile),b=read(c.experiment.baseReceipt),p=read(previewFile),save=read(p.save);
assert.equal(sha(c.candidate.path),c.candidate.sha256);assert.equal(sha(p.save),p.saveSha256);assert.equal(p.candidateSha256,c.candidate.sha256);
assert.equal(p.inverseReadback.faults.length,0);assert(p.luaSourceExact&&p.allActualLuaGuidsReadFromGil);
const expectedChanged=new Set(['abyss_ui','abyss_game_ui_view']);
const changed=Object.keys(b.moduleDigests).filter(k=>b.moduleDigests[k]!==c.moduleDigests[k]);assert.deepEqual(new Set(changed),expectedChanged);
const added=Object.keys(c.moduleDigests).filter(k=>!b.moduleDigests[k]);assert.deepEqual(added.sort(),[...c.experiment.addedModules].sort());assert(added.every(name=>/^abyss_lumine_fit(?:_binding|_(?:rot|rows)(?:400|800|1600|3200))?$/.test(name)));
let checked=0;const types=new Set(),images={};
for(const cost of c.experiment.costs){
 if(c.experiment.storage==='batch'){
  const rows=read(path.join(path.dirname(candidateFile),'rows-'+cost.budget+'.json'));
  assert.equal(rows.length,cost.images);assert(rows.length<=cost.budget);
  for(const r of rows){assert.equal(r.length,16);assert(r.every(Number.isFinite));assert([100001,100003].includes(r[0]));}
  const module=save.assets.scripts.find(s=>s.path==='abyss_lumine_fit_rows'+cost.budget+'.lua');assert(module);assert.equal(module.source,'return '+toLua(rows)+'\n');
  assert.equal(rows.filter(r=>r[15]===1).length,cost.fillMasks);images[cost.budget]=rows.length;continue;
 }
 const template=save.assets.client.root.children.find(t=>t.name==='LumineFit'+cost.budget);assert(template);
 let count=0,masks=0,containers=0;
 const walk=n=>{checked++;assert((n.children??[]).length<=60);if(n.kind==='image'){count++;types.add(n.imageId);assert([100001,100003].includes(n.imageId));assert.equal(n.imageColor>>>24,255);if(n.enableMask)masks++;}else{assert.equal(n.kind,'container');containers++;}for(const child of n.children??[])walk(child);};walk(template);
 assert(count<=cost.budget);assert.equal(count,cost.images);assert.equal(masks,cost.fillMasks);assert.equal(containers,cost.containers);images[cost.budget]=count;
}
if(c.experiment.storage==='batch')for(const size of [60,10,1]){
 const template=save.assets.client.root.children.find(t=>t.name==='LumineFitBatch'+size);assert(template);assert.equal(template.children.length,size);
 for(const image of template.children){assert.equal(image.imageId,100003);assert.equal(image.enableMask,true);assert.equal(image.enableFill,true,'Half-triangle fill must be serialized in the native prefab');assert.equal(image.fillType,'Horizontal');assert.equal(image.fillHorizontalType,'Right');assert.equal(image.fillAmount,.5);types.add(image.imageId);checked++;}
}
if(c.experiment.storage==='batch')assert(types.has(100003));else assert.deepEqual([...types].sort(),[100001,100003]);
const result={status:'pass',candidateSha256:c.candidate.sha256,saveSha256:p.saveSha256,images,checkedNativeTemplateNodes:checked,
 preservedModules:Object.keys(b.moduleDigests).length-changed.length,changedModules:changed,addedModules:added,
 noRasterTexture:true,officialImport:'not_run',gpuFrameTime:'UNVERIFIED',officialCapacity:'UNVERIFIED'};
fs.writeFileSync(path.join(path.dirname(candidateFile),'experiment-verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
