import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {previewImageMaskFields} from '../scripts/native-candidate-preview.mjs';
import {selectionCiProof,preSelectionCiSource} from './helpers/selection-ci-source.mjs';

test('selection continuation authenticates every complete current file and rejects unknown drift',()=>{
 for(const [path,row]of Object.entries(selectionCiProof.files)){
  const raw=readFileSync(path,'utf8').replaceAll('\r\n','\n');
  assert.equal(raw,row.after.source,path+' complete current source');
  assert.equal(preSelectionCiSource(path,raw),row.before.source);
  assert.equal(preSelectionCiSource(path,raw.replaceAll('\n','\r\n')),row.before.source);
  for(const changed of [raw+'\n',raw.slice(1),null,{},17])assert.equal(preSelectionCiSource(path,changed),changed);
  for(const unknown of ['__proto__','constructor','foreign/'+path])assert.equal(preSelectionCiSource(unknown,raw),raw);
 }
});

test('native pixel feather uses the browser renderer enum and preserves exact widths',()=>{
 const pixel=previewImageMaskFields({feather:{pixels:[3,8]}});
 assert.equal(pixel.softEdgeMode,'Pixel');
 assert.equal(pixel.enableMask,true);assert.equal(pixel.enableSoftEdge,true);
 assert.deepEqual([pixel.softEdgeWidthX,pixel.softEdgeWidthY],[3,8]);
 const zero=previewImageMaskFields({feather:{pixels:[0,0]}});
 assert.deepEqual([zero.softEdgeWidthX,zero.softEdgeWidthY],[0,0]);
 assert.equal(previewImageMaskFields({}).enableSoftEdge,false);
});

const rendererPath=resolve(process.env.ABYSS_SIMULATOR_RENDERER??'.artifacts/approved-v25-native-web/dist/public/play-renderer.js');
// This local integration uses the actual unmodified browser bundle, not a copy
// of its mask formula. It checks simulator mask semantics, not device rendering.
const rendererSha256='2bc6d4ab7e7f7f1e6bc9cda582c2bd82e28032d704f3e084d59d7fd0152fbfea';
test('actual pinned browser renderer interprets native feather in pixels',{
 skip:existsSync(rendererPath)?false:'Set ABYSS_SIMULATOR_RENDERER to the verified browser bundle for this local integration',
},async t=>{
 const source=readFileSync(rendererPath,'utf8');
 assert.equal(createHash('sha256').update(source).digest('hex'),rendererSha256,'Revalidate mask exports when the actual SDK bundle changes');
 // Only expose existing bundle functions; all renderer code remains unchanged.
 const renderer=await import('data:text/javascript;base64,'+Buffer.from(source+'\nexport{cy as actualMaskSpec,Ou as actualMaskCoverage};').toString('base64'));
 t.diagnostic('Actual SDK browser bundle SHA256 '+rendererSha256);
 const matrix={a:1,b:0,c:0,d:1,tx:0,ty:0};
 const mask=(width,height,pixels)=>renderer.actualMaskSpec({kind:'image',sourceWidth:width,sourceHeight:height,
  ...previewImageMaskFields({feather:{pixels}})},matrix);
 const corner=mask(18,18,[3,3]);
 assert.deepEqual([corner.featherX,corner.featherY],[3,3]);
 assert.equal(renderer.actualMaskCoverage(8.5,0,corner),1/6);
 assert.deepEqual([mask(28,28,[8,8]).featherX,mask(132,210,[3,3]).featherY],[8,3]);
 const wrong=renderer.actualMaskSpec({kind:'image',sourceWidth:18,sourceHeight:18,
  ...previewImageMaskFields({feather:{pixels:[3,3]}}),softEdgeMode:'Pixels'},matrix);
 assert.equal(wrong.featherX,.54);
 assert(renderer.actualMaskCoverage(8.5,0,wrong)>.9,'negative control must reproduce the hard corner');
});

// New outer continuation: raw current sources remain independently checked.
import {nativePreviewCiProof,preNativePreviewCiSource} from './helpers/native-preview-ci-source.mjs';
import {runHudPriorRead} from './helpers/run-hud-ci-source.mjs';
import {closeoutRead} from './helpers/closeout-ci-source.mjs';
test('native preview continuation authenticates complete current files and preserves unknown drift',()=>{
 for(const [path,row]of Object.entries(nativePreviewCiProof.files)){
  const raw=readFileSync(path,'utf8').replaceAll('\r\n','\n');
  assert.equal(raw,row.after.source,path+' complete current source');
  for(const source of [raw,raw.replaceAll('\n','\r\n')])assert.equal(preNativePreviewCiSource(path,source),row.before.source);
  for(const value of [raw+'\n',raw.slice(1),raw.replace('native','foreign'),null,{},17])assert.equal(preNativePreviewCiSource(path,value),value);
  for(const foreign of ['__proto__','constructor','foreign/'+path,path+'/extra'])assert.equal(preNativePreviewCiSource(foreign,raw),raw);
  const reader=(p,encoding)=>encoding?raw:Buffer.from(raw);
  assert.equal(runHudPriorRead(reader)(path,'utf8'),row.before.source);
  assert.deepEqual(runHudPriorRead(reader)(path),Buffer.from(row.before.source));
  assert.equal(runHudPriorRead(()=>raw+'\n')(path,'utf8'),raw+'\n');
 }
 const path='scripts/native-candidate-preview.mjs',raw=readFileSync(path,'utf8');
 assert.equal(closeoutRead('pr629')(path,'utf8'),nativePreviewCiProof.files[path].before.source);
 assert.equal(closeoutRead('pr629',()=>raw+'\n')(path,'utf8'),raw+'\n');
 assert.equal(readFileSync(path,'utf8'),raw,'projection never writes the runtime script');
 assert(Object.isFrozen(nativePreviewCiProof.files[path].after));
});
