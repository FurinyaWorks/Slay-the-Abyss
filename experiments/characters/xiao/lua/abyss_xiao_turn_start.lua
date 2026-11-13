-- Isolated candidate turn-start executor. Host invokes after base energy refill,
-- Energy is before normal draw; CalmDraw is after normal draw. Both require
-- Block is after host old-block cleanup. All require whole command snapshot.
-- Candidate module: only the older Energy executor is separately shared registered.
local M={ops={xiaoStartEnergy=true,xiaoStartCalmDraw=true,xiaoStartBlock=true}}
local MAX=2147483647
local function integer(v)assert(type(v)=='number'and v==v and v%1==0 and v>=0 and v<=MAX,'invalid Xiao start resource');return v end
function M.apply(combat,state,effect)
 if effect.op~='xiaoStartEnergy'and effect.op~='xiaoStartCalmDraw'and effect.op~='xiaoStartBlock'then return false end
 assert(type(state.xiao)=='table'and getmetatable(state.xiao)==nil,'missing Xiao state')
 local x=state.xiao;integer(state.turn);integer(effect.turn);integer(state.player.hp);integer(state.energy)
 if effect.op=='xiaoStartBlock'then
  local amount=x.reservedBlock;if amount==nil then amount=0 end;integer(amount)
  integer(state.player.block)
  if x.startBlockTurn~=nil then integer(x.startBlockTurn)end
  assert(effect.turn==state.turn,'stale Xiao block action')
  assert(x.startBlockTurn~=state.turn,'duplicate Xiao block action')
  if state.player.hp==0 then return true end
  x.startBlockTurn=state.turn;x.reservedBlock=0
  if amount>0 then combat.applyEffects(state,{{op='block',value=amount}},state.player,state.player)end
  return true
 end
 if effect.op=='xiaoStartCalmDraw'then
  local amount=state.player.statuses.xiao_calm_draw;if amount==nil then amount=0 end;integer(amount)
  local mask=state.player.statuses.xiao_mask;if mask==nil then mask=0 end;integer(mask);assert(mask<=3,'invalid Xiao mask')
  if x.startCalmDrawTurn~=nil then integer(x.startCalmDrawTurn)end
  assert(effect.turn==state.turn,'stale Xiao calm draw action')
  assert(x.startCalmDrawTurn~=state.turn,'duplicate Xiao calm draw action')
  if state.player.hp==0 then return true end
  x.startCalmDrawTurn=state.turn
  if mask==0 and amount>0 then combat.applyEffects(state,{{op='draw',value=amount}},state.player,state.player)end
  return true
 end
 local reserved=x.reservedEnergy;if reserved==nil then reserved=0 end;integer(reserved)
 if x.startEnergyTurn~=nil then integer(x.startEnergyTurn)end
 assert(effect.turn==state.turn,'stale Xiao turn-start action')
 assert(x.startEnergyTurn~=state.turn,'duplicate Xiao turn-start action')
 if state.player.hp==0 then return true end
 assert(reserved<=MAX-state.energy,'Xiao start energy overflow')
 x.startEnergyTurn=state.turn;x.reservedEnergy=0
 if reserved>0 then combat.applyEffects(state,{{op='energy',value=reserved}},state.player,state.player)end
 return true
end
return M
