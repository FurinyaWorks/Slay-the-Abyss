import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {bridge} from '../../../experiments/art-tech-lab/rpc.mjs';
import {nativeTheme} from '../../../scripts/native-ui-theme.mjs';
import {officialAssetsTheme} from '../../../scripts/official-assets-layout.mjs';
const [input,out,mode]=process.argv.slice(2);assert(['compatibility','cost'].includes(mode));assert(!fs.existsSync(out),'new evidence directory required');fs.mkdirSync(out,{recursive:true});
const prep=JSON.parse(fs.readFileSync(path.join(input,'preparation.json'))),hash=b=>createHash('sha256').update(b).digest('hex');
const unpack=r=>r.structuredContent??JSON.parse(r.content.find(c=>c.type==='text').text);
const b=bridge(),report={status:'running',productionSha:prep.productionSha,preparationSha256:hash(fs.readFileSync(path.join(input,'preparation.json'))),mode,
 scope:'actual SDK software renderer; manual clock; no official import, GPU or device claim',environment:{node:process.version,platform:process.platform,arch:process.arch,startedAt:new Date().toISOString()},runs:[]};
const collectorBytes=fs.readFileSync(new URL(import.meta.url));report.collectorSha256=hash(collectorBytes);fs.writeFileSync(path.join(out,'collector-source.mjs.gz'),gzipSync(collectorBytes));
const write=()=>fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
const deadline=mode==='cost'?setTimeout(()=>{report.status='partial-window-timeout';report.error='50s measurement budget exhausted; no additional sampling';write();b.close();process.exitCode=1;},50000):null;
deadline?.unref();
const walk=n=>[n,...(n.children??[]).flatMap(walk)],allTree=s=>(s.tree??[]).flatMap(walk);
function counts(root){
 const r={totalControls:0,totalImages:0,totalTexts:0,visibleControls:0,visibleImages:0,visibleTexts:0};
 const visit=(n,parent)=>{
  r.totalControls++;if(n.kind==='image')r.totalImages++;if(n.kind==='textbox')r.totalTexts++;
  const visible=parent&&n.active!==false&&n.visible!==false;
  if(visible){r.visibleControls++;if(n.kind==='image'&&n.imageColor>>>24)r.visibleImages++;if(n.kind==='textbox'&&n.text)r.visibleTexts++;}
  for(const c of n.children??[])visit(c,visible);
 };visit(root,true);return r;
}
const descendants=n=>walk(n),child=(n,name)=>n.children.find(c=>c.name===name);
function colour(n){return [(n.imageColor>>>16)&255,(n.imageColor>>>8)&255,n.imageColor&255,n.imageColor>>>24];}
const expectedHex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)).concat(255);
function assertClean(state){assert(!state.mountError,state.mountError);assert(!(state.logs??[]).some(l=>l.level==='lua-error'||/rejected|ABYSS_UI failed/.test(l.text)),JSON.stringify(state.logs));}
async function inspect(handle){const s=unpack(await b.call('qxqy_studio_play',{handle,action:'get',args:{inspect:true,paint:true,view:true}}));report.lastInspection={frame:s.frame,time:s.time,logs:s.logs};assertClean(s);return s;}
async function screenshot(handle,name){const shot=await b.call('qxqy_studio_play_screenshot',{handle}),pic=shot.content.find(c=>c.type==='image');assert(pic);const bytes=Buffer.from(pic.data,'base64');fs.writeFileSync(path.join(out,name+'.png'),bytes);return {file:name+'.png',sha256:hash(bytes)};}
async function open(file){const bytes=fs.readFileSync(file),opened=unpack(await b.call('qxqy_project_open',{path:path.relative(process.cwd(),file).replaceAll('\\','/')}));const started=unpack(await b.call('qxqy_studio_play',{handle:opened.handle,action:'start',args:{clockMode:'manual',canvasId:'pc-16-9'}}));assertClean(started);return {handle:opened.handle,inputSha256:hash(bytes),startLogs:started.logs};}
try{
 report.sdk=await b.request('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'sts-frozen-final',version:'1'}});
 if(mode==='compatibility'){
  const opened=await open(path.join(input,'compatibility/probe.save.json')),handle=opened.handle;report.input=opened;delete report.input.handle;
  try{
   assert(opened.startLogs.some(l=>l.text==='STS_FINAL_COMPATIBILITY_READY'));
   const tokens=officialAssetsTheme(nativeTheme).officialAssets.stsCardReference;
   async function capture(phase,stage){
    const state=await inspect(handle),card=allTree(state).find(n=>n.name==='card');assert(card,'actual card tree required');
    fs.writeFileSync(path.join(out,`inspection-${phase}-${stage}.json.gz`),gzipSync(JSON.stringify(state)));
    const entry=prep.compatibilityStates[phase-1],pool=child(card,'artSamples'),fallback=child(card,'art'),front=child(card,'stsReferenceChrome'),back=child(card,'stsReferenceBack');
    const frame=child(front,'frame'),parts=descendants(frame).filter(n=>/^part\d+$/.test(n.name));
    const expectedParts=({attack:48,skill:68,power:142})[entry.type]??68;
    assert.equal(parts.filter(n=>n.visible).length,expectedParts,'pool leftover visibility');
    for(const part of parts.filter(n=>!n.visible)){assert.equal(part.anchoredPositionX,0);assert.equal(part.anchoredPositionY,0);assert.equal(part.localRotationZ,0);assert.equal(part.localScaleX,1);assert.equal(part.localScaleY,1);}
    const rarity=tokens.rarity[entry.rarity]??tokens.rarity.common;
    assert.deepEqual(colour(parts.find(n=>n.visible)),expectedHex(rarity.frame));
    const bannerPart=descendants(child(front,'banner')).find(n=>n.kind==='image'&&n.name==='strip0'&&colour(n)[0]===parseInt(rarity.banner.slice(1,3),16));
    assert(bannerPart,'actual banner RGBA required');assert.deepEqual(colour(bannerPart),expectedHex(rarity.banner));
    if(entry.assetShapes>0){assert.equal(pool.visible,stage==='ready');assert.equal(fallback.visible,stage!=='ready');}
    assert.deepEqual([pool.anchoredPositionX,pool.anchoredPositionY],[0,37.5]);assert(Math.abs(pool.localScaleX-5/6)<1e-6);assert.equal(pool.localScaleX,pool.localScaleY);
    const label=child(card,'label'),title=child(card,'name');assert.equal(label.text,entry.fullText);assert(label.fontSize>=14);assert.equal(title.fontSize,14);
    const name=`phase-${phase}-${entry.id}-${stage}`;
    fs.writeFileSync(path.join(out,name+'.state.json.gz'),gzipSync(JSON.stringify(state)));
    const row={phase,stage,card:entry,frameParts:parts.length,visibleFrameParts:expectedParts,poolVisible:pool.visible,fallbackVisible:fallback.visible,
     frameRGBA:colour(parts.find(n=>n.visible)),bannerRGBA:colour(bannerPart),holder:{position:[pool.anchoredPositionX,pool.anchoredPositionY],size:[pool.sizeDeltaX,pool.sizeDeltaY],scale:[pool.localScaleX,pool.localScaleY]},
     cardCounts:counts(card),backCounts:counts(back),frontCounts:counts(front),text:{complete:label.text===entry.fullText,fontSize:label.fontSize,titleFontSize:title.fontSize},logs:state.logs,screenshot:await screenshot(handle,name)};
    report.runs.push(row);write();console.log(JSON.stringify({phase,stage,id:entry.id,counts:row.cardCounts}));
   }
   for(let phase=1;phase<=prep.compatibilityStates.length;phase++){
    await capture(phase,'pending');
    for(let i=0;i<60;i++)assertClean(unpack(await b.call('qxqy_studio_play',{handle,action:'step',args:{dt:1/60}})));
    await capture(phase,'ready');
    if(phase<prep.compatibilityStates.length)for(let i=0;i<60;i++)assertClean(unpack(await b.call('qxqy_studio_play',{handle,action:'step',args:{dt:1/60}})));
   }
  }finally{await b.call('qxqy_studio_play',{handle,action:'stop'});}
 }else{
  report.samples=5;report.warmup=3;
  for(const count of [1,5,10])for(const version of count===5?['candidate','baseline']:['baseline','candidate']){
   const file=version==='candidate'?path.join(input,'official-'+count,'probe.save.json'):'.artifacts/sts-card-reference/cost-v2-baseline-'+count+'/prototype.save.json';
   const opened=await open(file),handle=opened.handle;
   try{
    if(version==='candidate')assert(opened.startLogs.some(l=>l.text===`STS_FINAL_OFFICIAL_READY count=${count} cards=false`),'current production component initialization log required');
    const state=await inspect(handle),cards=allTree(state).filter(n=>/^card\d+$/.test(n.name));assert.equal(cards.length,count);
    const times=[];let shot;
    for(let i=0;i<report.warmup+report.samples;i++){
     const t=performance.now();shot=await b.call('qxqy_studio_play_screenshot',{handle});if(i>=report.warmup)times.push(performance.now()-t);
    }
    const image=shot.content.find(c=>c.type==='image'),bytes=Buffer.from(image.data,'base64'),name=version+'-'+count;fs.writeFileSync(path.join(out,name+'.png'),bytes);
    fs.writeFileSync(path.join(out,name+'.state.json.gz'),gzipSync(JSON.stringify(state)));
    const row={version,count,inputSha256:opened.inputSha256,startLogs:opened.startLogs,perCard:cards.map(counts),wholeTree:state.tree.map(counts),samplesMs:times,medianMs:times.toSorted((a,b)=>a-b)[Math.floor(times.length/2)],screenshot:{file:name+'.png',sha256:hash(bytes)}};
    report.runs.push(row);write();console.log(JSON.stringify({version,count,perCard:row.perCard[0],medianMs:row.medianMs}));
   }finally{await b.call('qxqy_studio_play',{handle,action:'stop'});}
  }
 }
 report.status='captured-and-asserted';
}catch(error){if(report.status!=='partial-window-timeout'){report.status='failed';report.error=String(error.stack);}process.exitCode=1;console.log(report.error);}
finally{if(deadline)clearTimeout(deadline);write();b.close();}
