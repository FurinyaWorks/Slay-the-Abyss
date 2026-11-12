import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,readdirSync,writeFileSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {buildUI} from '../scripts/build-ui.mjs';
import {buildLuaData,luaString,toLua} from '../scripts/build-lua-data.mjs';
import {runLua} from '../scripts/test-lua.mjs';

test('official relic material is shared across run phases while the legacy profile and owned detail identity remain exact',t=>{
 const theme=JSON.parse(readFileSync('data/presentation/ui_theme.json','utf8'));
 const relics=JSON.parse(readFileSync('data/relics.json','utf8')).relics;
 const icons=theme.officialAssets.battleRelicIcons;
 assert.deepEqual(['burning_blood','kunai','ink_bottle'].map(id=>icons[id].id),[105045,105217,105243]);
 for(const relic of relics.filter(r=>r.rarity==='common'))assert.ok(icons[relic.id],relic.id+' common mapping');
 const admitted=new Set([102001,102034,105023,105043,105045,105046,105048,105055,105058,105065,105067,105068,105070,105071,105073,105076,105077,105078,105090,105099,105114,105127,105131,105182,105186,105191,105194,105196,105197,105204,105207,105214,105215,105216,105217,105242,105243,105246,105301]);
 for(const [id,icon]of Object.entries(icons)){
  assert.ok(relics.some(r=>r.id===id),id+' actual relic');
  assert.ok(admitted.has(icon.id),id+' inspected official asset');
  assert.equal(icon.placeholder,true,id+' honest substitute label');
  assert.match(icon.note,/代用/,id+' substitute reason');
 }
 assert.ok(new Set(Object.values(icons).map(v=>v.id)).size>=30,'common relics must remain visually varied');
 const base=resolve('.artifacts/test-tmp');mkdirSync(base,{recursive:true});
 for(const official of [false,true]){
  const dir=mkdtempSync(join(base,'relic-icons-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  buildLuaData('data',join(dir,'abyss_data.lua'));buildUI(dir,undefined,{officialAssets:official});
  const modules=readdirSync(dir).filter(n=>n.endsWith('.lua')).map(n=>n.slice(0,-4));
  const script=join(dir,'verify.lua');
  writeFileSync(script,`local generated=${luaString(dir.replaceAll('\\','/'))}
package.path=generated..'/?.lua;src/lua/?.lua'
for _,name in ipairs(${toLua(modules)})do package.preload[name]=assert(loadfile(generated..'/'..name..'.lua'))end
local Theme=require('abyss_theme');local V=require('abyss_relic_view_ui')
local official=${official}
local function baseIcon(id)local v=Theme.icon.relic[id];return type(v)=='table' and v.id or v end
for _,id in ipairs({'burning_blood','kunai','ink_bottle'})do
 assert(V.icon(id)==baseIcon(id) and V.icon(id,false)==baseIcon(id),'nonbattle override leaked')
 assert(V.icon(id,true)==(official and Theme.officialAssets.battleRelicIcons[id].id or baseIcon(id)),'profile guard')
end
local F=dofile('tests/lua/support/game_ui_fixture.lua');local h,r=F.fixture();assert(F.start(h))
h.run.relics={'burning_blood','kunai','ink_bottle'};h:refresh()
local bar=r:GetChild('relicBar');local panel=r:GetChild('relicPanel')
local function runIcon(id)return official and Theme.officialAssets.battleRelicIcons[id].id or baseIcon(id)end
for i,id in ipairs(h.run.relics)do assert(bar:GetChild('slot'..i):GetChild('icon').imageId==runIcon(id),'shared run map icon')end
assert(require('abyss_run').startCombat(h.run,'cultist_solo'));h:refresh()
for i,id in ipairs(h.run.relics)do assert(bar:GetChild('slot'..i):GetChild('icon').imageId==V.icon(id,true),'battle HUD icon')end
local hp,energy,turn=h.run.hp,h.run.combat.energy,h.run.combat.turn
assert(h:openRelics(2));assert(h.relicUI.selected.id=='kunai')
assert(panel:GetChild('single'):GetChild('icon').imageId==V.icon('kunai',true))
assert(h.relicUI:turn(1));assert(h.relicUI.selected.id=='ink_bottle')
assert(panel:GetChild('single'):GetChild('icon').imageId==V.icon('ink_bottle',true))
assert(h.relicUI:turn(-1));assert(h.relicUI.selected.id=='kunai');assert(h:closeDeck())
assert(h.run.hp==hp and h.run.combat.energy==energy and h.run.combat.turn==turn,'read-only detail')
h.run.phase='map';h:refresh()
for i,id in ipairs(h.run.relics)do assert(bar:GetChild('slot'..i):GetChild('icon').imageId==runIcon(id),'same atlas on return to map')end
assert(h:openRelics(1))
if official then
 assert(h.relicUI.selectedIndex==1 and h.relicUI.selected.id=='burning_blood','shared single entry from map')
 assert(panel:GetChild('single'):GetChild('icon').imageId==runIcon('burning_blood'),'same single atlas outside combat')
else
 assert(not h.relicUI.selectedIndex)
 assert(panel:GetChild('row1'):GetChild('slot'):GetChild('icon').imageId==baseIcon('burning_blood'),'legacy list restore')
end
print('BATTLE_RELIC_ICONS_SCOPE_PASS')`);
  const result=runLua(script);assert.equal(result.status,0,result.stdout+result.stderr);assert.match(result.stdout,/BATTLE_RELIC_ICONS_SCOPE_PASS/);
 }
});
