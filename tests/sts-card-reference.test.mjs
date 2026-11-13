import test from 'node:test';
import assert from 'node:assert/strict';
import {stsAngerReference,stsTypeFrameReference,stsReferenceRuntimeGeometry,installStsReferenceCardChrome,buildStsAngerReferencePrototype,buildReferenceBanner,geoCardReferenceTokens,referenceGeometry,referencePrimitiveCount} from '../scripts/sts-card-reference-profile.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {applyOfficialAssets,officialAssetsTheme} from '../scripts/official-assets-layout.mjs';
import {nativeShape,nativeSceneEdgeBleed} from '../scripts/v25-battle-scene.mjs';
import {deckCardTemplate} from '../scripts/deck-ui-layout.mjs';
const all=n=>[n,...(n.children??n.controls??[]).flatMap(all)];
const inside=([x,y],points)=>{
 let result=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const [a,b]=points[i],[c,d]=points[j];
  if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)result=!result;
 }
 return result;
};

test('official hand and browser wells retain approved type colours and type labels explicitly disable the inherited outline',()=>{
 const theme=officialAssetsTheme(nativeTheme);
 theme.cardSkin.artWells.attack='#123456';theme.cardSkin.artWells.skill='#654321';
 const tree=gameLayout(),deck=deckCardTemplate(theme);
 applyOfficialAssets([tree,deck],theme);
 for(const face of [all(tree).find(n=>n.name==='card1'),deck.children.find(n=>n.name==='face')]){
  const portraits=all(face).find(n=>n.name==='portraits');
  for(const kind of ['attack','skill','power']){
   const well=portraits.children.find(n=>n.name===kind).children.find(n=>n.name==='well');
   assert(all(well).filter(n=>n.kind==='image').every(n=>n.colour===theme.cardSkin.artWells[kind]),kind+' well must resolve the existing cardSkin token');
  }
  const labels=all(face).filter(n=>n.name==='type');assert.equal(labels.length,1);
  assert.equal(labels[0].text.outline,false,'small dark type text must not inherit the native dark outline');
  assert.equal(labels[0].text.fontSize,14,'outline correction cannot silently change the native font contract');
 }
});

test('official type text opts out of the native default dark outline',()=>{
 const theme=officialAssetsTheme(nativeTheme),tree=gameLayout();applyOfficialAssets([tree],theme);
 const face=all(tree).find(n=>n.name==='card1');
 assert.equal(face.children.find(n=>n.name==='type').text.outline,false);
});

test('native minimum-size Chinese type text keeps a light backing over its full layout budget',()=>{
 const theme=officialAssetsTheme(nativeTheme),tree=gameLayout(),deck=deckCardTemplate(theme);applyOfficialAssets([tree,deck],theme);
 for(const face of [all(tree).find(n=>n.name==='card1'),deck.children.find(n=>n.name==='face')]){
  const plaque=face.children.find(n=>n.name==='stsReferenceChrome').children.find(n=>n.name==='plaqueFace');
  const label=face.children.find(n=>n.name==='type');
  assert.deepEqual(plaque.position,label.position,'the backing must be centred on the actual type label');
  assert.deepEqual(plaque.size,[42,21],'38px available text width and 16.8px line-height retain about 2px inset');
  assert.equal(label.text.fontSize,14);assert.deepEqual(label.size,[42,28]);
 }
 assert.deepEqual(stsAngerReference.materialGeometry.plaque.size,[80,30],'original 20x7.5 source measurement remains unchanged');
});

test('Anger study keeps the pinned source coordinate system and angular attack corner',()=>{
 const p=stsAngerReference;
 assert.deepEqual(p.source.bodySize,[600,840]);assert.deepEqual(p.source.logicalSize,[150,210]);
 assert.equal(p.source.scale,.25);assert.equal(p.contours.body.sha256,'672eb9535de014f70932e479e061c1bff5dc66042b9b02f7d56ce50847606cb4');
 assert(inside([8,830],p.contours.body.points),'measured lower-left bevel point must remain inside');
 const roundCornerContains=Math.hypot(8*.25-9,830*.25-201)<=9;
 assert.equal(roundCornerContains,false,'r9 fallback must fail this source corner observation');
 assert(inside([300,4.75],p.contours.body.points));
 assert(!inside([300,1],p.contours.body.points));
 assert(Object.isFrozen(p.contours.body.points));
 for(const c of Object.values(p.contours))assert(c.measurement.maxBoundarySourcePx*p.source.scale<=.5);
});

