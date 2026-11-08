local function equal(a,b,label)assert(a==b,'[REWARD_BOUNDARY] '..label..': '..tostring(a)..' ~= '..tostring(b))end
local function capture(label,...)REWARD_GRAPH_WRITE(table.pack(...),label,true)end
local Cards=require('abyss_relic_card_rewards')
local Choices=require('abyss_relic_choices')
local Pending=require('abyss_relic_pending')

if REWARD_GROUP=='cold'then
 local run={relics={'singing_bowl'},pendingBossRelic={cards={'strike'},cardUpgrades={true},token=9}}
 equal(Cards.managed(run),true,'cold query result')
 local view=Pending.view(run);equal(view.rows[2].token.choice,'bowl','cold Bowl option')
 equal(package.loaded.abyss_relic_hooks~=nil,REWARD_VARIANT=='old','only old query loads Session command facade')
 capture('cold-query',run,view)
 return
end

local Run=require('abyss_run')
if REWARD_GROUP=='cards'or REWARD_GROUP=='shop'then
 local function wrap(owner,key)
  local original=owner[key]
  owner[key]=function(...)
   local args=table.pack(...);capture(key..':enter',args)
   local result=table.pack(original(table.unpack(args,1,args.n)))
   capture(key..':leave',args,result)
   return table.unpack(result,1,result.n)
  end
 end
 for _,key in ipairs({'managed','prepareExtra','open','claim','close'})do wrap(Cards,key)end
 for _,key in ipairs({'createCardReward','openRewards','claim','finish','chooseMirror'})do wrap(Choices,key)end
 for _,key in ipairs({'view','resolve'})do wrap(Pending,key)end
 local fixture=REWARD_GROUP=='cards'and'tests/lua/relic_card_rewards.lua'or'tests/lua/shop_relics_acquisition.lua'
 dofile(fixture)
 capture('public-raw-contract',Cards,Choices,Pending,require('abyss_relic_hooks'))
 return
end

local Hooks=require('abyss_relic_hooks')
local Queries=require('abyss_relic_queries').hooks
local Rules=require('abyss_relic_family_combat').common
local Rare=require('abyss_rare_relics')
local Pool=require('abyss_card_pool')
local oldOwns,oldPreview=Queries.owns,Rules.previewCardReward
local oldPool,oldExtra=Pool.prepareRewards,Rare.extraCardRewards
local oldHp=Run.increaseMaxHp
capture('raw-provider-before',Cards,Choices,Pending,Hooks,Queries,Rules)

