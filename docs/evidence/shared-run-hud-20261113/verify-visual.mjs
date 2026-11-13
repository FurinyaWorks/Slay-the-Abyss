import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';
import{createRequire}from'node:module';import{createHash}from'node:crypto';import{gunzipSync}from'node:zlib';
const dir=path.resolve(process.argv[2]??'docs/evidence/shared-run-hud-20261113/visual-final-current');
const hash=b=>createHash('sha256').update(b).digest('hex');
const{loadImage,createCanvas}=createRequire('F:/New folder/.artifacts/art-lab-runtime/package.json')('@napi-rs/canvas');
const receipt=JSON.parse(fs.readFileSync(path.join(dir,'render-receipt.json')));
assert.equal(receipt.status,'captured-awaiting-image-review');assert.equal(receipt.shots.length,8);
function find(n,name){if(Array.isArray(n)){for(const c of n){const r=find(c,name);if(r)return r;}return;}if(n.name===name)return n;return find(n.children??[],name);}
const states={},files={},returns={};
for(const shot of receipt.shots){
 const png=fs.readFileSync(path.join(dir,shot.name+'.png'));assert.equal(hash(png),shot.sha256);
 assert(shot.frontendRenderPasses.after-shot.frontendRenderPasses.before>=3,'completed frontend render passes');
 const bytes=fs.readFileSync(path.join(dir,shot.name+'.state.json.gz')),s=states[shot.name]=JSON.parse(gunzipSync(bytes));
 assert(JSON.stringify(s.logs).includes('ABYSS_UI ready'));assert(!s.logs.some(l=>l.level==='lua-error'||/ABYSS_UI failed/.test(l.text)));
 files[shot.name]={pngSha256:hash(png),stateSha256:hash(bytes)};
 const image=await loadImage(png);assert.equal(image.width,1280);assert.equal(image.height,720);
 if(['battle-permanent-deck','battle-draw-pile','battle-discard-pile'].includes(shot.name)){
  const canvas=createCanvas(1280,720),ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
  returns[shot.name]=hash(ctx.getImageData(0,570,180,55).data);
 }
}
assert.equal(new Set(Object.values(returns)).size,1,'all pile browsers paint the identical raw return region');
const potion=[];
for(const slot of [1,3]){
 const battle=find(find(find(states['battle-hud'].tree,'battlePanel'),'potion'+slot),'normal');
 const reference=find(battle,'bottle');
 for(const name of ['blessing-choice-hud','map-hud']){
  const face=find(find(find(states[name].tree,'potionEntry'),'open'),'normal');
  const bottle=find(find(face,'slot'+slot),'bottle');
  assert.equal(bottle.imageId,reference.imageId,name+' potion image '+slot);
  assert.equal(bottle.imageColor,reference.imageColor,name+' potion tint '+slot);
  potion.push({name,slot,imageId:bottle.imageId,imageColor:bottle.imageColor});
 }
}
assert.deepEqual(receipt.errors,[],'no frontend console errors');assert.deepEqual(receipt.resourceResponses,[],'no failed HTTP responses');
const result={status:'PASS',scope:'offline actual SDK / headless software rendering',sourceClosureSha256:receipt.sourceClosureSha256,files,potionParity:potion,rawReturnRegion:{rect:[0,570,180,55],sha256:returns},officialImport:false,officialReady:false,deviceEvidence:false};
fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({status:result.status,shots:receipt.shots.length,sourceClosureSha256:result.sourceClosureSha256,returns}));
