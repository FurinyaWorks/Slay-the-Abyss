local Copy=require('abyss_copy')
local copy=Copy.copy
local detached={}
Copy.copy=function(value,...)
 local result=copy(value,...);detached[#detached+1]=result;return result
end
local T=require('abyss_warrior_status_cards')
local function empty() return {cards={cards={}},statuses={statuses={}}} end
local prototype=T.withCards(empty())
local function native()
 local result=copy(prototype);result.experimentalWarriorStatus=nil
 for _,c in ipairs(result.cards.cards) do c.experimental=nil end
 return result
end
local function record(label,input,expected,contains)
 detached={}
 local before=STATUS_GRAPH(input)
 local returned=table.pack(pcall(T.withCards,input))
 if not returned[1] and type(returned[2])=='string' then
  -- Canonicalize only an error location whose exact source statement still
  -- occurs once in the frozen original. Preserve every thrown body unchanged.
  returned[2]=STATUS_ERROR(returned[2])
 end
 assert(returned[1]==expected,'STATUS_SEMANTIC '..label..' outcome')
 if contains then assert(type(returned[2])=='string' and returned[2]:find(contains,1,true),'STATUS_SEMANTIC '..label..' error') end
 assert(STATUS_GRAPH(input)==before,'STATUS_SEMANTIC '..label..' source unchanged')
 STATUS_GRAPH_WRITE({source=input,returned=returned,detached=detached},label)
 return returned[2]
end
local function card(data,id)
 for _,c in ipairs(data.cards.cards) do if c.id==id then return c end end
 error('missing fixture card '..id)
end
local output=record('empty',empty(),true)
assert(#output.cards.cards==15 and #output.statuses.statuses==3,'STATUS_SEMANTIC append counts')
assert(output.cards.cards[1].id=='wild_strike' and output.cards.cards[15].id=='burn','STATUS_SEMANTIC definition order')
assert(output.experimentalWarriorStatus==true,'STATUS_SEMANTIC final marker')
record('native',native(),true)
local missing=native();table.remove(missing.cards.cards,1);table.remove(missing.cards.cards,5);table.remove(missing.statuses.statuses,2)
record('mixed',missing,true)
local legacy=native();card(legacy,'burn').burnDamage=nil;card(legacy,'burn').endTurnDamage=2;card(legacy,'burn').upgrade=nil
local normalized=record('legacy Burn',legacy,true)
assert(card(normalized,'burn').burnDamage==2 and card(normalized,'burn').endTurnDamage==nil,'STATUS_SEMANTIC Burn normalization')
local alias=native();alias.reference=alias.cards.cards[1];alias.self=alias;alias.shared=alias.statuses.statuses[1];alias.cards.cards[#alias.cards.cards+1]={id='untouched',effects=alias.reference.effects}
local aliasResult=record('aliases',alias,true)
assert(aliasResult.self==aliasResult and aliasResult.reference~=aliasResult.cards.cards[1],'STATUS_SEMANTIC alias replacement')
assert(aliasResult.shared~=aliasResult.statuses.statuses[1],'STATUS_SEMANTIC Power replacement')
local order=native();order.cards.cards[1],order.cards.cards[12]=order.cards.cards[12],order.cards.cards[1]
local ordered=record('preserve order',order,true)
assert(ordered.cards.cards[1].id=='blood_for_blood' and ordered.cards.cards[12].id=='wild_strike','STATUS_SEMANTIC replacement position')
for _,input in ipairs({false,0,'x',{},{cards={}},{cards={cards={}}},{cards={cards={}},statuses={}}}) do record('missing '..tostring(type(input)),input,false,'missing warrior status data') end
local duplicate=native();duplicate.cards.cards[#duplicate.cards.cards+1]=duplicate.cards.cards[1];record('duplicate card',duplicate,false,'duplicate source card')
local dupPower=native();dupPower.statuses.statuses[#dupPower.statuses.statuses+1]=dupPower.statuses.statuses[1];record('duplicate Power',dupPower,false,'duplicate source status')
local prepared=native();prepared.experimentalWarriorStatus=true;record('already prepared',prepared,false,'warrior status data already prepared')
for _,id in ipairs({'wild_strike','blood_for_blood'}) do
 for _,field in ipairs({'experimental','type','sts_name','effects'}) do
  local bad=native();card(bad,id)[field]=field=='experimental' and true or false
  record(id..' '..field,bad,false,'incompatible native status-build card: '..id)
 end
end
for _,id in ipairs({'wound','dazed','burn'}) do
 for _,field in ipairs({'type','cost','effects','ethereal','exhaust'}) do
  local bad=native();local c=card(bad,id)
  c[field]=field=='ethereal' and not (c.ethereal==true) or (field=='exhaust' and true or false)
  record(id..' '..field,bad,false,'incompatible reused status card: '..id)
 end
 local bad=native();card(bad,id).effects={unexpected=true};record(id..' nonempty effects',bad,false,'incompatible reused status card: '..id)
end
for _,value in ipairs({false,1,4}) do
 local bad=native();card(bad,'burn').burnDamage=value;record('Burn value '..tostring(value),bad,false,'incompatible reused Burn lifecycle')
end
for _,value in ipairs({false,{}, {burnDamage=3}}) do
 local bad=native();card(bad,'burn').upgrade=value;record('Burn upgrade '..tostring(type(value)),bad,false,'incompatible reused Burn lifecycle')
end
for _,field in ipairs({'kind','stack','decay'}) do
 local bad=native();bad.statuses.statuses[3][field]=false;record('Power '..field,bad,false,'incompatible native status-build Power: fire_breathing')
end
local priority=native();card(priority,'wild_strike').experimental=true;card(priority,'burn').burnDamage=false;priority.statuses.statuses[1].kind=false
record('card error before later validation',priority,false,'incompatible native status-build card: wild_strike')
local lifecycle=native();card(lifecycle,'burn').burnDamage=false;lifecycle.statuses.statuses[1].kind=false
record('lifecycle before Power',lifecycle,false,'incompatible reused Burn lifecycle')
for _,slot in ipairs({'cards','statuses'}) do
 for _,value in ipairs({false,3,'bad',{}}) do
  local bad=native();local list=bad[slot][slot];list[2]=value
  record(slot..' malformed '..tostring(type(value)),bad,false)
 end
end
local source=native();source.cards.cards[1].extra={key='extra'}
local replaced=record('replacement schema',source,true)
assert(replaced.cards.cards[1].extra==nil and replaced.cards.cards[1].color=='red' and replaced.cards.cards[1].experimental,'STATUS_SEMANTIC native normalization')

for _,slot in ipairs({'cards','statuses'}) do
 for _,value in ipairs({false,3,'x'}) do
  local bad=native();bad[slot][slot]=value;record(slot..' malformed list '..tostring(type(value)),bad,false)
 end
end
