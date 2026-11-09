local T=require('abyss_watcher_flow_cards')
local function empty()return {cards={cards={}},statuses={statuses={}}}end
local function clone(x)if type(x)~='table'then return x end;local y={};for k,v in pairs(x)do y[k]=clone(v)end;return y end
local function expect(ok,label)assert(ok,'FLOW_PREPARATION_SEMANTIC '..label)end
local count=0
local function record(label,input,expected,contains)
 local before=FLOW_PREPARATION_GRAPH(input)
 local returned=table.pack(pcall(T.withCards,input))
 if not returned[1] and type(returned[2])=='string'then returned[2]=FLOW_PREPARATION_ERROR(returned[2])end
 expect(returned[1]==expected,label..' outcome')
 if contains then expect(type(returned[2])=='string' and returned[2]:find(contains,1,true),label..' error')end
 expect(FLOW_PREPARATION_GRAPH(input)==before,label..' source unchanged')
 FLOW_PREPARATION_GRAPH_WRITE({source=input,returned=returned},label);count=count+1
 return returned[2]
end
local function card(data,id)for _,c in ipairs(data.cards.cards)do if c.id==id then return c end end;error('missing '..id)end
local output=record('empty',empty(),true)
expect(#output.cards.cards==22 and #output.statuses.statuses==10,'append counts')
expect(output.cards.cards[1].id=='battle_hymn' and output.cards.cards[18].id=='weave' and output.cards.cards[19].id=='through_violence' and output.cards.cards[22].id=='miracle','definition order')
expect(card(output,'battle_hymn').innate==nil and card(output,'battle_hymn').upgrade.innate==true,'upgrade innate')
expect(card(output,'study').cost==2 and card(output,'study').upgrade.cost==1,'upgrade cost')
expect(card(output,'collect').exhaust==true and card(output,'collect').costMode=='all_energy','native flags')
expect(card(output,'tantrum').effects~=card(output,'tantrum').upgrade.effects,'native effects detached')
for _,id in ipairs({'through_violence','insight','smite','miracle'})do
 local c=card(output,id);expect(c.rarity=='special' and c.color=='colorless' and c.selfRetain and c.exhaust,'derivative normalization')
end
for _,s in ipairs(output.statuses.statuses)do expect(s.priority==(s.id=='draw_card_next_turn' and 20 or 5),'Power priority')end
record('already prepared',output,false,'Watcher flow card already exists: battle_hymn')
local extra=empty();local shared={id='unrelated',extra={value=3}};extra.cards.cards={shared};extra.reference=shared;extra.other=shared.extra
local detached=record('aliases',extra,true)
expect(detached.cards.cards[1]~=extra.cards.cards[1] and detached.cards.cards[1]~=detached.reference and detached.reference.extra~=detached.other,'recursive copy alias contract')
for _,id in ipairs({'through_violence','insight','smite','miracle'})do
 local input=empty();local c=clone(card(output,id));c.extra={keep=true};c.name='custom';c.upgrade={keep=true};c.text='custom';input.cards.cards={c}
 local result=record('reuse '..id,input,true)
 expect(result.cards.cards[1].name=='custom' and result.cards.cards[1].upgrade.keep and result.cards.cards[1].extra.keep,'derivative reuse preservation')
 for _,field in ipairs({'sourceId','cost','type','selfRetain','exhaust'})do
  local bad=clone(input);bad.cards.cards[1][field]=false
  record(id..' field '..field,bad,false,'unsupported existing flow derivative')
 end
 for _,effects in ipairs({{},{{op='wrong',value=1}},{{op=c.effects[1].op,value=-1}},{c.effects[1],c.effects[1]}})do
  local bad=clone(input);bad.cards.cards[1].effects=effects
  record(id..' effects '..tostring(#effects),bad,false,'unsupported existing flow derivative effects')
 end
 for _,value in ipairs({false,3,'x',{{}}})do
  local bad=clone(input);bad.cards.cards[1].effects=value
  record(id..' malformed effects '..type(value),bad,false)
 end
end
for _,sourceId in ipairs({'ABSENT','Vigor'})do
 local input=empty();local s={id='vigor',kind='buff',stack='intensity',decay='none',name='Akabeko',priority=123,custom={preserve=true}};if sourceId~='ABSENT'then s.sourceId=sourceId end;input.statuses.statuses={s}
 local result=record('Vigor '..sourceId,input,true)
 expect(result.statuses.statuses[1].name=='Akabeko' and result.statuses.statuses[1].priority==123 and result.statuses.statuses[1].custom.preserve,'Vigor reuse')
 for _,field in ipairs({'sourceId','kind','stack','decay'})do local bad=clone(input);bad.statuses.statuses[1][field]=false;record('Vigor incompatible '..sourceId..' '..field,bad,false,'Watcher flow power already exists: vigor')end
end
for _,s in ipairs(output.statuses.statuses)do if s.id~='vigor'then local input=empty();input.statuses.statuses={clone(s)};record('existing Power '..s.id,input,false,'Watcher flow power already exists: '..s.id)end end
for _,c in ipairs(output.cards.cards)do if c.color=='purple'then local input=empty();input.cards.cards={{id=c.id}};record('native collision '..c.id,input,false,'Watcher flow card already exists: '..c.id)end end
for _,input in ipairs({false,0,'x',{},{cards={}},{cards={cards={}}},{cards={cards={}},statuses={}}})do record('missing '..type(input),input,false,'missing Watcher flow data')end
record('missing nil',nil,false,'missing Watcher flow data')
local duplicate=empty();duplicate.cards.cards={{id='x'},{id='x'}};record('duplicate card',duplicate,false,'duplicate flow input card')
local duplicatePower=empty();duplicatePower.statuses.statuses={{id='x'},{id='x'}};record('duplicate Power',duplicatePower,false,'duplicate flow input power')
local priority=empty();priority.cards.cards={{id='battle_hymn'},{id='battle_hymn'}};priority.statuses.statuses={{id='bad'},{id='bad'}}
record('card index before Power index',priority,false,'duplicate flow input card')
priority.cards.cards={{id='battle_hymn'}};record('Power index before native',priority,false,'duplicate flow input power')
priority.statuses.statuses={{id='vigor'}};priority.cards.cards={{id='battle_hymn'},{id='through_violence'}};record('native before derivative',priority,false,'Watcher flow card already exists: battle_hymn')
priority.cards.cards={{id='through_violence'}};record('derivative before Power',priority,false,'unsupported existing flow derivative')
for _,slot in ipairs({'cards','statuses'})do
 for _,value in ipairs({false,3,'bad',{}})do local input=empty();input[slot][slot]={value};record(slot..' malformed member '..type(value),input,false)end
 for _,value in ipairs({false,3,'bad'})do local input=empty();input[slot][slot]=value;record(slot..' malformed list '..type(value),input,false)end
end
for _,place in ipairs({'root','cards','member','extra'})do
 local input=empty();local nested=setmetatable({},{})
 if place=='root'then setmetatable(input,{})elseif place=='cards'then input.cards.cards=nested elseif place=='member'then input.cards.cards={nested}else input.extra=nested end
 record('metatable '..place,input,false,'flow data must be plain')
end
local holes=empty();holes.cards.cards={[1]={id='unrelated'},[3]={id='unseen'}};record('input sequence hole',holes,true)
print('FLOW_PREPARATION_PASS '..count)
