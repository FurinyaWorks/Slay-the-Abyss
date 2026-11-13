-- Explicit source-bound experiment launcher; not a selectable class or natural pool.
-- Private generated source is module-owned, not an untrusted caller schema.
local Copy=require('abyss_copy').copy
local Native=require('abyss_ganyu_native_cards')
local Run=require('abyss_run')
local Source=require('abyss_ganyu_starter_source')
local M={}
function M.new(data,seed)
 local source=Source
 assert(type(source)=='table'and source.productionEnabled==false and source.relicId=='ganyu-starter-01','experimental starter source required')
 assert(source.maxHp==60 and source.energyPerTurn==3 and source.drawPerTurn==5 and source.handLimit==10,'unreviewed starter environment')
 local expected={'ganyu_lab_01','ganyu_lab_01','ganyu_lab_01','ganyu_lab_01','ganyu_lab_02','ganyu_lab_02','ganyu_lab_02','ganyu_lab_02','ganyu_lab_03','ganyu_lab_04'}
 assert(type(source.deck)=='table'and #source.deck==#expected,'invalid starter deck');for i,id in ipairs(expected)do assert(source.deck[i]==id,'unreviewed starter composition')end
 assert(type(source.paidCards)=='table'and #source.paidCards==1 and source.paidCards[1].id=='ganyu_lab_03','invalid starter paid source')
 local d=Copy(data);local known={};for _,c in ipairs(d.cards.cards)do known[c.id]=true end
 local wanted={};for _,id in ipairs(source.deck)do wanted[id]=true end
 local defs=Native.definitions().cards
 for _,c in ipairs(source.paidCards)do defs[#defs+1]=Copy(c)end
 local added={};for _,c in ipairs(defs)do if wanted[c.id]then assert(not known[c.id]and not added[c.id],'starter definition collision');local candidate=Copy(c);candidate.color='ganyu_candidate';candidate.sourceId='ganyu-'..c.id:sub(-2);candidate.ganyuSourceSHA256=source.sourceSHA256;candidate.reviewStatus='HOLD';d.cards.cards[#d.cards.cards+1]=candidate;added[c.id]=true end end
 for id in pairs(wanted)do assert(added[id],'missing starter definition')end
 d.cards.starter_deck.cards=Copy(source.deck)
 d.rules.player.maxHp=source.maxHp;d.rules.player.energyPerTurn=source.energyPerTurn;d.rules.player.drawPerTurn=source.drawPerTurn;d.rules.player.maxHand=source.handLimit
 d.rules.player.startingRelics={}
 local run=Run.new(d,seed,{experimental=true,candidateLifecycle={kind='ganyu',relicEnabled=true}})
 run.ganyuStarterExperiment={sourceSHA256=source.sourceSHA256,relicId=source.relicId,relicSourceSHA256=source.relicSourceSHA256,virtualEquipment=true,productionEnabled=false}
 return run
end
return M
