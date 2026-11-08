import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareComponentControlLayout,assertComponentControlOutput} from '../scripts/native-component-profile.mjs';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {withViewport} from '../scripts/viewport-layout.mjs';
import {deckCardTemplate} from '../scripts/deck-ui-layout.mjs';
import {componentDrawingBounds} from '../scripts/build-component-candidate.mjs';

const widgets=Object.fromEntries(['button','card','panel','actor','emblem','contentImage','menu','costBadge'].map((role,i)=>[role,{
  templateId:1700000000+i*10000,sourceSha256:'a'.repeat(64),designSize:[200,300],center:[10,-5],fontColor:0xff181818}]));
function flatten(node){return [node,...(node.children??node.controls??[]).flatMap(flatten)];}
function supplied(){return withViewport(gameLayout(nativeTheme),nativeTheme);}

test('complete game retains legal hand slots, text and input geometry while removing old painters',()=>{
  const input=supplied(), before=structuredClone(input);
  const result=prepareComponentControlLayout(input,[deckCardTemplate(nativeTheme)],widgets);
  assert.deepEqual(input,before,'the approved base layout is immutable');
  const old=flatten(input),next=flatten(result.layout);
  const oldHands=old.find(n=>n.name==='battlePanel').children.filter(n=>/^card\d+$/.test(n.name));
  assert.equal(oldHands.length,10);
  assert.equal(next.find(n=>n.name==='battlePanel').children.filter(n=>/^card\d+$/.test(n.name)).length,oldHands.length);
  assert.equal(next.filter(n=>n.kind==='image').length,0);
  assert.equal(result.receipt.removedLegacyPaint,old.filter(n=>n.kind==='image').length+flatten(deckCardTemplate(nativeTheme)).filter(n=>n.kind==='image').length);
  const interaction=node=>({name:node.name,kind:node.kind,position:node.position,size:node.size,focusable:node.focusable,states:node.states});
  assert.deepEqual(next.filter(n=>['cursorArea','presetButton','grid'].includes(n.kind)).map(interaction),
    old.filter(n=>['cursorArea','presetButton','grid'].includes(n.kind)).map(interaction));
  assert.deepEqual(next.filter(n=>n.text).map(n=>n.text),old.filter(n=>n.text).map(n=>n.text));
});

test('original visuals occupy isolated hosts and grid cards receive local original placements',()=>{
  const result=prepareComponentControlLayout(supplied(),[deckCardTemplate(nativeTheme)],widgets);
  assert.ok(result.binding.placements.some(p=>p.role==='card'&&p.path.includes('card10')));
  assert.ok(result.binding.placements.some(p=>p.role==='actor'&&p.path.includes('hero')));
  assert.ok(result.binding.placements.some(p=>p.role==='panel'&&p.path==='mapPanel'));
  assert.ok(result.binding.placements.some(p=>p.role==='button'&&p.path==='menuPanel/start'));
  assert.ok(result.binding.placements.some(p=>p.role==='button'&&p.path==='battlePanel/endTurn'));
  assert.ok(result.binding.placements.some(p=>p.role==='card'&&p.path==='nodePanel/shopView/card1'));
  assert.ok(result.binding.placements.some(p=>p.role==='actor'&&p.path==='characterPanel/details/portraits/hutao'));
  assert.ok(result.binding.placements.some(p=>p.role==='contentImage'&&/\/node1\/icon$/.test(p.path)));
  assert.ok(result.binding.placements.some(p=>p.role==='contentImage'&&/\/edge1$/.test(p.path)));
  assert.ok(result.binding.placements.some(p=>p.role==='menu'&&p.path==='exitEntry/open'));
  assert.ok(result.binding.placements.some(p=>p.role==='costBadge'&&p.path==='battlePanel/card1/costDisc'));
  assert.ok(result.binding.placements.some(p=>p.role==='contentImage'&&p.path==='battlePanel/statusInfo/plate'));
  const dynamic=result.binding.templates[deckCardTemplate(nativeTheme).name];
  assert.ok(dynamic.placements.some(p=>p.role==='card'));
  assert.ok(dynamic.children.length);
  assert.equal(flatten(result.binding.root).filter(n=>n.name==='__kitOriginal').length,0);
  const text=flatten(dynamic).find(n=>n.name==='cost');
  assert.deepEqual(text.textStyle,{fontColor:widgets.card.fontColor});
  assert.deepEqual(result.binding.legacyArtwork,{cards:false,cardSurface:false,portraits:false,monsters:false,backgrounds:false});
});