local run={relics={'singing_bowl'},trace={}}
equal(Cards.managed(run),true,'Bowl owns is not Prayer Wheel')
local function rows(label,value)
 local owner={token=3,cards={'strike'},cardUpgrades={true},kind='reward'}
 local r={relics={},trace={},pendingBossRelic=owner}
 Hooks.owns=function(state,id)state.trace[#state.trace+1]=id;return value end
 local view=Pending.view(r)
 equal(view.rows[2].token.choice,value and'bowl'or 0,'truthy Bowl option')
 capture(label,r,view)
end
rows('owns-false',false);rows('owns-truthy-number',0);rows('owns-truthy-string','yes')
local calls={}
Hooks.owns=function(state,id)calls[#calls+1]=id;return id=='singing_bowl'end
equal(Queries.owns,Hooks.owns,'facade ordinary write shares query slot')
equal(Cards.managed({rewards={cardRewardGroups={}}}),true,'managed short-circuit')
equal(#calls,0,'short-circuit has no ownership call')
local callable=setmetatable({calls=0},{__call=function(self,state,id)self.calls=self.calls+1;state.trace[#state.trace+1]=id;return true end})
Queries.owns=callable
equal(Hooks.owns,callable,'canonical callable visible on facade')
equal(Cards.managed(run),true,'callable query')
capture('callable-slot',run,callable)

local marker={kind='owns-failure'}
Hooks.owns=function(state,id)state.partial=id;error(marker)end
local failed=table.pack(pcall(Cards.managed,run));equal(failed[1],false,'query failure');equal(failed[2],marker,'query error identity')
capture('query-partial-failure',run,failed,marker)
Queries.owns=nil
local nilFailed=table.pack(pcall(Cards.managed,run));equal(nilFailed[1],false,'nil query is not defaulted')
capture('query-nil',run,nilFailed)
Hooks.owns=oldOwns;equal(Queries.owns,oldOwns,'query restoration')

-- Freeze the old request/commit order and every alias passed to preview.
local serial=0
Pool.prepareRewards=function(owner)
 serial=serial+1
 local cards={'strike','defend'};local upgrades={false,true}
 owner.trace[#owner.trace+1]={kind='pool',tier=owner.encounterTier,serial=serial,alias=owner.shared}
 return cards,{serial=serial,shared=owner.shared},serial,upgrades
end
Rare.extraCardRewards=function(owner,normal)owner.trace[#owner.trace+1]={kind='extra',normal=normal};return 2 end
local function second(owner,reward,skip)
 equal(skip,true,'preview preserves skip-upgraded flag')
 owner.trace[#owner.trace+1]={kind='preview-second',reward=reward,rng=owner.cardRng}
 reward.cardUpgrades[1]=true;return 'unused',nil,false
end
Hooks.previewCardReward=function(owner,reward,skip)
 equal(skip,true,'preview preserves skip-upgraded flag')
 owner.trace[#owner.trace+1]={kind='preview-first',reward=reward,rng=owner.cardRng}
 Hooks.previewCardReward=second
 reward.alias=owner.shared
end
local r={trace={},relics={'singing_bowl'},encounterTier='normal',shared={value=7},rewards={cards={'old'},cardUpgrades={false},cardResolved=false}}
Cards.prepareExtra(r)
equal(#r.rewards.cardRewardGroups,3,'two additional reward groups')
equal(r.trace[3].kind,'preview-first','first dynamic preview');equal(r.trace[5].kind,'preview-second','second dynamic preview')
capture('extra-commit-order',r)
local reward=Choices.createCardReward(r)
equal(r.trace[#r.trace-1].tier,'normal','shop shallow owner forces normal tier')
capture('shop-create',r,reward)

Hooks.previewCardReward=nil
local before=#r.rewards.cardRewardGroups
local previewNil=table.pack(pcall(Cards.prepareExtra,r));equal(previewNil[1],false,'nil preview fails')
equal(#r.rewards.cardRewardGroups,before,'failed preview not appended')
capture('preview-nil-partial',r,previewNil)
local previewMarker={kind='preview-failure'}
Rules.previewCardReward=function(owner,group)owner.partialGroup=group;error(previewMarker)end
local previewFailed=table.pack(pcall(Choices.createCardReward,r));equal(previewFailed[2],previewMarker,'preview error identity')
capture('preview-error-partial',r,previewFailed,previewMarker)
Hooks.previewCardReward=oldPreview;Pool.prepareRewards=oldPool;Rare.extraCardRewards=oldExtra

-- A nested permanent command may replace the graph. Claim must use its new owner.
local claimed={relics={'singing_bowl'},trace={},maxHp=80,hp=50,shopRelicRewards={token=4,items={{kind='card',reward={cards={'strike'},cardUpgrades={true}}}}}}
Run.increaseMaxHp=function(owner,n)
 owner.trace[#owner.trace+1]={'gain',n};owner.maxHp=owner.maxHp+n
 owner.shopRelicRewards={token=4,items={{kind='card',reward={cards={'strike'},cardUpgrades={true}}}}}
 return true,{granted=n}
end
local stale=claimed.shopRelicRewards
local result=table.pack(Choices.claim(claimed,4,1,'bowl'));equal(result[1],true,'Bowl claim succeeds')
equal(stale.items[1].claimed,nil,'old graph is not marked');equal(claimed.shopRelicRewards.items[1].claimed,true,'new graph is marked')
capture('nested-owner-replacement',claimed,stale,result)
Run.increaseMaxHp=oldHp

for _,kind in ipairs({'boss','shop','groups'})do
 local state={relics={'singing_bowl'},trace={}}
 if kind=='boss'then state.pendingBossRelic={token=8,cards={'a'},cardUpgrades={true}}
 elseif kind=='shop'then state.shopRelicRewards={token=8,items={{kind='card',reward={cards={'a'},cardUpgrades={true}}}}}
 else
  state.phase='reward';state.rewards={cardRewardGroups={{cards={'a'},cardUpgrades={true},resolved=false},{cards={'b'},resolved=true}}}
  state.pendingCardRewardSelection={token=8,rewardOwner=state.rewards}
 end
 local view=Pending.view(state);equal(view.rows[2].token.choice,'bowl','every reward owner retains Bowl option')
 capture('pending-'..kind,state,view)
end
capture('raw-provider-restored',Cards,Choices,Pending,Hooks,Queries,Rules)
print('REWARD_BOUNDARY_PASS dynamic')
