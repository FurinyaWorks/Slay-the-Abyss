import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {withViewport} from '../scripts/viewport-layout.mjs';
import {v25Theme,applyV25BattleLayout,rebuildV25CardFaces} from '../scripts/v25-layout.mjs';
import {applyV25MenuLayout} from '../scripts/v25-menu-layout.mjs';
test('V25 tokens preserve the source theme while freezing original battle coordinates',()=>{
 const before=structuredClone(nativeTheme),t=v25Theme(nativeTheme);
 assert.deepEqual(nativeTheme,before);
 assert.deepEqual(t.layout.player.position,[-324,-37]);
 assert.equal(t.layout.player.portrait,210);
 assert.deepEqual(t.layout.endTurn.size,[143,56]);
 assert.deepEqual(t.layout.card.size,[150,210]);
 assert.equal(t.layout.enemyRow.floorY,330);
});

test('V25 menu keeps the real start transaction and presents unavailable entries without fake actions',()=>{
 const layout=withViewport(gameLayout(),nativeTheme),stage=layout.controls.find(n=>n.name==='stage');
 const menu=stage.children.find(n=>n.name==='menuPanel'),start=menu.children.find(n=>n.name==='start'),hit=start.children.find(n=>n.name==='hit');
 applyV25MenuLayout(layout,v25Theme(nativeTheme));
 assert.equal(start.children.find(n=>n.name==='hit'),hit);assert.equal(hit.kind,'cursorArea');
 const chrome=menu.children.find(n=>n.name==='v25MainMenu');
 const walk=n=>[n,...(n.children??[]).flatMap(walk)];
 assert.ok(!walk(chrome).some(n=>['cursorArea','presetButton'].includes(n.kind)));
 assert.equal(menu.children.find(n=>n.name==='titleQuit').children.find(n=>n.name==='hit').kind,'cursorArea');
 assert.equal(start.children.find(n=>n.name==='v25MenuFace').children.length,4);
});
test('shared V25 faces retain node-specific Match and Keep backs and input identity',()=>{
 const layout=gameLayout(),t=v25Theme(nativeTheme);
 const at=path=>path.reduce((node,name)=>(node.controls??node.children).find(n=>n.name===name),layout);
 const card=at(['nodePanel','pickerView','forgeGrid','card1']);
 const back=card.children.find(n=>n.name==='matchBack'),hit=card.children.find(n=>n.name==='hit');
 assert(back);assert(hit);
 rebuildV25CardFaces(layout,t);
 assert.equal(card.children.find(n=>n.name==='matchBack'),back);
 assert.equal(card.children.find(n=>n.name==='hit'),hit);
});
test('battle reflow shares tokens with runtime and retains ten live faces and hits',()=>{
 const layout=withViewport(gameLayout(),nativeTheme),t=v25Theme(nativeTheme);
 const stage=layout.controls.find(n=>n.name==='stage'),battle=stage.children.find(n=>n.name==='battlePanel');
 const hero=battle.children.find(n=>n.name==='hero'),hit=hero.children.find(n=>n.name==='hit');
 const menu=structuredClone(stage.children.find(n=>n.name==='menuPanel'));
 applyV25BattleLayout(layout,t);
 assert.equal(hero.children.find(n=>n.name==='hit'),hit);
 assert.deepEqual(hero.position,t.layout.player.position);
 assert.deepEqual(battle.children.find(n=>n.name==='endTurn').position,t.layout.endTurn.position);
 for(let i=1;i<=10;i++){
  const card=battle.children.find(n=>n.name==='card'+i);
  assert.deepEqual(card.size,[150,210]);
  for(const name of ['hit','name','cost','label'])assert(card.children.find(n=>n.name===name));
 }
 assert.deepEqual(stage.children.find(n=>n.name==='menuPanel'),menu);
});
