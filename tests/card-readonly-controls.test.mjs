import test from 'node:test';
import assert from 'node:assert/strict';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {cardFaceChildren} from '../scripts/card-face.mjs';
import {deckCardTemplate} from '../scripts/deck-ui-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {buildUI} from '../scripts/build-ui.mjs';
import {runLua} from '../scripts/test-lua.mjs';

const blocked=['blockedVeil','blockedPill','blockedLock','blockedReason'];
const size=c=>1+(c.children??[]).reduce((n,item)=>n+size(item),0);
const faces=controls=>{
  const found=[];
  function visit(c,path){
    path=path+'/'+c.name;
    if(c.children?.some(x=>x.name==='costDisc')&&c.children.some(x=>x.name==='nameBand'))found.push({path,control:c});
    for(const child of c.children??[])visit(child,path);
  }
  controls.forEach(c=>visit(c,''));return found;
};

test('only the 22 readonly static card faces omit the 18-control blocked layer',()=>{
  const all=faces(gameLayout().controls),readonly=all.filter(({control})=>!control.children.some(x=>x.name==='glow'));
  const expected=[...Array.from({length:12},(_,i)=>`/characterPanel/deckView/deckCard${i+1}/face`),
    ...Array.from({length:10},(_,i)=>`/choicePanel/card${i+1}/face`)];
  assert.deepEqual(readonly.map(x=>x.path),expected);
  for(const {path,control} of all)for(const name of blocked){
    assert.equal(control.children.some(x=>x.name===name),!expected.includes(path),path+'/'+name);
  }
  const full=cardFaceChildren(nativeTheme,'battle').filter(x=>blocked.includes(x.name));
  assert.equal(full.reduce((n,c)=>n+size(c),0),18);
  assert.equal(readonly.length*18,396);
  const template=deckCardTemplate(),face=template.children.find(x=>x.name==='face');
  assert.equal(blocked.some(name=>face.children.some(x=>x.name===name)),false);
  assert.equal(size(template),126,'the dynamic Grid template also saves 18 of its former 144 controls');
});

test('real readonly skin contract supports omitted layers, legacy templates and default blocked feedback',()=>{
  buildUI();
  const result=runLua('tests/lua/card_readonly_controls.lua');
  assert.equal(result.status,0,result.stdout+result.stderr);
  assert.match(result.stdout,/CARD_READONLY_CONTROLS_PASS/);
});
