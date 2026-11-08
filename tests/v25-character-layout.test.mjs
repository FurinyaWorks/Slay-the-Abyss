import test from 'node:test';
import assert from 'node:assert/strict';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {withViewport} from '../scripts/viewport-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {attachOfficialPortraits} from '../scripts/official-portraits.mjs';
import {assertNativeUiCapacity} from '../scripts/build-ui.mjs';
import {applyV25CharacterLayout,v25CharacterReference} from '../scripts/v25-character-layout.mjs';

const children=node=>node?.controls??node?.children??[];
const child=(node,name)=>children(node).find(item=>item.name===name);
const panel=layout=>child(child(layout,'stage')??layout,'characterPanel');
const all=node=>[node,...children(node).flatMap(all)];
const paths=(node,prefix='',result=new Map())=>{result.set(prefix,node);for(const c of children(node))paths(c,prefix+'/'+c.name,result);return result;};
const frame=(x,y,w,h)=>({position:[x+w/2-640,360-y-h/2],size:[w,h]});
function build(){const l=withViewport(gameLayout(),nativeTheme);attachOfficialPortraits(l,{selectionAvatar:true,battlePortrait:true});return l;}
const theme=()=>({...nativeTheme,v25Character:{story:'批准剧情由主题注入。\n第二行仍由内容源提供。'}});

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
