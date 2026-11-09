local C,A,D=require('abyss_combat'),require('abyss_actor'),require('abyss_data')
local s=C.new(D,{enemies={'bronze_orb','cultist'},deck={},seed=43})
local orb=s.enemies[1];orb.hp=1;orb.statuses.stasis=1;orb.powerOrder={'stasis'}
local held={uid=901,cardId='defend',upgraded=false};s.act2StasisCards={[orb.id]=held}
s.player.statuses.master_reality=1;s.hand={}
local token={marker='require-failure'};local loads=0
package.loaded.abyss_combat=nil
package.preload.abyss_combat=function()loads=loads+1;error(token,0)end
local result=table.pack(pcall(A.instantKill,s,orb))
assert(result.n==2 and result[1]==false and result[2]==token,'loader error identity')
assert(loads==1 and orb.hp==0,'one lazy load after death')
assert(s.act2StasisCards[orb.id]==held and not held.upgraded,'custody unchanged')
assert(#(s.cardActions or {})==0,'no queued return before loader succeeds')
STASIS_GRAPH_WRITE({s=s,result=result,token=token,held=held,loads=loads},'loader-failure',true)
print('INDEPENDENT_REQUIRE_FAILURE_PASS')
