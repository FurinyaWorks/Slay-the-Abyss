// A labelled SDK fixture, derived from an actual-GIL preview. Core code, card
// definitions, HP and energy are unchanged. Replay seed is explicit below.
// Never used to build a GIL.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const [input,output]=process.argv.slice(2);
const ten=process.argv[4]==='--ten';
if(process.argv.length>5||process.argv[4]&&!ten)throw Error('Optional argument: --ten');
if(!input||!output)throw Error('Usage: node scripts/battle-preview-scenario.mjs <actual.save.json> <new.save.json>');
const save=JSON.parse(readFileSync(input,'utf8'));
const mod=save.assets.scripts.find(s=>/abyss_game_ui\.lua$/.test(s.path));
if(!mod||!/(?:^|\n)return M\r?\n$/.test(mod.source))throw Error('GameUI source anchor differs');
const original=createHash('sha256').update(mod.source).digest('hex');
mod.source=mod.source.replace(/return M\r?\n$/,'')+`
-- OFFLINE FIXTURE: real starter deck, ${ten?'legal ten-card cap':'normal five-card opening'}, two enemies.
local createPreviewHost=M.new
function M.new(root,data,presentation,event,platform)
 local previewPlatform={}
 for key,value in pairs(platform)do previewPlatform[key]=value end
 -- Bypass only the campaign opening through the existing full-source Host
 -- option. Combat definitions and all input/feedback controllers are unchanged.
 previewPlatform.campaign=false
 local host=createPreviewHost(root,data,presentation,event,previewPlatform)
 host.seed=42
 assert(host:start())
 assert(host:selectCharacter('traveler'))
 assert(host:selectElement('ironclad'))
 assert(host:confirmCharacter())
 assert(require('abyss_run').startCombat(host.run,'small_slimes'))
 -- The explicit replay entry omits map-room formation. Restore only the
 -- presentation offsets from the existing Small Slimes source formation.
 local positions={{x=-230,y=32},{x=35,y=8}}
 for index,actor in ipairs(host.run.combat.enemies)do actor.sourcePosition=positions[index] end
 ${ten?"require('abyss_combat').draw(host.run.combat,20)":"-- Standard opening draw remains five cards."}
 host:refresh()
 print('BATTLE_PREVIEW_FIXTURE ready hand='..#host.run.combat.hand..' enemies='..#host.run.combat.enemies)
 return host
end
return M
`;
save.meta.name=ten?'战斗整页试玩 · 真实十牌双敌压力场景（非官方客户端）':'战斗整页试玩 · 标准五牌双敌（非官方客户端）';
writeFileSync(resolve(output),JSON.stringify(save),{flag:'wx'});
writeFileSync(resolve(output)+'.receipt.json',JSON.stringify({kind:'offline-sdk-pressure-fixture',input:resolve(input),inputSha256:createHash('sha256').update(readFileSync(input)).digest('hex'),modifiedModule:mod.path,originalModuleSha256:original,fixtureModuleSha256:createHash('sha256').update(mod.source).digest('hex'),gameRulesChanged:false,officialImport:false},null,2));
console.log(resolve(output));
