import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{gunzipSync}from'node:zlib';import{createHash}from'node:crypto';
const dir=path.resolve(process.argv[2]??'docs/evidence/sts-character-reference-20261113/visual-final');
const hash=b=>createHash('sha256').update(b).digest('hex');
const report=JSON.parse(fs.readFileSync(path.join(dir,'render-receipt.json')));
const input=path.resolve(process.argv[3]??'.artifacts/sts-character-reference-20261113/current-final');
const receipt=JSON.parse(fs.readFileSync(path.join(input,'receipt.json'))),themeBytes=fs.readFileSync(path.join(input,'generated/official-assets-theme.json'));
assert.equal(receipt.sourceClosureSha256,report.sourceClosureSha256);assert.equal(hash(themeBytes),receipt.generated['official-assets-theme.json']);
const crop=JSON.parse(themeBytes).layout.stsCharacter.portrait.crop;
assert.equal(report.status,'captured-awaiting-image-review');assert.equal(report.shots.length,2);
assert.deepEqual(report.errors,[]);assert.deepEqual(report.resourceResponses,[]);
function find(n,key){if(Array.isArray(n)){for(const c of n){const f=find(c,key);if(f)return f;}return;}if(n.name===key)return n;return find(n.children??[],key);}
const checks=[];
for(const shot of report.shots){
 const bytes=fs.readFileSync(path.join(dir,shot.name+'.png'));assert.equal(hash(bytes),shot.sha256);
 assert(shot.frontendRenderPasses.after-shot.frontendRenderPasses.before>=3);
 const raw=fs.readFileSync(path.join(dir,shot.name+'.state.json.gz')),state=JSON.parse(gunzipSync(raw));
 const ready=state.logs.findIndex(l=>l.text?.includes('ABYSS_PORTRAIT selection phase=ready'));
 const reveal=state.logs.findIndex(l=>l.text?.includes('ABYSS_PAGE_REVEAL visible page=characterPanel'));
 assert(ready>=0&&reveal>ready,'whole page must reveal only after actual portrait ready');
 assert(!state.logs.some(l=>l.level==='lua-error'||/ABYSS_UI failed/.test(l.text)));
 const panel=find(state.tree,'characterPanel'),figure=find(panel,'officialSelectionFigure');
 assert(panel.visible&&figure.visible,'actual selection and its reused battle source must show');
 assert(!find(panel,'selectedInitial'));assert.equal(find(panel,'v25Roster').visible,false);
 assert.equal(find(find(panel,'details'),'portraits').visible,false);
 assert(find(panel,'traveler').visible);
 for(const name of ['character1','character2','character3','character4'])assert.equal(find(panel,name).visible,false,'only admitted production role');
 let images=0,groups=0;
 function inspect(n){
  if(n.kind==='image'){
   images++;const x=n.anchoredPositionX,y=n.anchoredPositionY,w=n.sizeDeltaX,h=n.sizeDeltaY;
   assert(x-w/2>=crop.left-1e-6&&x+w/2<=crop.right+1e-6&&y-h/2>=crop.bottom-1e-6&&y+h/2<=crop.top+1e-6,'actual native source row escapes half-body crop');
  }else groups++;
  for(const c of n.children??[])inspect(c);
 }
 for(const node of figure.children??[])inspect(node);
 assert(images>0&&images<7303,'source was not cropped');
 checks.push({name:shot.name,pngSha256:shot.sha256,stateSha256:hash(raw),readyLogBeforeReveal:true,images,groups});
}
assert.equal(checks[0].images,checks[1].images,'reselect must not rebuild a different asset');
const result={status:'PASS',sourceClosureSha256:report.sourceClosureSha256,checks,boundaries:{sdk:true,headless:true,softwareWebGL:true,officialImport:false,officialReady:false,deviceEvidence:false,gpuEvidence:false}};
fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
