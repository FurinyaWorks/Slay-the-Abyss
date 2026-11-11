// Offline SDK replay fixture only. Uses the current Run acquisition/upgrade APIs
// and Combat.draw; never modifies definitions, combat rules, energy or HP.
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

export const coverageGroups = Object.freeze({
  matrix: ['strike','defend','anger','true_grit','carnage','entrench','inflame','bludgeon','impervious','corruption'],
  mechanics: ['anger+','whirlwind','blood_for_blood','offering+','barricade+','fiend_fire','armaments+','regret','warcry+','perfected_strike'],
  status: ['strike','defend','bash','warcry','impervious','necronomicurse','wound','dazed','burn','slimed'],
});
const sha = value => createHash('sha256').update(value).digest('hex');

export function coveragePlan(cardsDocument, redContract, group) {
  const entries = coverageGroups[group];
  if (!entries) throw Error('Coverage group must be matrix, mechanics or status');
  const red = new Set([...redContract.matchAll(/^ (\w+)='[a-f0-9]+'/gm)].map(match => match[1]));
  if (red.size !== 75) throw Error('RED75 source contract differs');
  const cards = new Map(cardsDocument.cards.map(card => [card.id, card]));
  const cells = {};
  for (const id of red) {
    const card = cards.get(id);
    if (!card) throw Error(`Missing RED75 definition: ${id}`);
    const key = `${card.rarity}/${card.type}`;
    (cells[key] ??= []).push(id);
  }
  const expected = entries.map(entry => {
    const upgraded = entry.endsWith('+'), id = upgraded ? entry.slice(0,-1) : entry;
    const card = cards.get(id);
    const generated=group==='status'&&['wound','dazed','burn','slimed'].includes(id);
    const curse=(id==='regret'&&card?.rarity==='curse'||group==='status'&&id==='necronomicurse'&&card?.rarity==='special')&&card?.type==='curse'&&card.cost===-2;
    if (!card || (!red.has(id) && !curse && !(generated&&card.type==='status'&&card.rarity==='common'))) throw Error(`Not an approved coverage card: ${id}`);
    if (upgraded && !card.upgrade) throw Error(`Card cannot upgrade: ${id}`);
    return {id, upgraded, type:card.type, rarity:card.rarity,
      cost:card.costMode === 'all_energy' ? 'X' : upgraded ? card.upgrade.cost ?? card.cost : card.cost,
      exhaust:card.exhaust === true, textLength:[...card.text].length,
      acquisition:red.has(id) ? card.rarity === 'basic' ? 'starter' : 'red-pool' : generated?'combat-generated':'curse-acquisition'};
  });
  return {group, expected, legalCells:Object.keys(cells).sort(),
    absentCells:['basic/power','common/power'],
    coveredCells:[...new Set(expected.filter(card => red.has(card.id)).map(card => `${card.rarity}/${card.type}`))].sort()};
}

export function coverageLua(plan) {
  const items = plan.expected.map(card => `{id='${card.id}',upgraded=${card.upgraded},type='${card.type}',rarity='${card.rarity}',generated=${card.acquisition==='combat-generated'}}`).join(',');
  return `
-- OFFLINE CARD COVERAGE ${plan.group}: real acquisitions, no synthetic cards.
local createCoverageHost=M.new
function M.new(root,data,presentation,event,platform)
 local previewPlatform={}
 for key,value in pairs(platform)do previewPlatform[key]=value end
 previewPlatform.campaign=false
 local host=createCoverageHost(root,data,presentation,event,previewPlatform)
 host.seed=42
 assert(host:start());assert(host:selectCharacter('traveler'))
 assert(host:selectElement('ironclad'));assert(host:confirmCharacter())
 local R=require('abyss_run');local C=require('abyss_combat')
 local expected={${items}}
 while #host.run.deck>0 do assert(R.removeCard(host.run,host.run.deck[1].uid))end
 for _,item in ipairs(expected)do
  if not item.generated then
   local ok,uid=R.obtainCard(host.run,item.id);assert(ok,uid)
   if item.upgraded then assert(R.upgradeCard(host.run,uid))end
  end
 end
 assert(#host.run.deck==${plan.expected.filter(card=>card.acquisition!=='combat-generated').length},'Coverage master deck acquisition count differs')
 assert(R.startCombat(host.run,'small_slimes'))
 local b=host.run.combat
 local positions={{x=-230,y=32},{x=35,y=8}}
 for i,actor in ipairs(b.enemies)do actor.sourcePosition=positions[i]end
 -- Status definitions are generated through the existing combat effect API,
 -- never installed as reward cards or fabricated master-deck instances.
 for _,item in ipairs(expected)do if item.generated then
  C.applyEffects(b,{{op='makeTempCardInDraw',card=item.id,value=1}},b.player,nil,nil)
 end end
 C.draw(b,20)
 assert(#b.hand==10,'Real draw must fill the ten-card hand cap')
 local remaining={}
 for _,item in ipairs(expected)do
  local key=item.id..':'..tostring(item.upgraded);remaining[key]=(remaining[key]or 0)+1
  local def=assert(b.catalog.cards[item.id]);assert(def.type==item.type and def.rarity==item.rarity,'Coverage source identity differs')
 end
 for i,card in ipairs(b.hand)do
  local key=card.cardId..':'..tostring(card.upgraded==true)
  assert((remaining[key]or 0)>0,'Unexpected coverage hand entry '..key);remaining[key]=remaining[key]-1
  local def=b.catalog.cards[card.cardId]
  print('CARD_COVERAGE_SLOT '..i..' uid='..card.uid..' id='..card.cardId..' upgraded='..tostring(card.upgraded==true)..' rarity='..def.rarity..' type='..def.type..' cost='..C.combatBaseCost(b,card))
 end
 for _,count in pairs(remaining)do assert(count==0,'Coverage card missing from real hand')end
 host:refresh()
 print('CARD_COVERAGE_READY group=${plan.group} hand='..#b.hand..' energy='..b.energy)
 return host
end
return M
`;
}

