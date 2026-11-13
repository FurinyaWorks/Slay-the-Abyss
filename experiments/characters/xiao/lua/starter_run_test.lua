package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local directory=debug.getinfo(1,'S').source:sub(2):match('^(.*[/])')or './'
local F=dofile(directory..'abyss_xiao_starter.lua')
local Run=require('abyss_run');local before=C.copy(D);local data,options=F.prepare(D,dofile(directory..'abyss_xiao_starter_data.lua'));same(D,before)
local run=Run.new(data,42,options);eq(run.hp,70);eq(run.maxHp,70);eq(#run.deck,10);eq(#run.relics,0)
local counts={};for _,c in ipairs(run.deck)do counts[c.cardId]=(counts[c.cardId]or 0)+1 end
 eq(counts.xiao_candidate_x01,4);eq(counts.xiao_candidate_x02,4);eq(counts.xiao_candidate_x04,1);eq(counts.xiao_candidate_x05,1)
assert(Run.startCombat(run,'cultist_solo'));eq(run.combat.player.maxHp,70);eq(run.combat.xiao.startingRelic,true)
for _,c in ipairs(run.combat.hand)do assert(C.cardDefinition(run.combat,c).xiaoCandidate)end
same(D,before)
print('XIAO_STARTER_RUN_PASS explicit copied starter HP70 no native starting relic and resolved canonical definitions')
local s=run.combat;local entry
for _,pile in ipairs({s.hand,s.draw})do for i,c in ipairs(pile)do if c.cardId=='xiao_candidate_x04'then entry=table.remove(pile,i);break end end end
assert(entry);s.hand[#s.hand+1]=entry;local n=#s.hand;local hp=s.player.hp
assert(Run.play(run,entry.uid,1));eq(s.player.hp,hp-2);eq(#s.hand,n);eq(s.xiao.relicUsed,true)
local after=s.player.hp;for _,e in ipairs(s.enemies)do C.damage(s,s.player,e,999,true)end;assert(Run.finishCombat(run));eq(run.hp,after)
print('XIAO_STARTER_RELIC_PASS actual mask payment plus first-entry draw; victory has no inherited Burning Blood healing')
