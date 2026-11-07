import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {productionModels,enemyModels,modelSources,modelForEnemy,silhouetteFallbacks} from './models.mjs';
const root=process.env.MILIASTRA_MCP_ROOT||'D:/MiliastraTools/genshin-miliastra-mcp';
test('presentation mappings have unique assets, declared planning envelopes and explicit fallbacks',()=>{
 assert.equal(productionModels.length,9);
 assert.equal(new Set(productionModels.map(m=>m.model)).size,9);
 assert.equal(new Set(productionModels.map(m=>m.asset)).size,9);
 const ids=new Set(productionModels.map(m=>m.model));
 for(const m of productionModels){assert.ok(m.scale>0&&m.scale<=1.1);assert.ok(m.body.height>=1.7&&m.body.height<=2.2);assert.ok(m.body.width>0);assert.match(m.bodyEvidence,/not measured/);}
 for(const id of Object.keys(enemyModels))assert.ok(ids.has(modelForEnemy(id)));
 for(const id of Object.keys(silhouetteFallbacks))assert.ok(Object.hasOwn(enemyModels,id));
 assert.equal(modelForEnemy('unknown_future_enemy'),1);
 assert.equal(modelForEnemy('toString'),1);
});
test('every selected native asset and clip matches the reviewed real catalogue',{skip:!existsSync(join(root,modelSources.animations.path))},async()=>{
 const {findAsset}=await import(pathToFileURL(join(root,'src/scene/assets.mjs')));
 const {animationsOf}=await import(pathToFileURL(join(root,'src/scene/media.mjs')));
 for(const source of [modelSources.assets,modelSources.animations])assert.equal(createHash('sha256').update(readFileSync(join(root,source.path))).digest('hex'),source.sha256);
 for(const m of productionModels){
  assert.equal(findAsset(m.asset).group,'怪物(AI版)');assert.equal(findAsset(m.asset).name,m.name);
  const clips=animationsOf(m.asset),attack=clips.find(c=>c.id===m.attack);
  assert.ok(attack);assert.equal(attack.seconds,m.attackSeconds);assert.ok(!attack.loop);
  assert.ok(clips.some(c=>c.id===m.idle&&c.loop));
  if(m.hit!==null){const hit=clips.find(c=>c.id===m.hit);assert.ok(hit);assert.equal(hit.seconds,m.hitSeconds);assert.ok(!hit.loop);}
 }
});
