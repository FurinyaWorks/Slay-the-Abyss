local W,Run,R,P=require('abyss_wheel_event'),require('abyss_run'),require('abyss_sts_random'),require('abyss_living_wall')
local function eq(a,b,label)assert(a==b,'WHEEL_SEMANTIC '..label)end
local function make(stage,outcome)
 local r={gold=10,hp=7,maxHp=16777219,miscRng={counter=0},deck={{uid=7}},relicPool={old=true}}
 local f={event={stage=stage,outcome=outcome,goldAmount=100,relicOffer={id='anchor'}}};r.nodeFlow=f
 return r,f,f.event
end
R.randomIntBetween=function(r,lo,hi)eq(lo,0,'rng low');eq(hi,5,'rng high');r.counter=r.counter+1;return 0 end
Run.gainGold=function(r,n)r.gold=r.gold+n;return n end
local r,f,e=make();assert(W.choose(r,f,'spin'));eq(r.miscRng.counter,1,'one draw');eq(r.gold,110,'gold preapply');eq(e.goldGained,100,'gold gained')
local before=r.gold;assert(W.choose(r,f,'accept'));eq(r.gold,before,'gold once')
r,f,e=make();eq(W.choose(r,f,'spin',7),false,'UID gate');eq(r.miscRng.counter,0,'UID no draw')
local pool={new=true};Run.prepareRelic=function()return {id='anchor'},pool end
r,f,e=make('wheel_result',1);assert(W.choose(r,f,'accept'));eq(r.relicPool,pool,'pool at reveal');assert(W.choose(r,f,'skip_relic'));eq(r.relicPool,pool,'pool on skip')
Run.obtainCard=function(_,id)eq(id,'Decay','source Decay');return true,'curse_blocked' end
r,f,e=make('wheel_result',3);assert(W.choose(r,f,'accept'));eq(e.obtainedCardUid,nil,'blocked uid');eq(e.curseBlocked,true,'Omamori')
Run.eventDamage=function(_,n)eq(n,1677722,'float32');return false,'damage_refused' end
r,f,e=make('wheel_result',5);local ok,why=W.choose(r,f,'accept');eq(ok,false,'damage refusal');eq(why,'damage_refused','damage reason');eq(e.damage,nil,'damage partial write')
P.purgeCards=function()return {{uid=7},{uid=8}}end
local seen=0;Run.removeCard=function(_,uid)seen=seen+1;eq(uid,7,'remove UID');return true end
r,f,e=make('choose_card',4);eq(W.choose(r,f,'purge',9),false,'eligibility');eq(seen,0,'no remove');assert(W.choose(r,f,'purge',7));eq(seen,1,'remove once');eq(e.removedUid,7,'removed UID')
Run.obtainRelic=function()return false,'relic_refused' end
r,f,e=make('relic_reward',1);ok,why=W.choose(r,f,'claim_relic');eq(ok,false,'relic refusal');eq(why,'relic_refused','relic reason');eq(e.obtainedRelicId,nil,'relic partial write')
print('WHEEL_SEMANTIC passed')