test('attack frame and title use measured independent layers instead of compressing the illustration',()=>{
 const p=stsAngerReference;
 assert.deepEqual(p.contours.frame.offset,[30,0]);
 const sourceLowest=Math.max(...p.contours.frame.points.map(v=>v[1]));
 assert.equal(sourceLowest,482);assert.equal(sourceLowest*p.source.scale,120.5);
 assert.deepEqual(p.anchors.type,[305,455]);assert.deepEqual(p.anchors.title,[300,74]);
 assert.equal(p.uncertainty.officialClient,'not_run');
 assert(p.contours.frame.measurement.maskIoU<.96,'the thin-frame raster residual must not be hidden as exact parity');
});

test('Geo character tokens cannot change common rarity or silently introduce a second palette',()=>{
 const theme=structuredClone(nativeTheme),first=geoCardReferenceTokens(theme);
 theme.color.geo='#123456';const second=geoCardReferenceTokens(theme);
 assert.equal(second.character.accent,'#123456');assert.equal(second.cost.face,'#123456');
 assert.deepEqual(first.rarity,second.rarity);
 assert.deepEqual(second.rarity.common,theme.officialAssets.stsCardReference.rarity.common);
 assert.throws(()=>geoCardReferenceTokens({}),/shared UI theme/);
 assert.throws(()=>buildStsAngerReferencePrototype(),/explicit shared tokens/);
});

test('single-card study reuses native triangles with bounded controls and preserves exact requested token colour',()=>{
 const tokens=geoCardReferenceTokens(nativeTheme),tree=buildStsAngerReferencePrototype({tokens});
 const nodes=all(tree),images=nodes.filter(n=>n.kind==='image');
 assert.equal(referencePrimitiveCount(tree),images.length);assert(images.length<=240);
 assert(nodes.every(n=>(n.children?.length??0)<=60));
 assert(nodes.every(n=>!['cursorArea','presetButton','grid'].includes(n.kind)),'prototype cannot own gameplay input');
 assert(images.every(n=>[100001,100002,100003,102012].includes(n.image)),'no raw source card texture is mounted');
 const shape=referenceGeometry('sourceTone',[[0,0],[600,0],[600,840],[0,840]],'#ABCDEF');
 assert(all(shape).filter(n=>n.kind==='image').every(n=>n.colour==='#ABCDEF'),'scene grading cannot mutate a card token');
 const texts=nodes.filter(n=>n.kind==='text');
 assert.equal(texts.find(n=>n.name==='type').text.fontSize,8);
 assert.equal(texts.find(n=>n.name==='description').text.fontSize,12);
});

test('diagnostic prototype stays separate while every official host adopts the same shared skin',()=>{
 const tree=gameLayout(),theme=officialAssetsTheme(nativeTheme);applyOfficialAssets([tree],theme);
 assert(!all(tree).some(n=>n.name==='StsAngerReferencePrototype'));
 assert(all(tree).filter(n=>n.name==='stsReferenceChrome').length>40);
});

test('shared polygon adapter keeps the scene default while allowing a bounded measured card bleed',()=>{
 const shape={name:'test',type:'polygon',points:[[600,300],[650,300],[630,350]],colour:'#ABCDEF',opacity:1};
 assert.equal(nativeSceneEdgeBleed,.45);
 assert.deepEqual(nativeShape(shape,{}),nativeShape(shape,{},{edgeBleed:.45}));
 const tight=nativeShape(shape,{},{edgeBleed:.1}),legacy=nativeShape(shape,{});
 assert.equal(tight.length,legacy.length);
 assert(tight.every((n,i)=>n.size[0]<legacy[i].size[0]&&n.size[1]<legacy[i].size[1]));
 for(const edgeBleed of [-.01,1.01,NaN])assert.throws(()=>nativeShape(shape,{},{edgeBleed}),/within 0..1/);
});