test('invalid source bindings and reserved business hosts fail before packaging',()=>{
  assert.throws(()=>prepareComponentControlLayout(supplied(),[],{...widgets,card:{...widgets.card,sourceSha256:'unknown'}}),/binding/);
  const broken=supplied();broken.controls.find(c=>c.name==='stage').children.push({name:'__kitOriginal',kind:'container'});
  assert.throws(()=>prepareComponentControlLayout(broken,[],widgets),/Reserved/);
  assert.throws(()=>prepareComponentControlLayout({controls:[]},[],widgets),/one business stage/);
  assert.throws(()=>prepareComponentControlLayout(supplied(),[],{...widgets,card:{...widgets.card,center:[Infinity,0]}}),/binding/);
});

test('integrated packager rejects escaped layout or dynamic-template painters and binding divergence',()=>{
  const result=prepareComponentControlLayout(supplied(),[deckCardTemplate(nativeTheme)],widgets);
  result.layout.script={name:'abyss_ui',values:{nativeComponentControls:true}};
  assert.doesNotThrow(()=>assertComponentControlOutput(result.layout,result.templates,result.binding,widgets));
  const badLayout=structuredClone(result.layout);
  badLayout.controls.find(c=>c.name==='stage').children.push({name:'escaped',kind:'image',image:100001});
  assert.throws(()=>assertComponentControlOutput(badLayout,result.templates,result.binding,widgets),/Legacy painter/);
  const badTemplate=structuredClone(result.templates);badTemplate[0].children.push({name:'escaped',kind:'image',image:100001});
  assert.throws(()=>assertComponentControlOutput(result.layout,badTemplate,result.binding,widgets),/Legacy painter/);
  const badBinding=structuredClone(result.binding);badBinding.placements[0].templateId=123;
  assert.throws(()=>assertComponentControlOutput(result.layout,result.templates,badBinding,widgets),/placement/);
  const dropped=structuredClone(result.binding);dropped.placements=dropped.placements.filter(p=>p.path!=='battlePanel/card10');
  assert.throws(()=>assertComponentControlOutput(result.layout,result.templates,dropped,widgets),/coverage/);
  const zeroScale=structuredClone(result.binding);zeroScale.placements[0].scale=[0,0];
  assert.throws(()=>assertComponentControlOutput(result.layout,result.templates,zeroScale,widgets),/pose/);
  const fakeHash=structuredClone(result.binding);fakeHash.placements[0].sourceSha256='0'.repeat(64);
  assert.throws(()=>assertComponentControlOutput(result.layout,result.templates,fakeHash,widgets),/placement/);
  const pairedLayout=structuredClone(result.layout);
  const tenth=pairedLayout.controls.find(n=>n.name==='stage').children.find(n=>n.name==='battlePanel').children.find(n=>n.name==='card10');
  tenth.children=tenth.children.filter(n=>n.name!=='__kitOriginal');
  assert.throws(()=>assertComponentControlOutput(pairedLayout,result.templates,dropped,widgets),/Required.*inventory/);
  const erasedLayout=structuredClone(result.layout),erasedBinding=structuredClone(result.binding);
  const contentPath=erasedBinding.placements.find(p=>/\/node1\/icon$/.test(p.path)).path;
  let anchor=erasedLayout.controls.find(n=>n.name==='stage'),semanticNode=erasedBinding.root;
  for(const part of contentPath.split('/')){anchor=anchor.children.find(n=>n.name===part);semanticNode=semanticNode.children.find(n=>n.name===part);}
  anchor.children=anchor.children.filter(n=>n.name!=='__kitOriginal');
  delete semanticNode.contentImage;semanticNode.kind='container';
  erasedBinding.placements=erasedBinding.placements.filter(p=>p.path!==contentPath);
  assert.throws(()=>assertComponentControlOutput(erasedLayout,result.templates,erasedBinding,widgets),/Required business content/);
});

test('source bounds use the child pivot when a source rectangle stretches across anchors',()=>{
  const rect=(size,anchorMin={x:.5,y:.5},anchorMax=anchorMin,pivot={x:.5,y:.5})=>({scale:{x:1,y:1,z:1},rotation:{x:0,y:0,z:0},offset:{x:0,y:0},size,anchorMin,anchorMax,pivot});
  const source={rootId:1,records:[{id:1,children:[2],content:[],rect:rect({x:100,y:100})},
    {id:2,children:[],content:[96],rect:rect({x:0,y:40},{x:0,y:.5},{x:1,y:.5},{x:1,y:.5})}]};
  const result=componentDrawingBounds(source,r=>({transformByPlatform:{KEYBOARD:r.rect}}));
  assert.deepEqual(result.bounds,[-50,-20,50,20]);
  assert.deepEqual(result.center,[0,0]);
});
