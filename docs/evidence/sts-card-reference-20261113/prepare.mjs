import fs from 'node:fs';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {buildStsAngerReferencePrototype,stsAngerReference,geoCardReferenceTokens,referencePrimitiveCount,referenceGeometry,buildReferenceBanner,buildReferenceBodyFit,buildReferenceFrameFit,buildReferenceBannerStrips,buildReferencePortrait} from '../../../scripts/sts-card-reference-profile.mjs';
import {nativeTheme} from '../../../scripts/native-ui-theme.mjs';
import {gameLayout} from '../../../scripts/game-ui-layout.mjs';
import {applyOfficialAssets,officialAssetsTheme} from '../../../scripts/official-assets-layout.mjs';
const out=path.resolve(process.argv[2]??'.artifacts/sts-card-reference/prototype-1');
assert(!fs.existsSync(out),'new output required');fs.mkdirSync(out,{recursive:true});
const seed=JSON.parse(fs.readFileSync('experiments/art-tech-lab/seed.save.json'));
let source=gunzipSync(fs.readFileSync('docs/evidence/battle-piles-final-20261111/readback-adapter.mjs.gz')).toString();
source=source.slice(source.indexOf('const seed='),source.indexOf('const save=structuredClone(seed)'));
source=source.slice(source.indexOf('function collect'));
source=source.replace(/const templateIds=.*?warnings=\[\]/,'const templateIds={},warnings=[]');
const adapter=`export function project(seed,scriptMetadata){const prototypes=new Map();${source}\nreturn {node,warnings,unknown,get count(){return converted}};}`;
fs.writeFileSync(path.join(out,'layout-adapter.mjs'),adapter);
const {project}=await import(pathToFileURL(path.join(out,'layout-adapter.mjs')));
const lua='function OnStart() print("STS_ANGER_REFERENCE ready single-card geometry-only") end\n';
const scripts=new Map([['sts_anger_reference',{guid:1800000001}]]),p=project(seed,scripts);
const tokens=geoCardReferenceTokens(nativeTheme),small=buildStsAngerReferencePrototype({tokens});
small.name='AngerReference1x';small.position=[-230,0];
const large=structuredClone(small);large.name='AngerReference2x';large.position=[100,0];large.scale=[2,2];
const caption=(name,x,y,content)=>({name,kind:'text',position:[x,y],size:[500,40],text:{content,fontSize:18,minFontSize:18,colour:'#E4DFD0',align:'centre',valign:'middle'}});
const spec={name:'StsCardReferenceScene',kind:'container',size:[1280,720],script:'sts_anger_reference',children:[
 {name:'backdrop',kind:'image',position:[0,0],size:[1280,720],image:100001,colour:'#1C2225'},
 small,large,caption('caption1',-230,-145,'1x native size / 150 x 210'),
 caption('caption2',100,-260,'2x diagnostic scale'),
 caption('scope',0,300,'Anger geometry study / Geo material / no imported texture'),
 ]};