export function buildCoverageFixture(inputBytes, cardsBytes, contractBytes, group) {
  const plan = coveragePlan(JSON.parse(cardsBytes.toString()),contractBytes.toString(),group);
  const save = JSON.parse(inputBytes.toString());
  const mod = save.assets?.scripts?.find(script => /abyss_game_ui\.lua$/.test(script.path));
  if (!mod || !/(?:^|\n)return M\r?\n$/.test(mod.source)) throw Error('GameUI source anchor differs');
  if (mod.source.includes('OFFLINE CARD COVERAGE') || mod.source.includes('OFFLINE FIXTURE:')) throw Error('Input must be an unmodified actual-GIL preview');
  const originalModuleSha256 = sha(mod.source);
  mod.source = mod.source.replace(/return M\r?\n$/,'') + coverageLua(plan);
  save.meta ??= {};
  save.meta.name = `Card coverage ${group} / ten real cards / offline SDK fixture`;
  const receipt = {kind:'offline-sdk-card-coverage-fixture', inputSha256:sha(inputBytes),
    cardsSha256:sha(cardsBytes),redContractSha256:sha(contractBytes),modifiedModule:mod.path,
    originalModuleSha256,fixtureModuleSha256:sha(mod.source),seed:42,
    ...plan,gameRulesChanged:false,officialImport:false,visualAccepted:false,
    slotOrder:'Read CARD_COVERAGE_SLOT runtime logs; real shuffle order is not fabricated.',
    limitations:['Offline acquisition fixture, not a naturally reached campaign deck.',
      'Curse acquisition is separate from red reward rarity/type cells.',
      'No SDK performance, official import, or visual acceptance is implied.']};
  return {save,receipt};
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [input,output,group,...extra] = process.argv.slice(2);
  if (!input || !output || !group || extra.length) throw Error('Usage: node scripts/battle-card-coverage-scenario.mjs <actual.save.json> <new.save.json> <matrix|mechanics|status>');
  const {save,receipt} = buildCoverageFixture(readFileSync(input),readFileSync(new URL('../data/cards.json',import.meta.url)),readFileSync(new URL('../src/lua/abyss_run_red_card_contract.lua',import.meta.url)),group);
  receipt.input = resolve(input);
  const adapterPath=join(dirname(receipt.input),'adapter-receipt.json');
  if(existsSync(adapterPath)){
    const bytes=readFileSync(adapterPath),adapter=JSON.parse(bytes);
    if(adapter.saveSha256!==receipt.inputSha256)throw Error('Adapter receipt does not identify the input save');
    receipt.sourceCandidate={buildId:adapter.buildId,candidateSha256:adapter.candidateSha256,
      sourceCommit:adapter.sourceCommit,sourceDirty:adapter.sourceDirty,adapterReceiptSha256:sha(bytes)};
  }
  writeFileSync(resolve(output),JSON.stringify(save),{flag:'wx'});
  writeFileSync(resolve(output)+'.receipt.json',JSON.stringify(receipt,null,2),{flag:'wx'});
  console.log(resolve(output));
}
