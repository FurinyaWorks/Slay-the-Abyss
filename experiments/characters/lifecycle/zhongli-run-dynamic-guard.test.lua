package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same;local Run=require('abyss_run');local Candidate=require('abyss_run_candidate')
for _,id in ipairs({'large_acid','large_spike'})do
 local r=Run.new(D,37,{experimental=true,candidateLifecycle={kind='zhongli',relicEnabled=false}});r.floor=4
 local before=C.copy(r);local deck,data,cfg=r.deck,r.data,r.candidateLifecycle;local new=C.new;local called=false
 C.new=function(...)called=true;return new(...)end
 local ok,why=Run.startCombat(r,id);C.new=new;eq(ok,false);eq(why,'unsupported_zhongli_dynamic_encounter');eq(called,false);same(r,before);eq(r.deck,deck);eq(r.data,data);eq(r.candidateLifecycle,cfg)
 -- Explicit rejection preserves the map, rather than selecting a different fight.
 assert(Run.startCombat(r,'jaw_solo'));eq(r.encounterId,'jaw_solo')
 local control=Run.new(D,37,{experimental=true,candidateLifecycle={kind='ganyu',relicEnabled=false}});control.floor=4;assert(Run.startCombat(control,id))
end
-- Definition-driven growth rejects even if an encounter uses a different label.
for _,enemy in ipairs({{id='custom',ai={splitEnemy='acid_slime_m'}},{id='custom',intents={{kind='split'}}},{id='custom',intents={{effects={{op='enemyBronzeSpawn'}}}}}})do eq(Candidate.stableZhongliEnemy(enemy),false)end
-- A constructor-selected dynamic actor cannot bypass the resolved-state guard.
do
 local r=Run.new(D,37,{experimental=true,candidateLifecycle={kind='zhongli',relicEnabled=false}})
 local before=C.copy(r);local deck=r.deck;local new=C.new;local reached=false
 C.new=function(data,options)options.enemies={'acid_slime_l'};reached=true;return new(data,options)end
 local ok,why=Run.startCombat(r,'cultist_solo');C.new=new
 eq(ok,false);eq(why,'unsupported_zhongli_dynamic_encounter');assert(reached);same(r,before);eq(r.deck,deck);assert(Run.startCombat(r,'cultist_solo'))
end
print('ZHONGLI_DYNAMIC_ENCOUNTER_GUARD_PASS')
