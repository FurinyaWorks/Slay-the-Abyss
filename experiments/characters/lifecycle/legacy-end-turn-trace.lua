package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
if LEGACY_ROOT then package.path=LEGACY_ROOT..'/?.lua;'..package.path end
local H=dofile('tests/helpers/act2_event_relics.lua')
local function encode(value,seen)
 local kind=type(value)
 if kind~='table'then return kind..':'..tostring(value)end
 seen=seen or {};if seen[value]then return '@'..seen[value]end
 local count=0;for _ in pairs(seen)do count=count+1 end;seen[value]=count+1
 local keys={};for k in pairs(value)do keys[#keys+1]=k end
 table.sort(keys,function(a,b)return type(a)==type(b)and a<b or type(a)<type(b)end)
 local out={'{'};for _,k in ipairs(keys)do out[#out+1]=encode(k,seen)..'='..encode(value[k],seen)..';'end
 out[#out+1]='}';return table.concat(out)
end
for _,relics in ipairs({{}, {'Orichalcum'}, {"Nilry's Codex",'Orichalcum'}})do
 local _,s=H.battle(relics,{'strike','defend','strike','defend','strike','defend'})
 for turn=1,2 do
  assert(H.C.play(s,s.hand[1].uid,1))
  assert(H.C.endTurn(s))
  if s.pendingChoice then assert(H.C.chooseCard(s,s.pendingChoice.token,0))end
 end
 print(encode({events=s.events,player=s.player,enemies=s.enemies,energy=s.energy,turn=s.turn,
 hand=s.hand,draw=s.draw,discard=s.discard,exhaust=s.exhaust,phase=s.phase}))
end
