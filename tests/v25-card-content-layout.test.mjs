import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {battleLayout} from '../scripts/ui-layout.mjs';
import {cardFaceChildren} from '../scripts/card-face.mjs';
import {v25Theme,applyV25BattleLayout,rebuildV25CardFaces} from '../scripts/v25-layout.mjs';
import {buildUI} from '../scripts/build-ui.mjs';
import {buildLuaData,toLua} from '../scripts/build-lua-data.mjs';
import {mkdirSync,mkdtempSync,readdirSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const child=(node,name)=>(node.children??node.controls??[]).find(n=>n.name===name);
test('evidenced V25 cost and top HUD boxes fit one line without changing width, centre or typography',()=>{
 const theme=v25Theme(nativeTheme),layout=battleLayout(),root=child(layout,'stage');
 const oldHeaders=Object.fromEntries(['title','player','piles'].map(name=>[name,structuredClone(child(root,name))]));
 applyV25BattleLayout(layout,theme);
 for(const name of ['title','player','piles']){
  const value=child(root,name),before=oldHeaders[name];
  assert.equal(value.size[1],56,name+' retained a zero-line 28px/44px box');
  assert.equal(value.size[0],before.size[0]);assert.deepEqual(value.position,before.position);assert.deepEqual(value.text,before.text);
 }
 for(const context of ['battle','deck','node']){
  const face={name:context,children:cardFaceChildren(theme,context)};const before=structuredClone(child(face,'cost'));
  rebuildV25CardFaces(face,theme);const cost=child(face,'cost');
  assert.deepEqual(cost.size,[before.size[0],50]);assert.deepEqual(cost.position,before.position);assert.deepEqual(cost.text,before.text);
 }
});
test('V25 text-box accommodation does not mutate the default Enhanced theme or card geometry',()=>{
 const theme=structuredClone(nativeTheme),legacy=battleLayout(),legacyFace=cardFaceChildren(nativeTheme,'battle');
 applyV25BattleLayout(battleLayout(),v25Theme(nativeTheme));
 assert.deepEqual(nativeTheme,theme);assert.deepEqual(battleLayout(),legacy);assert.deepEqual(cardFaceChildren(nativeTheme,'battle'),legacyFace);
});
test('actual Lua Host refresh and ten legal card costs retain the generated V25 textbox heights',t=>{
 const base=resolve('.artifacts/test-tmp');mkdirSync(base,{recursive:true});const directory=mkdtempSync(join(base,'v25-content-lines-'));
 t.after(()=>rmSync(directory,{recursive:true,force:true}));buildLuaData('data',join(directory,'abyss_data.lua'));buildUI(directory,undefined,{v25BattleChrome:true});
 const names=readdirSync(directory).filter(n=>n.endsWith('.lua')).map(n=>n.slice(0,-4));
 const source=`local generated=${toLua(directory.replaceAll('\\','/'))}
package.path=generated..'/?.lua;src/lua/?.lua'
for _,name in ipairs(${toLua(names)})do package.preload[name]=assert(loadfile(generated..'/'..name..'.lua'))end
local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
assert(H.F.Theme.font.cost==25 and H.F.Theme.font.hud==28)
local deck={};for i=1,20 do deck[i]='strike'end
local host,ui,panel=H.setup(deck,{'cultist','cultist'})
H.F.Combat.draw(host.run.combat,20);assert(#host.run.combat.hand==10)
for refresh=1,3 do
 host:refresh()
 for i=1,10 do local c=panel:GetChild('card'..i):GetChild('cost');assert(c.sizeDeltaY==50 and c.text~='','runtime overwrote cost line fit')end
 for _,name in ipairs({'title','player','piles'})do local c=panel:GetChild(name);assert(c.sizeDeltaY==56 and c.text~='','runtime overwrote HUD line fit')end
end
print('V25_COST_HEADER_RUNTIME_LINE_FIT_PASS')`;
 const require=createRequire(import.meta.url),result=spawnSync(process.execPath,[require.resolve('fengari-node-cli/src/lua-cli.js'),'-e',source],{encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
 assert.equal(result.status,0,result.stdout+result.stderr+String(result.error??''));assert.match(result.stdout,/V25_COST_HEADER_RUNTIME_LINE_FIT_PASS/);
});
