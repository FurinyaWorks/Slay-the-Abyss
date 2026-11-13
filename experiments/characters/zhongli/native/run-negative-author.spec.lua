-- Cross-role independent acceptance, pending frozen shared Ganyu Run slice.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local Run=require('abyss_run')
local function fresh(flag)return Run.new(D,17,{experimental=true,candidateLifecycle={kind='ganyu',relicEnabled=flag}})end
local mutations={
 function(r)r.candidateLifecycle.extra=true end,
 function(r)r.candidateLifecycle=false end,
 function(r)r.candidateLifecycle='ganyu'end,
 function(r)r.candidateLifecycle.relicEnabled='false'end,
 function(r)r.candidateLifecycle.relicEnabled=0 end,
 function(r)r.candidateLifecycle.relicEnabled=nil end,
 function(r)r.candidateLifecycle.kind='zhongli'end,
 function(r)r.character='original_v4_ht'end,
 function(r)r.character='ironclad'end,
 function(r)r.campaignProfile='competition-two-act'end,
 function(r)r.data.originalV4Rules={}end,
 function(r)r.data.experimentalCharacter='silent'end,
 function(r)r.experimentalCandidate=false end,
 function(r)r.experimentalCandidate='true'end,
 function(r)r.candidateLifecycle=setmetatable(r.candidateLifecycle,{})end,
}
for _,flag in ipairs({false,true})do for _,mutate in ipairs(mutations)do
 local r=fresh(flag);mutate(r);local before=C.copy(r);local deck,data,cfg=r.deck,r.data,r.candidateLifecycle
 eq(pcall(Run.startCombat,r,'cultist_solo'),false);same(r,before);eq(r.deck,deck);eq(r.data,data);eq(r.candidateLifecycle,cfg)
end end
-- Both valid booleans are supported, including false; a string 'false' above is not.
for _,flag in ipairs({false,true})do
 local r=fresh(flag);local before=C.copy(r);local deck,data,cfg=r.deck,r.data,r.candidateLifecycle;local new=C.new;local reached=false
 C.new=function(...)local s=new(...);assert(s.characterCandidate=='ganyu'and s.ganyuRelicEnabled==flag);reached=true;error('author fault after actual candidate init')end
 local ok=pcall(Run.startCombat,r,'cultist_solo');C.new=new;assert(reached and not ok);same(r,before);eq(r.deck,deck);eq(r.data,data);eq(r.candidateLifecycle,cfg)
 assert(Run.startCombat(r,'cultist_solo'));eq(r.combat.characterCandidate,'ganyu');eq(r.combat.ganyuRelicEnabled,flag)
end
print('AUTHOR_RUN_NEGATIVE_PASS 30 tampered-state rejects plus2 post-init whole-Run reference restores and retries')
