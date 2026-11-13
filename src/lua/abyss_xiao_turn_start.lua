-- Isolated candidate turn-start executor. Host invokes after base energy refill,
-- before normal draw, inside the whole command snapshot. Not shared registered.
local M={ops={xiaoStartEnergy=true}}
local MAX=2147483647
local function integer(v)assert(type(v)=='number'and v==v and v%1==0 and v>=0 and v<=MAX,'invalid Xiao start resource');return v end
function M.apply(combat,state,effect)
 if effect.op~='xiaoStartEnergy'then return false end
 assert(type(state.xiao)=='table'and getmetatable(state.xiao)==nil,'missing Xiao state')
 local x=state.xiao;integer(state.turn);integer(effect.turn);integer(state.player.hp);integer(state.energy)
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
