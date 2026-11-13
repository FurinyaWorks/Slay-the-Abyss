-- Explicit experimental fixture factory, not an official class or natural reward pool.
local Copy=require('abyss_copy').copy
local Bridge=require('abyss_xiao_play_bridge')
local M={}
local manifest=Copy(require('abyss_xiao_starter_source'))
local function same(a,b)
 if type(a)~=type(b)then return false end
 if type(a)~='table'then return a==b end
 for k,v in pairs(a)do if not same(v,b[k])then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end
 return true
end
local function prepare(source)
 assert(type(manifest)=='table'and manifest.maxHp==70 and manifest.energyPerTurn==3 and manifest.drawPerTurn==5 and manifest.maxHand==10 and manifest.startingRelic.id=='xiao_relic_01','invalid Xiao starter manifest')
 assert(type(source)=='table'and type(source.cards)=='table'and type(source.rules)=='table','invalid starter source')
 local data=Copy(source)
 local ids={};for _,card in ipairs(data.cards.cards)do ids[card.id]=true end
 local facts={};for _,fact in ipairs(manifest.cards)do assert(not facts[fact.id],'duplicate manifest card');facts[fact.id]=fact end
 for _,card in ipairs(Bridge.definitions())do
  assert(not ids[card.id],'duplicate Xiao candidate definition')
  local id=card.id:match('^xiao_candidate_(x%d%d)$');local fact=assert(facts[id],'missing manifest card')
  assert(card.type==fact.type and card.cost==fact.cost and card.exhaust==fact.exhaust
   and same(card.effects,fact.effects)and same(card.upgrade.effects,fact.upgradedEffects),'Xiao source/runtime mismatch: '..card.id)
  card.color='xiao_candidate';card.rarity=fact.rarity;card.sourceId='xiao_candidate/'..id
  data.cards.cards[#data.cards.cards+1]=card;ids[card.id]=true
 end
 for _,id in ipairs(manifest.starter)do assert(ids['xiao_candidate_'..id],'unknown Xiao starter card')end
 data.rules.player.maxHp=manifest.maxHp;data.rules.player.energyPerTurn=manifest.energyPerTurn
 data.rules.player.drawPerTurn=manifest.drawPerTurn;data.rules.player.maxHand=manifest.maxHand
 data.rules.player.startingRelics={}
 data.cards.starter_deck.cards={};for _,id in ipairs(manifest.starter)do data.cards.starter_deck.cards[#data.cards.starter_deck.cards+1]='xiao_candidate_'..id end
 data.xiaoCandidateSource={sha256=manifest.sourceSha256,version=manifest.version,modelSha256=manifest.modelSha256,relicId=manifest.startingRelic.id}
 return data,{experimental=true,candidateLifecycle={kind='xiao',relicEnabled=true}}
end
function M.new(data,seed,...)
 assert(select('#',...)==0,'Xiao starter does not accept external manifest or options')
 local prepared,options=prepare(data)
 return require('abyss_run').new(prepared,seed,options)
end
return M