const polygonArea=points=>Math.abs(points.reduce((sum,a,i)=>{const b=points[(i+1)%points.length];return sum+a[0]*b[1]-a[1]*b[0];},0))/2;
test('balanced ears conserve the original concave banner without adding drawing items or changing scene defaults',()=>{
 const shape={name:'banner',type:'polygon',points:stsAngerReference.contours.banner.points,colour:'#9E9E9E',opacity:1};
 const legacy=nativeShape(shape,{}),explicit=nativeShape(shape,{},{earSelection:'first'});
 assert.deepEqual(legacy,explicit);
 const balanced=nativeShape(shape,{},{edgeBleed:0,earSelection:'balanced'}),first=nativeShape(shape,{},{edgeBleed:0,earSelection:'first'});
 assert.equal(balanced.length,first.length);
 const nativeArea=balanced.reduce((sum,n)=>sum+n.size[0]*n.size[1]/4,0);
 assert(Math.abs(nativeArea-polygonArea(shape.points))<1e-6,'quality selection must preserve the source polygon area');
 assert.throws(()=>nativeShape(shape,{},{earSelection:'other'}),/first or balanced/);
});

test('banner folds partition the pinned outline once and keep rarity materials separate',()=>{
 const p=stsAngerReference,outline=p.contours.banner.points,partition=p.materialGeometry.bannerPartition;
 const partitionArea=Object.values(partition).reduce((sum,indices)=>sum+polygonArea(indices.map(i=>outline[i])),0);
 assert.equal(partitionArea,polygonArea(outline));
 const r=geoCardReferenceTokens(nativeTheme).rarity.common,tree=buildReferenceBanner(r);
 assert.deepEqual(tree.children.map(n=>n.name),['bannerleft','bannerright','bannerfront']);
 for(const node of tree.children){
  const expected=node.name==='bannerfront'?r.banner:r.bannerFold;
  assert(all(node).filter(n=>n.kind==='image').every(n=>n.colour===expected));
 }
 assert.equal(referencePrimitiveCount(tree),84,'partitioning cannot add hidden full-polygon overlays');
});

test('measured type frame profiles retain the real power hole and a single fixed native triangle pool',()=>{
 const geometry=stsReferenceRuntimeGeometry;
 assert.deepEqual(Object.fromEntries(Object.entries(geometry.frameProfiles).map(([k,v])=>[k,v.length])),{attack:48,skill:68,power:142});
 for(const reference of Object.values(stsTypeFrameReference))assert(reference.maxBoundarySourcePx<=2);
 const nativeTriangle=s=>[[0,0],[s.size[0]/2,0],[0,s.size[1]*s.scale[1]]].map(([x,y])=>{
  const r=s.rotation*Math.PI/180;return[s.position[0]+x*Math.cos(r)-y*Math.sin(r),s.position[1]+x*Math.sin(r)+y*Math.cos(r)];
 });
 assert(!geometry.frameProfiles.power.some(s=>inside([0,46.75],nativeTriangle(s))),'closed power frame cannot fill its illustration hole');
 assert(geometry.frameProfiles.power.some(s=>inside([0,103],nativeTriangle(s))),'the measured upper arc must remain');
});

test('installer preserves native illustration coordinates, fits uniformly and sandwiches artwork between back and frame',()=>{
 const theme=officialAssetsTheme(nativeTheme),tree=gameLayout();applyOfficialAssets([tree],theme);
 const face=structuredClone(all(tree).find(n=>n.name==='card1'));
 // Reconstruct an uninstalled imported face from this same tree only for the
 // installer boundary; the art holder is a real native source-space contract.
 face.children=face.children.filter(n=>!['stsReferenceBack','stsReferenceChrome'].includes(n.name));
 face.children.push({name:'artSamples',kind:'container',position:[0,40],size:[144,64],children:[]});
 const art=face.children.find(n=>n.name==='art'),holder=face.children.at(-1);
 installStsReferenceCardChrome(face,theme);
 assert.strictEqual(face.children.find(n=>n.name==='art'),art);
 assert.strictEqual(face.children.find(n=>n.name==='artSamples'),holder);
 assert.deepEqual(holder.position,[0,37.5]);assert.deepEqual(holder.size,[144,64]);assert.deepEqual(holder.scale,[5/6,5/6]);
 const index=name=>face.children.findIndex(n=>n.name===name);
 assert(index('stsReferenceBack')<index('artSamples'));assert(index('artSamples')<index('stsReferenceChrome'));assert(index('stsReferenceChrome')<index('name'));
 assert.equal(face.children.find(n=>n.name==='name').text.valign,'middle');
});
