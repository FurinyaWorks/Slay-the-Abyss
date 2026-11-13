-- Evidence only, no interception or production order selection.
package.path='./?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local A=require('abyss_actor')
local function fixture(relic,buffer)
 local s=C.new(D,{seed=42,deck={'strike'},enemies={'cultist'}})
 s.player.hp=50;s.player.maxHp=50;s.player.block=0;s.relics= relic and {relic}or {}
 if buffer then A.applyPower(s,s.player,'buffer',1,s.player)end
 return s
end
local rows={
 {name='ordinary',hit=5,jade=3,expectedNative=5,expectedPre=2,expectedPost=2,expectedPreJade=0,expectedPostJade=0},
 {name='Torii',relic='torii',hit=5,jade=3,expectedNative=1,expectedPre=1,expectedPost=0,expectedPreJade=0,expectedPostJade=2},
 {name='Tungsten',relic='tungsten_rod',hit=5,jade=3,expectedNative=4,expectedPre=1,expectedPost=1,expectedPreJade=0,expectedPostJade=0},
 {name='Buffer',buffer=true,hit=5,jade=3,expectedNative=0,expectedPre=0,expectedPost=0,expectedPreJade=0,expectedPostJade=3},
 {name='Buffer-full-jade',buffer=true,hit=3,jade=3,expectedNative=0,expectedPre=0,expectedPost=0,expectedPreJade=0,expectedPostJade=3}
}
print('case,native_hp_loss,pre_modifier_hp_loss,pre_modifier_jade,post_modifier_arithmetic_hp_loss,post_modifier_arithmetic_jade,native_buffer,pre_modifier_buffer')
for _,r in ipairs(rows)do
 local native=fixture(r.relic,r.buffer);local pre=fixture(r.relic,r.buffer)
 local nativeLoss=A.damage(native,native.enemies[1],native.player,r.hit,false)
 -- Restricted fixture has no block, Intangible, Weak, Vulnerable, Strength or damage scaling:
 -- lowering base by consumed jade emulates a post-block/pre-modifier candidate ONLY here.
 local preConsumed=math.min(r.hit,r.jade)
 local preLoss=A.damage(pre,pre.enemies[1],pre.player,r.hit-preConsumed,false)
 -- Post result is arithmetic evidence only, never rewrites real damage/events after execution.
 local postConsumed=math.min(nativeLoss,r.jade)
 local postLoss=nativeLoss-postConsumed
 assert(nativeLoss==r.expectedNative and preLoss==r.expectedPre and postLoss==r.expectedPost,r.name..' damage expectation')
 assert(r.jade-preConsumed==r.expectedPreJade and r.jade-postConsumed==r.expectedPostJade,r.name..' storage expectation')
 if r.name=='Buffer-full-jade'then assert((native.player.statuses.buffer or 0)==0 and pre.player.statuses.buffer==1)end
 print(table.concat({r.name,nativeLoss,preLoss,r.jade-preConsumed,postLoss,r.jade-postConsumed,native.player.statuses.buffer or 0,pre.player.statuses.buffer or 0},','))
end
print('JADE_ORDER_PROBE_PASS: alternatives differ; neither order selected or integrated')
