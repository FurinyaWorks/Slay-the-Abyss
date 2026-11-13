local P=dofile('experiments/characters/keqing/inspect-window-plan.lua')
local function same(a,b)assert(#a==#b);for i=1,#a do assert(a[i]==b[i])end end
local cases=0
for _,limit in ipairs({3,4})do for n=0,6 do
 local draw={};for i=1,n do draw[i]=100+i end
 local offer=P.offer(draw,limit,9,false);assert(#offer==math.min(n,limit))
 for k,u in ipairs(offer)do
  local remaining,index=P.take(draw,offer,u);assert(index==n-k+1);local expected={};for _,v in ipairs(draw)do if v~=u then expected[#expected+1]=v end end;same(remaining,expected);assert(#draw==n);cases=cases+1
 end
 same(P.offer(draw,limit,10,false),{});same(P.offer(draw,limit,0,true),{})
end end
assert(cases==33)
for _,bad in ipairs({{1,1},{[2]=2},{1,2,x=3},{0},{-1},{1/0}})do assert(not pcall(P.offer,bad,3,0,false))end
assert(not pcall(P.offer,{1},2,0,false));assert(not pcall(P.offer,{1},3,11,false));assert(not pcall(P.offer,{1},3,0,'false'))
assert(not pcall(P.take,{1,2,3,4},{4,3,2},1));assert(not pcall(P.take,{1,2,3,4},{3,4},3));assert(not pcall(P.take,{1},{},1))
print('KQ044_WINDOW_PLAN_PASS')
