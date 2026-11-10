import test from 'node:test';
import assert from 'node:assert/strict';
import {battleLayout} from '../scripts/ui-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {assertNativeUiCapacity} from '../scripts/build-ui.mjs';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {withViewport} from '../scripts/viewport-layout.mjs';
import {applyV25BattleChrome} from '../scripts/v25-battle-chrome.mjs';

const children=node=>node.controls??node.children??[];
const find=(node,name)=>children(node).find(child=>child.name===name);
const stage=layout=>find(layout,'stage');
const all=node=>[node,...children(node).flatMap(all)];

test('V25 chrome retains live energy, pile counts, labels, hit areas and all ten cards',()=>{
 const layout=battleLayout(),root=stage(layout);
 const preserved=['energy','draw','discard','drawLabel','discardLabel',...Array.from({length:10},(_,i)=>`card${i+1}`)]
  .map(name=>[name,find(root,name),structuredClone(find(root,name))]);
 const hits=['drawIcon','discardIcon'].map(name=>[name,find(find(root,name),'hit'),structuredClone(find(find(root,name),'hit'))]);
 const turn=find(root,'endTurn'),turnBox={position:[...turn.position],size:[...turn.size]};
 const labels=turn.children.map(state=>[state.name,find(state,'label')]);
 applyV25BattleChrome(layout,nativeTheme);
 for(const[name,identity,before]of preserved){assert.equal(find(root,name),identity,name);assert.deepEqual(identity,before,name);}
 for(const[name,identity,before]of hits){assert.equal(find(find(root,name),'hit'),identity,name);assert.deepEqual(identity,before,name);}
 assert.equal(find(root,'endTurn'),turn);assert.deepEqual(turn.position,turnBox.position);assert.deepEqual(turn.size,turnBox.size);
 for(const[name,label]of labels)assert.equal(find(find(turn,name),'label'),label);
 assertNativeUiCapacity(layout);
});

test('all four real preset states have distinct layered hexagonal chrome',()=>{
 const layout=battleLayout();applyV25BattleChrome(layout,nativeTheme);
 const turn=find(stage(layout),'endTurn');
 assert.deepEqual(turn.states,{normal:'normal',hover:'hover',pressed:'pressed',disabled:'disabled'});
 const states=turn.children.map(state=>find(state,'v25Chrome'));
 assert.equal(new Set(states.map(state=>JSON.stringify(state.children))).size,4);
 for(const state of states){assert(state.children.some(c=>c.rotation===90));assert(state.children.some(c=>c.rotation===-90));}
 // Existing Lua still tints these slots; they remain valid but cannot flatten the new state chrome.
 for(const state of turn.children)for(const name of ['plate','plateLeft','plateRight'])assert.equal(find(state,name).visible,false);
});

test('native decoration has bounded layers, soft light and no added input targets',()=>{
 const layout=battleLayout(),before=all(layout),inputCount=before.filter(c=>c.kind==='cursorArea'||c.kind==='presetButton').length;
 applyV25BattleChrome(layout,nativeTheme);
 const after=all(layout),added=after.filter(node=>!before.includes(node));
 assert(added.length>0&&added.length<150,`added ${added.length} nodes`);
 assert.equal(after.filter(c=>c.kind==='cursorArea'||c.kind==='presetButton').length,inputCount);
 assert(added.some(c=>c.feather));
 for(const node of added)if(node.kind==='image')assert(Number.isInteger(node.image)&&node.size.every(n=>n>0));
 const draw=find(stage(layout),'drawIcon'),discard=find(stage(layout),'discardIcon');
 assert.equal(find(draw,'front').rotation,-16);assert.equal(find(discard,'front').rotation,13);
 assert(find(find(draw,'front'),'v25Card').children.length>1);
});

test('repeated application and incomplete layouts fail before mutation',()=>{
 const layout=battleLayout();applyV25BattleChrome(layout,nativeTheme);
 const before=structuredClone(layout);assert.throws(()=>applyV25BattleChrome(layout,nativeTheme),/already/);assert.deepEqual(layout,before);
 const incomplete=battleLayout();find(stage(incomplete),'energyIcon').children=[];
 const original=structuredClone(incomplete);assert.throws(()=>applyV25BattleChrome(incomplete,nativeTheme),/valueShadow|face|light|core/);assert.deepEqual(incomplete,original);
});

test('full game layout addresses only battlePanel and leaves other screens untouched',()=>{
 const battle=battleLayout(),root=stage(battle),menu={name:'menuPanel',kind:'container',children:[]};
 const layout={name:'game',controls:[{name:'battlePanel',kind:'container',children:root.children},menu]};
 applyV25BattleChrome(layout,nativeTheme);assert.deepEqual(menu,{name:'menuPanel',kind:'container',children:[]});
 assert(find(find(layout,'battlePanel'),'endTurn').children.every(state=>find(state,'v25Chrome')));
});

test('viewport-wrapped production game layout resolves stage/battlePanel',()=>{
 const layout=withViewport(gameLayout(),nativeTheme),outer=find(layout,'stage');
 const battle=find(outer,'battlePanel'),menu=find(outer,'menuPanel'),beforeMenu=structuredClone(menu);
 const endTurn=find(battle,'endTurn'),drawHit=find(find(battle,'drawIcon'),'hit');
 applyV25BattleChrome(layout,nativeTheme);
 assert.equal(find(battle,'endTurn'),endTurn);assert(find(find(endTurn,'normal'),'v25Chrome'));
 assert.equal(find(find(battle,'drawIcon'),'hit'),drawHit);assert.deepEqual(menu,beforeMenu);
 assertNativeUiCapacity(layout);
});
