local Copy=require('abyss_copy'); local copy=Copy.copy; local detached={}
Copy.copy=function(v,...) local r=copy(v,...);detached[#detached+1]=r;return r end
local T=require('abyss_warrior_status_cards')
local function empty() return {cards={cards={}},statuses={statuses={}}} end
local function run(label,input)
 detached={};local before=STATUS_GRAPH(input);local result=table.pack(pcall(T.withCards,input))
 if not result[1] and type(result[2])=='string' then result[2]=STATUS_ERROR(result[2]) end
 assert(STATUS_GRAPH(input)==before,'source mutation '..label)
 STATUS_GRAPH_WRITE({input=input,result=result,detached=detached},label)
end
run('nil',nil)
for i,v in ipairs({true,false,42,'x'}) do
 for _,slot in ipairs({'cards','statuses'}) do
  local a=empty();a[slot]=v;run('container '..slot..i,a)
  local b=empty();b[slot][slot]=v;run('list '..slot..i,b)
 end
end
for _,id in ipairs({false,17,{}}) do
 local a=empty();a.cards.cards={{id=id,effects={}}};run('unusual id '..type(id),a)
end
local a=empty();a.statuses.statuses=a.cards.cards;run('cross list alias',a)
a=empty();a.cards.cards[3]={id='wound',type='bad'};run('sparse cards',a)
a=empty();a.statuses.statuses[3]={id='evolve',kind='bad'};run('sparse powers',a)
a=empty();a.cards.cards={{id='burn',type='status',cost=-2,effects={},burnDamage=2,upgrade=42}};run('numeric upgrade',a)
a=empty();a.cards.cards={{id='burn',type='status',cost=-2,effects={},burnDamage=2,upgrade='bad'}};run('string upgrade',a)
local visits=0
a=empty();setmetatable(a.cards.cards,{__pairs=function(t) visits=visits+1;return next,{[1]={id='other',effects={}}},nil end});run('copy pairs hook',a);assert(visits==1)
print('probe cases complete')
