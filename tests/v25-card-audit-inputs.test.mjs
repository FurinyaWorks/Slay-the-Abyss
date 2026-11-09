import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync,symlinkSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {compilePrivateCardAssets} from '../scripts/v25-private-card-assets.mjs';
import {prepareV25CardTemplates} from '../scripts/v25-card-templates.mjs';
import {fileRecord} from '../scripts/evidence-files.mjs';
import {prepareAuditV25CardInputs} from '../scripts/v25-card-audit-inputs.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type),n=Buffer.alloc(4),c=Buffer.alloc(4);n.writeUInt32BE(data.length);c.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([n,t,data,c]);}
function png(w,h,rgba){const hdr=Buffer.alloc(13);hdr.writeUInt32BE(w);hdr.writeUInt32BE(h,4);hdr[8]=8;hdr[9]=6;const rows=[];for(let y=0;y<h;y++)rows.push(Buffer.from([0]),rgba.subarray(y*w*4,(y+1)*w*4));return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',hdr),chunk('IDAT',deflateSync(Buffer.concat(rows))),chunk('IEND',Buffer.alloc(0))]);}
function fixture(t){
 const parent=resolve('.artifacts/test-tmp');mkdirSync(parent,{recursive:true});
 const base=mkdtempSync(join(parent,'v25-card-audit-'));t.after(()=>rmSync(base,{recursive:true,force:true}));
 const root=join(base,'original'),input=join(root,'private'),snapshot=join(base,'snapshot');mkdirSync(input,{recursive:true});mkdirSync(snapshot);writeFileSync(join(snapshot,'package.json'),'{}');
 const shell=png(2,2,Buffer.from([10,20,30,255,40,50,60,128,1,2,3,0,20,30,40,255]));writeFileSync(join(input,'shell.png'),shell);
 const mana=Buffer.alloc(36*35*4);mana.set([70,80,90,180],(17*36+18)*4);const manaPng=png(36,35,mana);writeFileSync(join(input,'mana.png'),manaPng);
 const assets={},variants={};
 for(const kind of ['attack','skill','power']){variants[kind]={};for(const rarity of ['common','uncommon','rare']){
  const key=`cardShell_${kind}_${rarity}`;variants[kind][rarity]=key;assets[key]={source:'shell.png',sourceSha256:sha(shell),width:2,height:2,logicalCardSize:[150,210],logicalCardSourceTopLeft:[0,0],display:{position:[-74,104],size:[2,2]}};
 }variants[kind].basic=variants[kind].common;}
 assets.cardShell_mana={source:'mana.png',sourceSha256:sha(manaPng),width:36,height:35,logicalCardSize:[150,210],logicalCardSourceTopLeft:[9,6],display:{position:[-66,93.5],size:[36,35]}};
 const manifest={schemaVersion:1,privateSourceCommit:'a'.repeat(40),sourceSiteVersion:25,sourceInputs:[{path:'shell.png',sha256:sha(shell)},{path:'mana.png',sha256:sha(manaPng)}],assets,cardShells:{logicalSize:[150,210],variants,mana:'cardShell_mana',costBakedIntoShell:false}};
 const manifestBytes=Buffer.from(JSON.stringify(manifest));writeFileSync(join(input,'manifest.json'),manifestBytes);
 const pack=compilePrivateCardAssets({inputRoot:input,manifest:'manifest.json',manifestSha256:sha(manifestBytes),projectRoot:root});
 const file=join(root,'pack.json');writeFileSync(file,JSON.stringify(pack));
 const receiptFor=()=>{const prepared=prepareV25CardTemplates(file,{root});return {v25CardAssets:{assetFile:fileRecord(file,root),inputs:prepared.inputs,sourceManifestSha256:prepared.sourceManifestSha256,templateIndices:Object.fromEntries(prepared.templates.map((row,i)=>[row.name,100+i]))}};};
 return {base,root,input,snapshot,file,pack,receipt:receiptFor(),receiptFor};
}
const normalized=path=>path.replaceAll('\\','/');

test('audit rebases only private locators, preserves every source byte and proves the copied PNGs again',t=>{
 const f=fixture(t),before=readFileSync(f.file),receipt=structuredClone(f.receipt);
 const result=prepareAuditV25CardInputs({snapshot:f.snapshot,receipt,root:f.root});
 assert.deepEqual(readFileSync(f.file),before);assert.deepEqual(receipt,f.receipt);
 assert.equal(result.prepared.templates.length,10);assert.equal(result.prepared.sourceManifestSha256,f.receipt.v25CardAssets.sourceManifestSha256);
 assert.ok(normalized(result.v25CardAssetsPath).startsWith(normalized(f.snapshot)+'/'));
 const rebased=JSON.parse(readFileSync(result.v25CardAssetsPath,'utf8')),original=JSON.parse(before);
 assert.ok(rebased.inputs.every(row=>normalized(row.path).startsWith(normalized(f.snapshot)+'/')));
 const restored=structuredClone(rebased);restored.inputs.forEach((row,i)=>{row.path=original.inputs[i].path;});assert.deepEqual(restored,original);
 assert.equal(result.locatorRebase.copies.length,original.inputs.length);
 for(const copy of result.locatorRebase.copies){assert.equal(copy.from.sha256,copy.to.sha256);assert.deepEqual(readFileSync(copy.from.path),readFileSync(copy.to.path));}
 assert.throws(()=>prepareAuditV25CardInputs({snapshot:f.snapshot,receipt,root:f.root}),/exist|fresh/i);
});
test('receipt file, input, manifest and template-index tampering are rejected before private outputs appear',t=>{
 const f=fixture(t),changes=[
  p=>{p.assetFile.sha256='0'.repeat(64);},p=>{p.inputs[0].bytes++;},p=>{p.sourceManifestSha256='0'.repeat(64);},
  p=>{delete p.templateIndices[Object.keys(p.templateIndices)[0]];},p=>{p.templateIndices.extra=999;},
  p=>{p.templateIndices[Object.keys(p.templateIndices)[0]]=0;},
  p=>{const keys=Object.keys(p.templateIndices);p.templateIndices[keys[1]]=p.templateIndices[keys[0]];},
 ];
 for(const change of changes){const receipt=structuredClone(f.receipt);change(receipt.v25CardAssets);assert.throws(()=>prepareAuditV25CardInputs({snapshot:f.snapshot,receipt,root:f.root}));assert.equal(existsSync(join(f.snapshot,'.artifacts','v25-private-input')),false);}
});
test('missing, repository, source-root and prepopulated audit destinations are refused',t=>{
 const f=fixture(t);
 assert.throws(()=>prepareAuditV25CardInputs({snapshot:join(f.base,'missing'),receipt:f.receipt,root:f.root}),/snapshot|exist/i);
 assert.throws(()=>prepareAuditV25CardInputs({snapshot:f.root,receipt:f.receipt,root:f.root}),/isolated|source/i);
 writeFileSync(join(f.snapshot,'.git'),'gitdir: repository');assert.throws(()=>prepareAuditV25CardInputs({snapshot:f.snapshot,receipt:f.receipt,root:f.root}),/git|isolated/i);rmSync(join(f.snapshot,'.git'));
 mkdirSync(join(f.snapshot,'.artifacts','v25-private-input'),{recursive:true});assert.throws(()=>prepareAuditV25CardInputs({snapshot:f.snapshot,receipt:f.receipt,root:f.root}),/exist|fresh/i);
});
test('a receipt cannot add dependencies outside the declared private input tree',t=>{
 const f=fixture(t),extra=join(f.root,'outside-private.txt');writeFileSync(extra,'outside declared private input');
 const pack=JSON.parse(readFileSync(f.file,'utf8'));pack.inputs.push(fileRecord(extra,f.root));writeFileSync(f.file,JSON.stringify(pack));
 const receipt=f.receiptFor();assert.throws(()=>prepareAuditV25CardInputs({snapshot:f.snapshot,receipt,root:f.root}),/private|outside|escape/i);
 assert.equal(existsSync(join(f.snapshot,'.artifacts','v25-private-input')),false);
});
test('an existing output alias cannot redirect private copies outside the snapshot',t=>{
 const f=fixture(t),outside=join(f.base,'outside-output');mkdirSync(outside);
 try{symlinkSync(outside,join(f.snapshot,'.artifacts'),process.platform==='win32'?'junction':'dir');}
 catch(error){if(['EPERM','EACCES'].includes(error.code)){t.skip('Directory aliases require filesystem privilege');return;}throw error;}
 assert.throws(()=>prepareAuditV25CardInputs({snapshot:f.snapshot,receipt:f.receipt,root:f.root}),/alias|snapshot|outside/i);
 assert.equal(existsSync(join(outside,'v25-private-input')),false);
});
