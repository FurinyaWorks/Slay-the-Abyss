-- Isolated effect-boundary hook; no shared registration. Host captures after
-- payment before effects, finishes after effects before UseCard clears context.
local M={}
local function integer(v)assert(type(v)=='number'and v==v and v%1==0 and v>=0 and v<=2147483647,'invalid Xiao attack hook number');return v end
local function context(state)
 local x=state.xiao;assert(type(x)=='table'and getmetatable(x)==nil,'missing Xiao state')
 local p=assert(state.pendingPlay,'missing paid play');local c=assert(state.cardInUse,'missing in-use card')
 assert(p.uid==c.uid and ((type(p.uid)=='number'and p.uid>0 and p.uid%1==0)or(type(p.uid)=='string'and p.uid~='')),'invalid attack hook UID')
 integer(state.turn);integer(state.player.hp)
 local n=state.player.statuses.xiao_masked_attack_draw;if n==nil then n=0 end;integer(n)
 if x.maskedDrawTurn~=nil then integer(x.maskedDrawTurn)end
 return x,c,n
end
function M.capture(combat,state)
 local x,c=context(state);assert(x.attackCapture==nil,'unconsumed Xiao capture')
 local mask=state.player.statuses.xiao_mask;if mask==nil then mask=0 end;integer(mask);assert(mask<=3,'invalid mask')
 x.attackCapture={uid=c.uid,turn=state.turn,maskedAttack=combat.cardDefinition(state,c).type=='attack'and mask>0}
end
function M.finish(combat,state)
 local x,c,n=context(state);local capture=x.attackCapture
 assert(type(capture)=='table'and capture.uid==c.uid and capture.turn==state.turn and type(capture.maskedAttack)=='boolean','stale Xiao capture')
 x.attackCapture=nil
 if state.player.hp>0 and capture.maskedAttack and n>0 and x.maskedDrawTurn~=state.turn then
  x.maskedDrawTurn=state.turn
  combat.applyEffects(state,{{op='draw',value=n}},state.player,state.player,c)
 end
 return true
end
return M
