-- Author's bounded ordinary draw/paid chain. Run only after shared domain routing is integrated.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local Run=require('abyss_run');local F=require('abyss_zhongli_sixteen_run')
local allowed={zl32=true,zl40=true,zl03=true,zl04=true,zl16=true,zl19=true,zl20=true,zl24=true,zl26=true,zl28=true,zl38=true,zl39=true,zl57=true,zl62=true,zl66=true,zl73=true}
local function choose(s,acquired,holdUid)
 local best,score
 for _,c in ipairs(s.hand)do if c.uid~=holdUid and C.canPlay(s,c.uid,1)then
  local rank=c.deckUid==acquired and 100 or c.cardId=='zl04'and 80 or c.cardId=='zl03'and(s.zhongliCandidate.jade<6 and 90 or 30)or c.cardId=='zl01'and 70 or c.cardId=='zl02'and 20 or 40
  if not score or rank>score then best,score=c,rank end
 end end
 return best
end
local function fight(r,acquired)
 local total=0;local retained=false;local holdUid
 for turn=1,16 do
  if r.phase~='combat'then return false,total end
  local count=0;holdUid=nil
  if acquired and not retained then for _,c in ipairs(r.combat.hand)do if c.deckUid==acquired and c.cardId=='zl40'then holdUid=c.uid end end end
  while r.phase=='combat'do
   local c=choose(r.combat,acquired,holdUid);if not c then break end
   local isAcquired=c.deckUid==acquired and acquired~=nil
   assert(Run.play(r,c.uid,1));count=count+1;total=total+1;assert(count<=100,'bounded action budget exceeded')
   if isAcquired then
    if c.cardId=='zl40'then local found=false;for _,v in ipairs(r.combat.exhaust)do if v.uid==c.uid then found=true end end;assert(found,'40 must exhaust after paid use');print('AUTHOR_40_EXHAUST uid='..c.uid..' retained='..tostring(retained))end
    return true,total end
  end
  if r.phase~='combat'then return false,total end
  assert(Run.endTurn(r))
  if holdUid and r.phase=='combat'then local found=false;for _,c in ipairs(r.combat.hand)do if c.uid==holdUid then found=true end end;assert(found,'40 retain UID lost');retained=true;print('AUTHOR_40_RETAIN uid='..holdUid)end
 end
 return false,total
end
local wins,played,losses,bounded=0,0,0,0
local covered={}
for seed=1,12 do
 local r=F.new(D,seed);assert(Run.startCombat(r,'cultist_solo'))
 local _,firstActions=fight(r,nil)
 if r.phase=='reward'and r.hp>0 then
  wins=wins+1;assert(#r.rewards.cards>0 and #r.rewards.cards<=16)
  local seen={};for _,id in ipairs(r.rewards.cards)do assert(allowed[id]and not seen[id]);seen[id]=true end
  local index=1;for i,id in ipairs(r.rewards.cards)do if (id=='zl32'or id=='zl40')and not covered[id]then index=i;break end end
  local id=r.rewards.cards[index];local upgrade=r.rewards.cardUpgrades and r.rewards.cardUpgrades[index]or false
  assert(Run.claimCardReward(r,index));local c=r.deck[#r.deck];assert(c.cardId==id and (c.upgraded==true)==upgrade);local deckUid=c.uid
  assert(Run.leaveCombatRewards(r));assert(Run.startCombat(r,'cultist_solo'));assert(r.combat.zhongliCandidate.jade==3)
  local used,secondActions=fight(r,deckUid)
  if used then played=played+1;covered[id]=true else bounded=bounded+1 end
  print('AUTHOR_GENERATED_SEED '..seed..' card='..id..' upgraded='..tostring(upgrade)..' used='..tostring(used)..' actions='..firstActions..'/'..secondActions..' persistentRunHp='..r.hp..' currentCombatHp='..tostring(r.combat and r.combat.player.hp))
 elseif r.phase=='combat'then bounded=bounded+1;print('AUTHOR_GENERATED_SEED '..seed..' firstFightBounded')
 else losses=losses+1;print('AUTHOR_GENERATED_SEED '..seed..' firstFightNotWon phase='..tostring(r.phase))end
end
assert(wins>0 and played>0,'no actual generated acquisition-to-play witness')
print('AUTHOR_ZL_SIXTEEN_DRAW_CHAIN_PASS seeds=1..12 firstWins='..wins..' acquiredPlayed='..played..' losses='..losses..' bounded='..bounded..'; covered32='..tostring(covered.zl32==true)..' covered40='..tostring(covered.zl40==true)..'; no offer/HP/energy/jade/hand rewrite, fixed cultist rooms not map or balance proof')

-- Native lethal32 non-retaliation is an existing paid-suite HOLD, not forced into this natural witness.
