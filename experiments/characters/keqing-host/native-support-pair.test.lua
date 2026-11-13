package.path='experiments/characters/keqing-host/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,R,D,eq,same=H.C,H.Run,H.Data,H.eq,H.same
local F=require('native-support-pair');local Starter=require('abyss_keqing_starter_run')
local defs=F.definitions();eq(#defs.cards,2);local untouched=C.copy(D)
local expected={KQ039={{{op='block',value=4},{op='nextBlock',value=4}},{{op='block',value=6},{op='nextBlock',value=6}}},KQ049={{{op='escapePlan',value=4}},{{op='escapePlan',value=7}}}}
for _,def in ipairs(defs.cards)do
 eq(def.type,'skill');eq(def.cost,1);eq(def.target,'SELF');eq(def.color,'keqing_candidate');eq(def.sourceId,def.id);eq(def.rarity,'special');eq(def.keqingCandidate,true);eq(def.productionEnabled,false);eq(def.reviewStatus,'HOLD');eq(def.exhaust,nil)
 same(def.effects,expected[def.id][1]);same(def.upgrade.effects,expected[def.id][2]);eq(def.upgrade.cost,1)
 for _,up in ipairs({false,true})do
  local d=C.copy(D);for _,card in ipairs(F.definitions().cards)do d.cards.cards[#d.cards.cards+1]=card end
  local run=Starter.new(d,'42');assert(R.obtainCard(run,def.id,{upgraded=up}));assert(R.startCombat(run,'cultist_solo'))
  -- Controlled placement ONLY to prove the current admission gate, not acquisition odds.
  local card;for _,zone in ipairs({'draw','hand','discard'})do for i=#run.combat[zone],1,-1 do local c=run.combat[zone][i];if c.cardId==def.id then card=table.remove(run.combat[zone],i)end end end;assert(card);run.combat.hand[#run.combat.hand+1]=card
  eq(run.combat.experimentalMechanics,true) -- Existing explicit Keqing lifecycle init, not a factory-written data flag.
  eq(run.data.experimentalKeqingNative,nil);local status=false;for _,v in ipairs(run.data.statuses.statuses)do if v.id=='next_turn_block'then status=true end end;assert(status)
  local before=C.copy(run);local hand=run.combat.hand;local energy=run.combat.energy
  local ok,why=R.play(run,card.uid,1);eq(ok,false);eq(why,'keqing_candidate_effect_unavailable');same(run,before);eq(run.combat.hand,hand);eq(run.combat.energy,energy)
 end
end
local a,b=F.definitions(),F.definitions();a.cards[1].effects[1].value=999;a.cards[2].upgrade.effects[1].value=999;same(F.definitions(),b);same(D,untouched)
print('KQ_NATIVE_SUPPORT_PAIR_SOURCE_AND_GATE_PASS 4')
