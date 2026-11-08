import test from 'node:test';
import assert from 'node:assert/strict';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {withViewport} from '../scripts/viewport-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {attachOfficialPortraits} from '../scripts/official-portraits.mjs';
import {assertNativeUiCapacity} from '../scripts/build-ui.mjs';
import {applyV25CharacterLayout,v25CharacterReference} from '../scripts/v25-character-layout.mjs';
import {mkdirSync,mkdtempSync,readFileSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {compileUiMask,prepareUiMask,prepareV25UiMasks,attachV25UiMasks,assertV25UiMaskPreparation,v25UiMaskTemplate} from '../scripts/v25-ui-mask-assets.mjs';
import {compileRgbaRectangles,decodeRgbaRectangles} from '../scripts/v25-private-card-assets.mjs';
import {rebasePrivateUiMask} from '../scripts/v25-ui-mask-audit-inputs.mjs';

const children=node=>node?.controls??node?.children??[];
const child=(node,name)=>children(node).find(item=>item.name===name);
const panel=layout=>child(child(layout,'stage')??layout,'characterPanel');
const all=node=>[node,...children(node).flatMap(all)];
const paths=(node,prefix='',result=new Map())=>{result.set(prefix,node);for(const c of children(node))paths(c,prefix+'/'+c.name,result);return result;};
const frame=(x,y,w,h)=>({position:[x+w/2-640,360-y-h/2],size:[w,h]});
function build(){const l=withViewport(gameLayout(),nativeTheme);attachOfficialPortraits(l,{selectionAvatar:true,battlePortrait:true});return l;}
const theme=()=>({...nativeTheme,v25Character:{story:'批准剧情由主题注入。\n第二行仍由内容源提供。'}});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function maskFixture(t){
 const root=process.cwd(),base=resolve('.artifacts/test-tmp');mkdirSync(base,{recursive:true});
 const directory=mkdtempSync(join(base,'v25-mask-'));assert.equal(dirname(directory),base);
 t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const input=join(directory,'source.png'),python=process.env.ABYSS_PYTHON||process.env.MILIASTRA_PYTHON||'python';
 const made=spawnSync(python,['-c',"from PIL import Image;import sys;im=Image.new('RGBA',(3,2));im.putdata([(12,34,56,0),(88,77,66,128),(1,2,3,255),(3,2,1,255),(99,98,97,0),(0,0,0,7)]);im.save(sys.argv[1])",input]);
 assert.equal(made.status,0,made.stderr?.toString());const bytes=readFileSync(input);
 return {root,directory,input,bytes,python,options:{root,input,sourceSha256:sha(bytes),width:3,height:2,tint:'#FFE0A2',outputFile:join(directory,'mask.private.json'),python}};
}

test('private UI mask preserves source alpha and complete bounds with an explicit external colour contract',t=>{
 const f=maskFixture(t),pack=compileUiMask(f.options),prepared=prepareUiMask(f.options.outputFile,{root:f.root,python:f.python,expected:f.options});
 assert.equal(pack.sourceRgbPreserved,false);assert.equal(pack.source.alphaSha256,sha(Buffer.from([0,128,255,255,0,7])));
 const rgba=decodeRgbaRectangles(pack.asset);for(let i=0;i<6;i++)assert.deepEqual([...rgba.subarray(i*4,i*4+3)],[255,224,162]);
 assert.deepEqual(prepared.template.size,[3,2]);assert.equal(prepared.template.visible,true);assertNativeUiCapacity(prepared.template);
 assert.ok(readFileSync(f.input).equals(f.bytes));
 assert.throws(()=>prepareUiMask(f.options.outputFile,{root:f.root,python:f.python}),/caller contract/);
 assert.throws(()=>prepareUiMask(f.options.outputFile,{root:f.root,python:f.python,expected:{...f.options,tint:'#FFFFFF'}}),/caller contract/);
 rgba[3]=1;pack.asset=compileRgbaRectangles({width:3,height:2,rgba});writeFileSync(f.options.outputFile,JSON.stringify(pack));
 assert.throws(()=>prepareUiMask(f.options.outputFile,{root:f.root,python:f.python,expected:f.options}),/fresh source alpha/);
 assert.throws(()=>prepareV25UiMasks(f.options.outputFile),/contract|source/i);
});

test('private mask outputs reject source aliases and both lexical and physical escapes',t=>{
 const f=maskFixture(t);
 assert.throws(()=>compileUiMask({...f.options,outputFile:f.input}),/exists/);
 assert.throws(()=>compileUiMask({...f.options,outputFile:join(f.root,'source-mask.json')}),/build|artifacts/);
 const elsewhere=join(f.directory,'source-tree');mkdirSync(elsewhere);const link=join(f.directory,'linked-private');symlinkSync(elsewhere,link,process.platform==='win32'?'junction':'dir');
 assert.throws(()=>compileUiMask({...f.options,root:f.directory,input:f.input,outputFile:join(link,'escape.json')}),/build|artifacts/);
 symlinkSync(elsewhere,join(f.directory,'build'),process.platform==='win32'?'junction':'dir');
 assert.throws(()=>compileUiMask({...f.options,root:f.directory,outputFile:join(f.directory,'build','escape.json')}),/alias|build|artifacts/);
 compileUiMask(f.options);assert.throws(()=>compileUiMask(f.options),/exists/);assert.ok(readFileSync(f.input).equals(f.bytes));
});

test('isolated UI-mask audit copies pinned bytes and changes only its private PNG locator',t=>{
 const f=maskFixture(t);compileUiMask(f.options);
 const prepared=prepareUiMask(f.options.outputFile,{root:f.root,python:f.python,expected:f.options});
 const receipt={v25UiMasks:{assetFile:prepared.inputs[0],inputs:prepared.inputs,templateIndices:{[v25UiMaskTemplate]:10}}};
 const snapshot=join(f.directory,'archive');mkdirSync(snapshot);const original=readFileSync(f.options.outputFile);
 const rebuilt=rebasePrivateUiMask({snapshot,receipt,root:f.root,expected:f.options,python:f.python});
 assert.deepEqual(rebuilt.prepared.template,prepared.template);assert.ok(readFileSync(f.options.outputFile).equals(original));
 assert.ok(rebuilt.prepared.pack.source.path.startsWith(snapshot));assert.notEqual(rebuilt.prepared.pack.source.path,prepared.pack.source.path);
 assert.throws(()=>rebasePrivateUiMask({snapshot,receipt,root:f.root,expected:f.options,python:f.python}),/exists/);
 assert.throws(()=>rebasePrivateUiMask({snapshot:f.root,receipt,root:f.root,expected:f.options,python:f.python}),/isolated/);
 const stale=join(f.directory,'stale');mkdirSync(stale);
 assert.throws(()=>rebasePrivateUiMask({snapshot:stale,receipt:{v25UiMasks:{...receipt.v25UiMasks,assetFile:{...prepared.inputs[0],sha256:'0'.repeat(64)}}},root:f.root,expected:f.options,python:f.python}),/identities/);
 const alias=join(f.directory,'archive-alias');symlinkSync(snapshot,alias,process.platform==='win32'?'junction':'dir');
 assert.throws(()=>rebasePrivateUiMask({snapshot:alias,receipt,root:f.root,expected:f.options,python:f.python}),/isolated/);
});

test('constellation reference uses the complete 512 canvas at the measured 118 display size',()=>{
 const layout=build();applyV25CharacterLayout(layout,theme());
 const prepared={contract:{displaySize:[118,118]},inputs:[{path:'p',sha256:'a',bytes:1}],templates:[{name:v25UiMaskTemplate,kind:'container',size:[512,512],visible:true,children:[]}]};
 const inputs=all(layout).filter(n=>['cursorArea','presetButton'].includes(n.kind));attachV25UiMasks(layout,prepared);
 const host=child(child(child(panel(layout),'v25Roster'),'selected'),'v25Constellation');
 assert.equal(host.visible,true);assert.deepEqual(host.size,[118,118]);
 assert.deepEqual(host.children[0].size,[512,512]);assert.deepEqual(host.children[0].scale,[118/512,118/512]);assert.deepEqual(host.children[0].position,[0,0]);
 assert.equal(host.children[0].template,v25UiMaskTemplate);assert.deepEqual(all(layout).filter(n=>['cursorArea','presetButton'].includes(n.kind)),inputs);
 assertNativeUiCapacity(layout);assert.throws(()=>attachV25UiMasks(layout,prepared),/already/);
 assert.throws(()=>assertV25UiMaskPreparation(prepared,[],prepared.templates),/snapshot/);
 assertV25UiMaskPreparation(prepared,prepared.inputs,prepared.templates);
 assert.throws(()=>assertV25UiMaskPreparation(prepared,prepared.inputs,[]),/template/);
});

test('V25 character layout preserves every original live object, control path and input owner',()=>{
 const layout=build(),before=paths(layout),inputs=all(layout).filter(n=>['cursorArea','presetButton'].includes(n.kind));
 const other=structuredClone(child(child(layout,'stage'),'battlePanel'));
 applyV25CharacterLayout(layout,theme());
 const after=paths(layout);for(const [path,node]of before)assert.equal(after.get(path),node,path);
 assert.deepEqual(all(layout).filter(n=>['cursorArea','presetButton'].includes(n.kind)),inputs);
 assert.deepEqual(child(child(layout,'stage'),'battlePanel'),other);
 assertNativeUiCapacity(layout);
});

test('approved header, live properties and relic hierarchy occupy the measured source rectangles',()=>{
 const layout=build();applyV25CharacterLayout(layout,theme());const p=panel(layout),d=child(p,'details');
 assert.deepEqual(child(p,'title').position,frame(123.625,25.65625,150,29.6875).position);
 assert.deepEqual(child(d,'name').position,frame(75,126,503,66.25).position);
 assert.equal(child(d,'name').text.fontSize,53);
 assert.deepEqual(child(d,'v25Story').position,frame(75,287.25,503,71.28125).position);
 assert.equal(child(d,'v25Story').text.content,theme().v25Character.story);
 assert.equal(child(d,'stats').text.content,'');assert.equal(child(d,'gold').text.content,'');
 assert.equal(child(d,'relic').text.content,'');assert.equal(child(d,'relicText').text.content,'');
 assert(child(d,'v25HealthIcon').image>0);assert(child(d,'v25GoldIcon').image>0);
 assert.deepEqual(child(d,'relic').position,frame(165,430.53125,350,39.140625).position);
 assert.deepEqual(child(d,'officialSelectionFigure').position,[273,-239]);
 assert.deepEqual(child(d,'officialSelectionFigure').scale,[1380/133,1380/133]);
});

test('red back and cyan start use the existing hit and label with four distinct native flag states',()=>{
 const layout=build(),p=panel(layout),identities={};
 for(const name of ['cancel','confirm'])identities[name]=child(child(p,name),'hit');
 applyV25CharacterLayout(layout,theme());
 for(const [name,x] of [['cancel',0],['confirm',1100]]){
  const b=child(p,name),hit=child(b,'hit');assert.equal(hit,identities[name]);
  assert.deepEqual(b.position,frame(x,561,180,60).position);assert.deepEqual(hit.size,[180,60]);
  assert.deepEqual(hit.states,{normal:'normal',hover:'hover',pressed:'pressed',disabled:'disabled'});
  const flags=children(hit).map(state=>child(state,'v25Flag'));
  assert.equal(new Set(flags.map(x=>JSON.stringify(children(x)))).size,4);
  for(const state of children(hit)){
   assert.equal(child(state,'plate').visible,false);assert.equal(child(state,'border').visible,false);
   assert.equal(child(state,'label').text.fontSize,26);
   assert(children(child(state,'v25Flag')).length>=2);
  }
 }
});

test('the four roster cards are read-only presentation and never grant another role',()=>{
 const layout=build();applyV25CharacterLayout(layout,theme());const p=panel(layout),roster=child(p,'v25Roster');
 assert.equal(children(roster).length,4);
 assert.deepEqual(child(roster,'selected').position,frame(399,515,124,124).position);
 for(let i=1;i<=3;i++){
  const card=child(roster,'locked'+i);assert.deepEqual(card.size,[101,101]);
  assert(child(card,'lock'));assert.equal(all(card).filter(x=>['cursorArea','presetButton'].includes(x.kind)).length,0);
 }
 assert.equal(child(child(roster,'selected'),'v25Constellation').visible,false);
 assert(child(p,'traveler'));assert(child(p,'character4'));assert(child(p,'elements'));
 assert.equal(children(p).at(-1),child(p,'deckView'),'new roster covers the original deck modal');
});

test('missing approved story and image bindings stay explicitly empty and repeated application is idempotent',()=>{
 const missing={...nativeTheme,v25Character:{}},layout=build();applyV25CharacterLayout(layout,missing);const p=panel(layout);
 assert.equal(child(child(p,'details'),'v25Story').text.content,'');
 const background=child(p,'v25Background');assert.equal(background.visible,false);assert.deepEqual(children(background),[]);
 assert.equal(background.image,undefined);assert.equal(child(child(p,'details'),'v25RelicIcon').visible,false);
 const before=structuredClone(layout);applyV25CharacterLayout(layout,missing);assert.deepEqual(layout,before);
 assert.equal(v25CharacterReference.cssSha256,'9a6d137a3297559f638e5323db424506ae394c7942cdf334551936ac0d74d17d');
 assert(v25CharacterReference.unverified.includes('full-resolution-portrait'));
});
