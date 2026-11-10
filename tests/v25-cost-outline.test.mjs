import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {v25Theme} from '../scripts/v25-layout.mjs';
import {cardFaceChildren} from '../scripts/card-face.mjs';

test('approved original cost numerals retain their dark stroke above the bright mana texture',()=>{
 const theme=v25Theme(nativeTheme);
 for(const context of ['battle','deck','node']){
  const cost=cardFaceChildren(theme,context).find(n=>n.name==='cost');
  assert.equal(cost.text.outline,true,context+' cost has no contrast stroke');
  // Frozen project-card-theme.css final rule: 1px rgb(30% 30% 30%).
  assert.equal(cost.text.outlineColour,'#4D4D4D');
  assert.equal(cost.text.outlineOpacity,1);
 }
});

test('the outline correction does not change the legacy card face',()=>{
 const cost=cardFaceChildren(nativeTheme,'battle').find(n=>n.name==='cost');
 assert.equal(cost.text.outline,undefined);
 assert.deepEqual(cost.position,nativeTheme.layout.card.costPosition??[-nativeTheme.layout.card.size[0]/2+nativeTheme.layout.card.costDisc/2-nativeTheme.layout.card.trim.costOverhang,nativeTheme.layout.card.size[1]/2-nativeTheme.layout.card.costDisc/2+nativeTheme.layout.card.trim.costOverhang]);
});
