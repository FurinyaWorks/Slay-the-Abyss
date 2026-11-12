local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
local N=require('abyss_relic_names');local D=H.F.Data;local count=0
local function same(a,b,seen)
 if a==b then return end;assert(type(a)==type(b));if type(a)~='table'then assert(a==b);return end
 seen=seen or {};if seen[a]then assert(seen[a]==b);return end;seen[a]=b
 for k,v in pairs(a)do same(v,b[k],seen)end;for k in pairs(b)do assert(a[k]~=nil)end
end
local ids={}
for _,catalog in ipairs({D.relicSource,D.classRelicSources.silent,D.classRelicSources.defect,D.classRelicSources.watcher})do
 for _,pool in pairs(catalog.queues)do for _,id in ipairs(pool)do ids[id]=true end end
end
local before=H.F.Combat.copy(D)
for id in pairs(ids)do
 local known,missing=N.get(D,id),N.get(nil,id)
 assert(known~='未知遗物','unmapped catalog relic '..id)
 assert(known~='' and known:find('[\228-\233]') and not known:find('[A-Za-z]'),'non-Chinese source '..id)
 assert(known==missing,'known and unavailable identities must retain the same display name '..id)
 count=count+1
end
assert(count==156);same(before,D)
-- R-GATE v1.0: every authored relic has exactly one Chinese name across
-- definition-based inventory views and source-ID-only reward/fallback views.
local approved={burning_blood='岩脉残晶',black_blood='岩脉源晶'}
local named,definitions={},{}
for _,entry in ipairs(D.relics.relics)do
 local name=N.get(D,entry.id)
 assert(type(entry.name)=='string' and entry.name~='' and entry.name:find('[\228-\233]') and not entry.name:find('[A-Za-z]'),'non-Chinese authored name '..entry.id)
 assert(name==entry.name,'relic definition/display name drift '..entry.id)
 if entry.sourceId then assert(N.get(nil,entry.sourceId)==entry.name,'relic source fallback name drift '..entry.id)end
 assert(not named[name],'duplicate relic name '..name);named[name]=entry.id
 definitions[entry.id]=entry
 if approved[entry.id]then assert(name==approved[entry.id],'approved name changed '..entry.id)end
end
local start,advance=assert(definitions.burning_blood),assert(definitions.black_blood)
assert(start.trigger=='combat_end' and #start.effects==1 and start.effects[1].op=='heal' and start.effects[1].value==6)
assert(advance.replaces=='burning_blood' and advance.trigger=='combat_end' and #advance.effects==1 and advance.effects[1].op=='heal' and advance.effects[1].value==12)
assert(start.description=='每场战斗胜利后，回复6点生命。')
assert(advance.description=='替换「岩脉残晶」。每场战斗胜利后，回复12点生命。')
assert(N.get(nil,'Burning Blood')=='岩脉残晶' and N.get(nil,'Black Blood')=='岩脉源晶')

assert(N.get(nil,'SacredBark')=='神圣树皮' and N.get(D,'Darkstone Periapt')=='黑石护符')
assert(N.get(D,'darkstone_periapt')=='黑石护符' and N.get(nil,'???')=='未知遗物' and N.get(D,nil)=='未知遗物')
local h,u,p=H.setup({'defend'})
for _,e in ipairs(h.run.combat.enemies)do e.hp=0 end
assert(H.Run.finishCombat(h.run))
h.run.rewards.relics={{sourceId='SacredBark',id='SacredBark',unavailable=true}}
local runBefore=H.F.Combat.copy(h.run);local pool=h.run.relicPool
h:refresh()
local box=p:GetChild('potionHelp'):GetChild('relicReward1')
assert(box:GetChild('normal'):GetChild('label').text=='神圣树皮 · 尚不可领取')
assert(not box.interactable);same(runBefore,h.run);assert(h.run.relicPool==pool)
print('RELIC_CHINESE_NAMES_PASS 156')
