import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {previewImageMaskFields} from '../scripts/native-candidate-preview.mjs';

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