if(['masks','masks-fit','masks-lines'].includes(process.argv[3])){
 spec.children=spec.children.slice(0,1);
 for(const [key,x]of [['body',-300],['frame',300]]){
  const edgeBleed=process.argv[4]===undefined?stsAngerReference.nativeAdapter.edgeBleed:Number(process.argv[4]);
  const earSelection=process.argv[5]??stsAngerReference.nativeAdapter.earSelection;
  const c=stsAngerReference.contours[key],node=key==='body'&&process.argv[3]==='masks-fit'?buildReferenceBodyFit('#FFFFFF'):key==='frame'&&process.argv[3]==='masks-lines'?buildReferenceFrameFit('#FFFFFF'):referenceGeometry(key+'Mask',c.points,'#FFFFFF',c.offset,{edgeBleed,earSelection});
  // Preserve the measured fit centre; replacing it with zero invalidates
  // registration by the source's asymmetric 1-2px margins.
  node.position=[x+node.position[0]*4,node.position[1]*4];node.scale=[4,4];spec.children.push(node);
 }
}
if(['banner-mask','banner-mask-partitioned','banner-mask-strips'].includes(process.argv[3])){
 const c=stsAngerReference.contours.banner,edgeBleed=Number(process.argv[4]??stsAngerReference.nativeAdapter.edgeBleed),earSelection=process.argv[5]??stsAngerReference.nativeAdapter.earSelection;
 const uniform={...tokens.rarity.common,bannerFold:tokens.rarity.common.banner};
 const node=process.argv[3]==='banner-mask-strips'?buildReferenceBannerStrips(uniform):process.argv[3]==='banner-mask-partitioned'?buildReferenceBanner(uniform,{edgeBleed,earSelection}):referenceGeometry('bannerMask',c.points,tokens.rarity.common.banner,c.offset,{edgeBleed,earSelection});node.scale=[4,4];
 spec.children=[spec.children[0],node];
}
if(process.argv[3]?.startsWith('type-mask-')){
 const kind=process.argv[3].slice(10);assert(['attack','skill','power'].includes(kind));
 const monochrome=structuredClone(tokens);for(const key of Object.keys(monochrome.rarity.common))monochrome.rarity.common[key]='#FFFFFF';monochrome.portrait='#1C2225';
 const node=buildReferencePortrait(kind,monochrome);node.scale=[4,4];
 spec.children=[spec.children[0],node];
}
let costFixture=null;
if(process.argv[3]?.startsWith('cost-')){
 const match=/^cost-(baseline|candidate)-(1|5|10)$/.exec(process.argv[3]);assert(match,'explicit cost fixture required');
 const [,version,countText]=match,count=Number(countText),started=performance.now();
 const statePath=process.argv[4];assert(statePath,'actual prior runtime snapshot is required for the baseline');
 const stateBytes=fs.readFileSync(statePath),state=JSON.parse(gunzipSync(stateBytes));
 const all=n=>[n,...(n.children??n.controls??[]).flatMap(all)];
 let actual;
 const find=(node,path='')=>{if(path.includes('/deckPanel/pileGrid/')&&node.name==='face'&&node.children.some(n=>n.name==='type'&&n.text==='攻击'))actual??=node;for(const child of node.children??[])find(child,path+'/'+node.name);};
 state.tree.forEach(n=>find(n));assert(actual,'prior runtime attack card required');
 let card;
 if(version==='candidate'){
  const text=name=>actual.children.find(n=>n.name===name).text;
  const layout=gameLayout();applyOfficialAssets([layout],officialAssetsTheme(nativeTheme));
  card=structuredClone(all(layout).find(n=>n.name==='card1'));assert(card);
  card.children=card.children.filter(n=>n.name!=='hit');
  for(const name of ['name','label','cost','type'])card.children.find(n=>n.name===name).text.content=text(name);
 }else{
  const layout=gameLayout();applyOfficialAssets([layout],officialAssetsTheme(nativeTheme));
  card=structuredClone(all(layout).find(n=>n.name==='card1'));assert(card);
  card.children=card.children.filter(n=>n.name!=='hit');
  const overlay=(node,prior)=>{
   assert(prior,'baseline child missing: '+node.name);
   node.visible=prior.visible;node.active=prior.active;
   node.position=[prior.anchoredPositionX,prior.anchoredPositionY];node.size=[prior.sizeDeltaX,prior.sizeDeltaY];
   node.scale=[prior.localScaleX,prior.localScaleY];node.rotation=prior.localRotationZ;
   if(node.text){node.text.content=prior.text;node.text.fontSize=prior.fontSize;node.text.minFontSize=prior.minimumFontSize;node.text.autoSize=prior.adaptiveFontSize;}
   if(node.kind==='image'&&prior.imageColor!==null){node.colour='#'+(prior.imageColor&0xffffff).toString(16).padStart(6,'0');node.opacity=(prior.imageColor>>>24)/255;node.image=prior.imageId;}
   for(const child of node.children??[])overlay(child,prior.children.find(n=>n.name===child.name));
  };
  overlay(card,actual);
 }
 card.position=[0,0];card.scale=[1,1];card.rotation=0;card.visible=true;card.active=true;
 const countNodes=(node,inherited=true)=>{
  const visible=inherited&&node.visible!==false&&node.active!==false&&(node.opacity??1)>0;
  return (node.children??[]).reduce((a,c)=>{const b=countNodes(c,visible);for(const key of Object.keys(a))a[key]+=b[key];return a;},
   {total:1,visibleControls:Number(visible),visibleImages:Number(visible&&node.kind==='image'),visibleTexts:Number(visible&&node.kind==='text'&&Boolean(node.text?.content))});
 };
 const perCard=countNodes(card),fixtureAssemblyMs=performance.now()-started;
 spec.children=[spec.children[0],...Array.from({length:count},(_,i)=>({...structuredClone(card),name:'card'+i,position:[count===1?0:(i%5-2)*200,count===10?(i<5?125:-125):0]}))];
 costFixture={version,count,perCard,allCards:Object.fromEntries(Object.entries(perCard).map(([k,v])=>[k,v*count])),fixtureAssemblyMs,
  baselineRuntimeSha256:createHash('sha256').update(stateBytes).digest('hex'),baselineRuntimeSnapshot:statePath,
  scope:'same 150x210 static SDK cards; candidate uses the installed production shared card tree with identical prior attack text; baseline uses prior actual legacy runtime properties. fixtureAssemblyMs is setup only and NOT a fair renderer benchmark; no gameplay update-loop/device claim'};
}
const save=structuredClone(seed),holder=structuredClone(seed.assets.server.root);
const projectionStarted=performance.now();
holder.children=[p.node(spec,{},'')];holder.scriptMappingIds=[];
const projectionMs=performance.now()-projectionStarted;
save.meta={name:'StS1 Anger source-measured geometry prototype'};save.serverLogic={version:1,rules:[]};save.controlGuidChanges=[];save.scriptSync=null;
save.assets.server={...seed.assets.server,root:holder,canvasId:'pc-16-9'};
save.assets.client.root.children=[];save.assets.client.root.scriptMappingIds=[];
save.assets.scripts=[{id:'sts_anger_reference',guid:1800000001,path:'sts_anger_reference.lua',source:lua,controlAsset:'server-control-template',controlId:holder.children[0].id}];
const serializationStarted=performance.now(),bytes=JSON.stringify(save),serializationMs=performance.now()-serializationStarted,hash=b=>createHash('sha256').update(b).digest('hex');
fs.writeFileSync(path.join(out,'prototype.save.json'),bytes);
const receipt={kind:'actual-sdk-single-card-geometry-fixture',reference:stsAngerReference.id,sourceProfile:stsAngerReference,
 edgeBleed:costFixture||process.argv[4]===undefined?stsAngerReference.nativeAdapter.edgeBleed:Number(process.argv[4]),
 earSelection:process.argv[5]??stsAngerReference.nativeAdapter.earSelection,
 inputs:Object.fromEntries(['scripts/sts-card-reference-profile.mjs','scripts/v25-battle-scene.mjs','data/presentation/ui_theme.json','docs/evidence/sts-card-reference-20261113/prepare.mjs'].map(file=>[file,hash(fs.readFileSync(file))])),
 saveSha256:hash(bytes),tokens,imagesPerCard:costFixture?.perCard.visibleImages??referencePrimitiveCount(small),controls:p.count,unknownProperties:Object.fromEntries(p.unknown),warnings:p.warnings,
 costFixture,
 projectionMs,serializationMs,
 officialClient:false,deviceEvidence:false,materialFidelity:'not_passed-flat-study',wholeCardFidelity:'not_passed'};
assert.deepEqual(receipt.unknownProperties,{});
fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2));
console.log(JSON.stringify({out,imagesPerCard:receipt.imagesPerCard,unknownProperties:receipt.unknownProperties}));
