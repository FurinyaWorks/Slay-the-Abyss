import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {compilePrivateCardAssets,compileRgbaRectangles,decodeRgbaRectangles} from '../scripts/v25-private-card-assets.mjs';
import {prepareV25CardTemplates,expandV25CardTexture} from '../scripts/v25-card-templates.mjs';
import {assertNativeUiCapacity} from '../scripts/build-ui.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type),n=Buffer.alloc(4),c=Buffer.alloc(4);n.writeUInt32BE(data.length);c.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([n,t,data,c]);}
function png(w,h,rgba){const hdr=Buffer.alloc(13);hdr.writeUInt32BE(w);hdr.writeUInt32BE(h,4);hdr[8]=8;hdr[9]=6;const rows=[];for(let y=0;y<h;y++)rows.push(Buffer.from([0]),rgba.subarray(y*w*4,(y+1)*w*4));return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',hdr),chunk('IDAT',deflateSync(Buffer.concat(rows))),chunk('IEND',Buffer.alloc(0))]);}
function fixture(t,{side=2,width=side,height=side,crop=[0,0],sparse=false}={}){
 const parent=resolve('.artifacts/test-tmp');mkdirSync(parent,{recursive:true});
 const root=mkdtempSync(join(parent,'v25-template-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const rgba=width===2&&height===2?Buffer.from([10,20,30,255,40,50,60,128,91,92,93,0,10,20,30,255]):Buffer.alloc(width*height*4);
 if(width!==2||height!==2){
  if(sparse){rgba.set([1,2,3,128],0);rgba.set([60,70,80,255],rgba.length-4);rgba.set([50,40,30,0],(Math.floor(height/2)*width+Math.floor(width/2))*4);}
  else for(let y=0;y<height;y++)for(let x=0;x<width;x++)rgba.set([x,y,(x*17+y*31)%256,255],(y*width+x)*4);
 }
 const image=png(width,height,rgba);
 writeFileSync(join(root,'shell.png'),image);
 const mana=Buffer.alloc(36*35*4);mana.set([90,80,70,200],(17*36+18)*4);const manaPng=png(36,35,mana);writeFileSync(join(root,'mana.png'),manaPng);
 const assets={},variants={};
 for(const kind of ['attack','skill','power']){
  variants[kind]={};
  for(const rarity of ['common','uncommon','rare']){
   const key=`cardShell_${kind}_${rarity}`;variants[kind][rarity]=key;
   assets[key]={source:'shell.png',sourceSha256:sha(image),width,height,logicalCardSize:[150,210],logicalCardSourceTopLeft:crop,display:{position:[width/2-crop[0]-75,105-height/2+crop[1]],size:[width,height]}};
  }
  variants[kind].basic=variants[kind].common;
 }
 assets.cardShell_mana={source:'mana.png',sourceSha256:sha(manaPng),width:36,height:35,logicalCardSize:[150,210],logicalCardSourceTopLeft:[9,6],display:{position:[-66,93.5],size:[36,35]}};
 const manifest={schemaVersion:1,privateSourceCommit:'a'.repeat(40),sourceSiteVersion:25,sourceInputs:[{path:'shell.png',sha256:sha(image)},{path:'mana.png',sha256:sha(manaPng)}],assets,
  cardShells:{logicalSize:[150,210],variants,mana:'cardShell_mana',costBakedIntoShell:false}};
 const manifestBytes=Buffer.from(JSON.stringify(manifest));writeFileSync(join(root,'manifest.json'),manifestBytes);
 const pack=compilePrivateCardAssets({inputRoot:root,manifest:'manifest.json',manifestSha256:sha(manifestBytes),projectRoot:root});
 const file=join(root,'pack.json');writeFileSync(file,JSON.stringify(pack));
 const mutate=fn=>{const p=JSON.parse(readFileSync(file,'utf8'));fn(p);writeFileSync(file,JSON.stringify(p));};
 return {root,file,pack,mutate};
}
function walk(node){return[node,...(node.children??[]).flatMap(walk)];}

test('empty native hosts retain complete byte-exact texture data and live-text ownership',t=>{
 const f=fixture(t),result=prepareV25CardTemplates(f.file,{root:f.root});
 assert.equal(result.templates.length,10);assert.equal(result.binding.enabled,true);
 assert.equal(result.binding.variants.attack.basic,result.binding.variants.attack.common);
 assert.equal(result.sourceManifestSha256,f.pack.inputs[0].sha256);
 assert.ok(result.inputs.some(row=>row.path===f.file));
 for(const template of result.templates){
  assert.deepEqual(template.size,[150,210]);assert.equal(template.visible,false);
  assert.deepEqual(template.children,[]);assertNativeUiCapacity(template);
  const metadata=Object.values(result.assets).find(asset=>asset.templateName===template.name);
  const source=f.pack.assets[Object.keys(result.assets).find(key=>result.assets[key]===metadata)],data=result.textureData[template.name];
  assert.deepEqual(data,{width:source.width,height:source.height,blocks:source.blocks,count:source.count,drawCount:source.drawCount,display:source.display});
  assert.ok(decodeRgbaRectangles({...data,encoding:'xywh-rgba-hex24'}).equals(decodeRgbaRectangles(source)));
  for(const node of walk(template)){
   assert.ok((node.children?.length??0)<=60);assert.ok(!node.script&&!node.scripts&&!node.text);assert.ok(['container','image'].includes(node.kind));
   if(node!==template)assert.equal(node.visible,true);
   if(node.kind==='image'){assert.equal(node.image,100001);assert.ok(node.opacity>0);}
  }
 }
 const shell=result.templates.find(row=>row.name===result.binding.variants.attack.basic),expanded=expandV25CardTexture(shell.name,result.textureData[shell.name]),images=walk(expanded).filter(row=>row.kind==='image');
 assertNativeUiCapacity(expanded);
 assert.equal(images.length,f.pack.assets.cardShell_attack_common.drawCount);
 assert.ok(images.some(row=>row.opacity===128/255));
 assert.ok(images.every(row=>row.position[0]>=-75&&row.position[1]<=105));
 const mana=result.assets.cardShell_mana;
 assert.deepEqual(mana.display,{position:[-66,93.5],size:[36,35]});
 assert.equal(result.templates.find(row=>row.name===result.binding.manaTemplateId).name,mana.templateName);
 assert.equal(Object.keys(result.textureData).length,10);
});
test('compiled block or source identity drift cannot enter native templates',t=>{
 const f=fixture(t);f.mutate(p=>{p.assets.cardShell_attack_common.blocksSha256='0'.repeat(64);});
 assert.throws(()=>prepareV25CardTemplates(f.file,{root:f.root}),/hash/i);
 writeFileSync(f.file,JSON.stringify(f.pack));writeFileSync(join(f.root,'shell.png'),'changed');
 assert.throws(()=>prepareV25CardTemplates(f.file,{root:f.root}),/hash/i);
});
test('false lossless claims, display drift and out-of-bounds rectangles are rejected',t=>{
 const f=fixture(t);
 f.mutate(p=>{p.assets.cardShell_attack_common.lossless=false;});assert.throws(()=>prepareV25CardTemplates(f.file,{root:f.root}),/lossless/i);
 writeFileSync(f.file,JSON.stringify(f.pack));f.mutate(p=>{p.assets.cardShell_attack_common.display.position[0]++;});assert.throws(()=>prepareV25CardTemplates(f.file,{root:f.root}),/geometry|display/i);
 writeFileSync(f.file,JSON.stringify(f.pack));f.mutate(p=>{p.assets.cardShell_attack_common.blocks='ffff'+p.assets.cardShell_attack_common.blocks.slice(4);});assert.throws(()=>prepareV25CardTemplates(f.file,{root:f.root}),/bound/i);
 writeFileSync(f.file,JSON.stringify(f.pack));f.mutate(p=>{p.assets.cardShell_attack_common.drawCount--;});assert.throws(()=>prepareV25CardTemplates(f.file,{root:f.root}),/count/i);
});
test('no template can escape its explicit project root or claim missing source bindings',t=>{
 const f=fixture(t);
 assert.throws(()=>prepareV25CardTemplates(resolve(f.root,'..','missing.json'),{root:f.root}));
 f.mutate(p=>{p.cardShells.variants.attack.basic='missing';});assert.throws(()=>prepareV25CardTemplates(f.file,{root:f.root}),/binding|source/i);
});
test('source preparation returns a root-contained locator contract for snapshot rebasing',t=>{
 const f=fixture(t),snapshot=join(f.root,'snapshot');mkdirSync(snapshot);
 assert.throws(()=>prepareV25CardTemplates(f.file,{root:snapshot}),/root/i);
 const prepared=prepareV25CardTemplates(f.file,{root:f.root});
 assert.equal(prepared.privateInputRoot,f.root);
 assert.equal(prepared.manifestRelativePath,'manifest.json');
 assert.ok(prepared.inputs.every(row=>row.path.startsWith(f.root)));
});
test('over 3600 rectangles stay in runtime data and validation expansion retains every pixel',t=>{
 const f=fixture(t,{side:61}),prepared=prepareV25CardTemplates(f.file,{root:f.root});
 const host=prepared.templates.find(row=>row.name===prepared.binding.variants.attack.basic),data=prepared.textureData[host.name];
 assert.deepEqual(host.children,[]);assert.equal(data.drawCount,61*61);
 const template=expandV25CardTexture(host.name,data),rows=walk(template);
 assert.equal(rows.filter(row=>row.kind==='image').length,61*61);
 assert.equal(template.children.length,2);assert.equal(template.children[0].children.length,60);
 assert.ok(rows.every(row=>(row.children?.length??0)<=60));
 assertNativeUiCapacity(template);
});

test('159 by 210 source overflow, crop and mana placement survive data-driven reconstruction',t=>{
 const f=fixture(t,{width:159,height:210,crop:[4,0],sparse:true}),prepared=prepareV25CardTemplates(f.file,{root:f.root});
 const name=prepared.binding.variants.attack.basic,data=prepared.textureData[name],root=prepared.templates.find(n=>n.name===name);
 assert.deepEqual(root.size,[150,210]);assert.deepEqual(data.display,{position:[.5,0],size:[159,210]});
 const images=walk(expandV25CardTexture(name,data)).filter(n=>n.kind==='image');
 assert.deepEqual(images.map(n=>({position:n.position,size:n.size,opacity:n.opacity})),[
  {position:[-78.5,104.5],size:[1,1],opacity:128/255},{position:[79.5,-104.5],size:[1,1],opacity:1},
 ]);
 const mana=prepared.textureData[prepared.binding.manaTemplateId];assert.deepEqual(mana.display,{position:[-66,93.5],size:[36,35]});
 assert.deepEqual(walk(expandV25CardTexture('mana',mana)).find(n=>n.kind==='image').position,[-65.5,93.5]);
 assert.throws(()=>expandV25CardTexture(name,{...data,drawCount:1}),/count/);
 assert.throws(()=>expandV25CardTexture(name,{...data,display:{position:[0,0],size:[150,210]}}),/geometry/);
});
test('recomputed compiled hashes cannot disguise pixels different from the pinned PNG',t=>{
 const f=fixture(t),replacement=compileRgbaRectangles({width:2,height:2,rgba:Buffer.alloc(16,255)});
 f.mutate(p=>{p.assets.cardShell_attack_common={...p.assets.cardShell_attack_common,...replacement};});
 assert.throws(()=>prepareV25CardTemplates(f.file,{root:f.root}),/pinned PNG source/i);
});
