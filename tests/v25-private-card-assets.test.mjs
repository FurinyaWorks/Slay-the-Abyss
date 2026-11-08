import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {compileRgbaRectangles,decodeRgbaRectangles,compilePrivateCardAssets} from '../scripts/v25-private-card-assets.mjs';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type),length=Buffer.alloc(4),crc=Buffer.alloc(4);length.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([length,name,data,crc]);}
function png(width,height,rgba){const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;const rows=[];for(let y=0;y<height;y++)rows.push(Buffer.from([0]),Buffer.from(rgba.subarray(y*width*4,(y+1)*width*4)));return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.concat(rows))),chunk('IEND',Buffer.alloc(0))]);}
function fixture(t){
 const base=resolve('.artifacts/test-tmp');mkdirSync(base,{recursive:true});
 const root=mkdtempSync(join(base,'v25-private-assets-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const input=join(root,'private');mkdirSync(input);
 const rgba=Buffer.from([12,34,56,255,12,34,56,255,91,92,93,0,12,34,56,255,12,34,56,255,22,44,66,128]);
 const image=png(3,2,rgba);writeFileSync(join(input,'shell.png'),image);
 const notice=Buffer.from('Fixture only. No private art.');writeFileSync(join(input,'NOTICE.txt'),notice);
 const manifest={schemaVersion:1,privateSourceCommit:'a'.repeat(40),sourceSiteVersion:25,
  sourceInputs:[{path:'NOTICE.txt',sha256:digest(notice)},{path:'shell.png',sha256:digest(image)}],
  assets:{shell:{source:'shell.png',sourceSha256:digest(image),width:3,height:2,logicalCardSize:[3,2],logicalCardSourceTopLeft:[0,0],display:{position:[0,0],size:[3,2]}}},
  cardShells:{logicalSize:[3,2],variants:{attack:{basic:'shell'}},costBakedIntoShell:false,fixedProfile:'old-quantized-profile'}};
 const bytes=Buffer.from(JSON.stringify(manifest));writeFileSync(join(input,'manifest.json'),bytes);
 const options={inputRoot:input,manifest:'manifest.json',manifestSha256:digest(bytes),projectRoot:root};
 return {root,input,rgba,image,manifest,options};
}

test('lossless exact RGBA rectangles merge repeated rows and preserve transparent RGB plus partial alpha',()=>{
 const rgba=Buffer.from([9,8,7,255,9,8,7,255,30,20,10,0,9,8,7,255,9,8,7,255,2,4,6,128]);
 const result=compileRgbaRectangles({width:3,height:2,rgba});
 assert.equal(result.count,3);assert.equal(result.drawCount,2);assert.equal(result.sampling.scale,1);
 assert.equal(result.lossless,true);assert.deepEqual(decodeRgbaRectangles(result),rgba);
 assert.equal(result.rgbaSha256,digest(rgba));
});
test('rectangles do not bridge a transparent hole or quantize neighboring colors',()=>{
 const rgba=Buffer.from([1,2,3,255,1,2,4,255,1,2,3,255,1,2,3,255,7,7,7,0,1,2,3,255,1,2,3,255,1,2,3,255,1,2,3,255]);
 const result=compileRgbaRectangles({width:3,height:3,rgba});
 assert.deepEqual(decodeRgbaRectangles(result),rgba);assert.ok(result.count>3);
});
test('invalid buffers, overlap, holes and coordinates beyond source bounds are rejected',()=>{
 assert.throws(()=>compileRgbaRectangles({width:2,height:2,rgba:Buffer.alloc(3)}));
 assert.throws(()=>compileRgbaRectangles({width:65536,height:1,rgba:Buffer.alloc(0)}));
 const good=compileRgbaRectangles({width:1,height:1,rgba:Buffer.from([1,2,3,4])});
 assert.throws(()=>decodeRgbaRectangles({...good,blocks:'000100000001000101020304'}),/bound/i);
 assert.throws(()=>decodeRgbaRectangles({...good,count:2,blocks:good.blocks+good.blocks}),/overlap/i);
 assert.throws(()=>decodeRgbaRectangles({...good,width:2}),/cover/i);
});
test('compiled block and reconstructed RGBA hashes are checked before reuse',()=>{
 const good=compileRgbaRectangles({width:1,height:1,rgba:Buffer.from([3,5,7,123])});
 assert.throws(()=>decodeRgbaRectangles({...good,blocksSha256:'0'.repeat(64)}),/hash/i);
 assert.throws(()=>decodeRgbaRectangles({...good,rgbaSha256:'0'.repeat(64)}),/hash/i);
});
test('private source compilation checks pinned files and retains exact source geometry',t=>{
 const f=fixture(t),outputFile=join(f.root,'build','card-assets.json');
 const result=compilePrivateCardAssets({...f.options,outputFile});
 assert.equal(result.profile,'v25-source-rgba-lossless-v1');assert.equal(result.sourceSiteVersion,25);
 assert.equal(result.assets.shell.sourceSha256,digest(f.image));
 assert.deepEqual(decodeRgbaRectangles(result.assets.shell),f.rgba);
 assert.deepEqual(result.assets.shell.display,{position:[0,0],size:[3,2]});
 assert.deepEqual(result.assets.shell.sampleSize,[3,2]);
 assert.match(result.cardShells.fixedProfile,/no quantization/);
 assert.equal(result.cardShells.sourcePreparationProfile,'old-quantized-profile');
 assert.ok(result.inputs.some(row=>row.sha256===f.options.manifestSha256));
 assert.deepEqual(JSON.parse(readFileSync(outputFile,'utf8')),result);
});
test('wrong manifest, PNG or linked source hash is refused before creating outputs',t=>{
 const f=fixture(t),outputFile=join(f.root,'build','must-not-exist.json');
 assert.throws(()=>compilePrivateCardAssets({...f.options,manifestSha256:'0'.repeat(64),outputFile}),/hash/i);
 writeFileSync(join(f.input,'shell.png'),Buffer.from('changed'));
 assert.throws(()=>compilePrivateCardAssets({...f.options,outputFile}),/hash/i);
 assert.equal(existsSync(outputFile),false);
});
test('output cannot overwrite an input or use an outside location',t=>{
 const f=fixture(t),before=readFileSync(join(f.input,'manifest.json'));
 assert.throws(()=>compilePrivateCardAssets({...f.options,outputFile:join(f.input,'manifest.json')}),/input|exist/i);
 assert.deepEqual(readFileSync(join(f.input,'manifest.json')),before);
 assert.throws(()=>compilePrivateCardAssets({...f.options,outputFile:resolve(f.root,'..','outside.json')}),/root|outside/i);
});
test('manifest traversal and source dimension drift are rejected',t=>{
 const f=fixture(t);
 function run(manifest){const bytes=Buffer.from(JSON.stringify(manifest));writeFileSync(join(f.input,'bad.json'),bytes);return ()=>compilePrivateCardAssets({...f.options,manifest:'bad.json',manifestSha256:digest(bytes)});}
 assert.throws(run({...f.manifest,sourceInputs:[{path:'../escape.png',sha256:'a'.repeat(64)}]}),/path|outside/i);
 assert.throws(run({...f.manifest,assets:{shell:{...f.manifest.assets.shell,width:4}}}),/dimension/i);
});
