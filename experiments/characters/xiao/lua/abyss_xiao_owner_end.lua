-- Candidate adapter only. No production registration or implicit release gate.
local Schedule=require('abyss_power_schedule')
local M={ownerEndIds={xiao_mask=true},ops={xiaoOwnerEndMask=true}}
local MAX=2147483647 -- production Power schedule integer domain, not JS MAX_SAFE_INTEGER
local function number(n,hi)assert(type(n)=='number'and n==n and n%1==0 and n>=0 and n<=(hi or MAX),'invalid Xiao resource');return n end
local function resources(state)
 local p=assert(state.player,'missing player');local statuses=assert(p.statuses,'missing statuses')
 local x=state.xiao or {};assert(type(x)=='table'and getmetatable(x)==nil,'invalid Xiao state')
 return p,statuses,x,number(statuses.xiao_mask or 0,3),number(statuses.xiao_mask_guard or 0),number(statuses.xiao_expiry_energy or 0),number(x.reservedEnergy or 0)
end
function M.ownerEndPlan(state,id,n)
 assert(id=='xiao_mask','unsupported Xiao owner')
 number(n,3);number(state.turn)
 if n==0 then return {bottom={}}end
 return {bottom={{op='xiaoOwnerEndMask',turn=state.turn}}}
end
-- Pure post-payment state reduction; payment/modifiers/events belong to Combat.
function M.reduceAfterPayment(state)
 local p,st,x,mask,guard,expiry,reserved=resources(state);number(p.hp);number(p.block)
 if mask==0 or p.hp<=0 then return {mask=mask,reservedEnergy=reserved,guard=0}end
 assert(guard<=MAX-p.block,'Xiao block overflow')
 local nextMask=mask-1
 if nextMask==0 then assert(expiry<=MAX-reserved,'Xiao expiry energy overflow');reserved=reserved+expiry end
 return {mask=nextMask,reservedEnergy=reserved,guard=guard}
end
function M.apply(combat,state,effect,_queue)
 if effect.op~='xiaoOwnerEndMask'then return false end
 local p,st,x,mask=resources(state)
 number(state.turn);number(effect.turn);if x.ownerEndTurn~=nil then number(x.ownerEndTurn)end
 assert(effect.turn==state.turn,'stale Xiao owner-end action')
 assert(x.ownerEndTurn~=state.turn,'duplicate Xiao owner-end action')
 if mask==0 or p.hp<=0 then return true end
 -- Check deterministic numeric bounds before requesting irreversible host hooks.
 M.reduceAfterPayment(state)
 state.xiao=state.xiao or {};state.xiao.ownerEndTurn=state.turn
 -- Use real HP-loss interpreter: Intangible, Rupture/relic/death semantics are
 -- host-owned. This is intentionally NOT a raw hp subtraction parity shim.
 combat.applyEffects(state,{{op='loseHp',value=2}},p,p)
 local patch=M.reduceAfterPayment(state)
 if p.hp<=0 then return true end
 if patch.guard>0 then combat.applyEffects(state,{{op='block',value=patch.guard}},p,p)end
 -- Actual removal must also remove acquisition history. Retained mask keeps it.
 if patch.mask==0 then Schedule.remove(state,p,'xiao_mask');st.xiao_mask=nil else st.xiao_mask=patch.mask end
 state.xiao.reservedEnergy=patch.reservedEnergy
 return true
end
return M
