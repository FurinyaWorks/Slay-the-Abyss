import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const dir=path.resolve(process.argv[2]??'docs/evidence/sts-neow-reference-20261113/visual-integrated-final');
const report=JSON.parse(fs.readFileSync(path.join(dir,'render-receipt.json')));
const manifest=JSON.parse(fs.readFileSync('docs/evidence/sts-neow-reference-20261113/source-manifest.json'));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(report.sourceClosureSha256,manifest.sourceClosureSha256);
assert.equal(report.status,'captured-awaiting-image-review');
assert.deepEqual(report.errors,[]);assert.deepEqual(report.resourceResponses,[]);assert.deepEqual(report.liveTreeDrift,[]);
assert.equal(report.shots.length,6);
function find(node,name){
 if(Array.isArray(node)){for(const child of node){const found=find(child,name);if(found)return found;}return;}
 if(node.name===name)return node;
 return find(node.children??[],name);
}
const checks=[];
for(const shot of report.shots){
 const png=fs.readFileSync(path.join(dir,shot.name+'.png'));
 assert.equal(digest(png),shot.sha256);
 assert(shot.frontendRenderPasses.after-shot.frontendRenderPasses.before>=3);
 const bytes=fs.readFileSync(path.join(dir,shot.name+'.state.json.gz')),state=JSON.parse(gunzipSync(bytes));
 assert.equal(find(state.tree,'pageReveal').visible,false,'page still covered');
 assert.equal(find(state.tree,'nodePanel').visible,true);
 assert(find(state.tree,'approvedGuide'));
 assert(state.logs.some(l=>l.text?.includes('ABYSS_PAGE_REVEAL visible page=nodePanel')));
 assert(!state.logs.some(l=>l.level==='lua-error'||/ABYSS_UI failed|ABYSS_PAGE_REVEAL failed/.test(l.text??'')));
 checks.push({name:shot.name,pngSha256:shot.sha256,stateSha256:digest(bytes),pageRevealed:true,renderPasses:shot.frontendRenderPasses.after-shot.frontendRenderPasses.before});
}
const comparison=JSON.parse(fs.readFileSync(path.join(dir,'guide-comparison.json')));
assert(comparison.candidate.iou>=.98);assert(comparison.oldBodyNegative.iou<.9);
const result={status:'PASS',sourceClosureSha256:report.sourceClosureSha256,checks,hoodIoU:comparison.candidate.iou,oldHoodNegativeIoU:comparison.oldBodyNegative.iou,
 boundaries:{actualSdk:true,headlessSoftwareRendering:true,normalReference:true,originalHoverParity:false,officialImport:false,officialReady:false,deviceEvidence:false,gpuEvidence:false}};
fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
