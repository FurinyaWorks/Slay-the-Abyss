-- Explicit experimental fixture factory, not an official class or natural reward pool.
local Copy=require('abyss_copy').copy
local Bridge=require('abyss_xiao_play_bridge')
local M={}
function M.prepare(source,manifest)
 assert(type(manifest)=='table'and manifest.maxHp==70 and manifest.startingRelic.id=='xiao_relic_01','invalid Xiao starter manifest')
 assert(type(source)=='table'and type(source.cards)=='table'and type(source.rules)=='table','invalid starter source')
 local data=Copy(source)
 local ids={};for _,card in ipairs(data.cards.cards)do ids[card.id]=true end
 for _,card in ipairs(Bridge.definitions())do assert(not ids[card.id],'duplicate Xiao candidate definition');card.color='xiao_candidate';for _,fact in ipairs(manifest.cards)do if card.id=='xiao_candidate_'..fact.id then card.rarity=fact.rarity;card.sourceId='xiao_candidate/'..fact.id end end;data.cards.cards[#data.cards.cards+1]=card end
 data.rules.player.maxHp=manifest.maxHp;data.rules.player.startingRelics={}
 data.cards.starter_deck.cards={};for _,id in ipairs(manifest.starter)do data.cards.starter_deck.cards[#data.cards.starter_deck.cards+1]='xiao_candidate_'..id end
 data.xiaoCandidateSource={sha256=manifest.sourceSha256,version=manifest.version,relicId=manifest.startingRelic.id}
 return data,{experimental=true,candidateLifecycle={kind='xiao',relicEnabled=true}}
end
return M
