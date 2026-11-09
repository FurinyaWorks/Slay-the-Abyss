local source=REVIEW_SOURCE
local function encode(root,backs)
 local ids,nextid={},0
 local function enc(x)
  if type(x)~='table' then return type(x)..':'..tostring(x) end
  if ids[x] then return '@'..ids[x] end
  nextid=nextid+1;ids[x]=nextid
  local b=backs[x] or x;local keys={};for k in pairs(b)do keys[#keys+1]=k end
  table.sort(keys,function(a,b)return tostring(a)<tostring(b)end)
  local out={'#'..ids[x]..'{'};for _,k in ipairs(keys)do out[#out+1]=enc(k)..'='..enc(b[k])..';'end
  out[#out+1]='}';return table.concat(out)
 end
 return enc(root)
end
local function run(action,variant,stop)
 local trace,backs={},{};local count=0;local armed=false;local fault={sentinel=true}
 local function step(s) if not armed then return end;count=count+1;trace[#trace+1]=s;if count==stop or count>300 then error(fault)end end
 local function obj(name,b,dynamic)
  local p={};backs[p]=b;local counts={}
  return setmetatable(p,{__index=function(_,k)step('get:'..name..'.'..tostring(k));counts[k]=(counts[k]or 0)+1;if dynamic and dynamic[k] then return dynamic[k](counts[k],b[k])end;return b[k]end,
  __newindex=function(_,k,v)step('set:'..name..'.'..tostring(k)..':'..type(v));b[k]=v end,
  __len=function()step('len:'..name);return #b end})
 end
 local card={uid='c',uuid='same',cardId='genetic_algorithm',misc=1,combatCost=0};local card2={uid='d',cardId='other',combatCost=2};local ball={kind='lightning',v=7}
 local sb={player=obj('player',{id='p',statuses=obj('statuses',{corruption=variant==1 and 1 or 0})}),rules=obj('rules',{player=obj('playerRules',{maxHand=3})}),hand={card,card2},discard={card2,card},draw={card},orbs=obj('orbs',{balls={ball},slots=2}),shuffleRng={seed=9},cardRandomRng={seed=11},cardInUse=card,queuedCards={{card=card}},cardActions={{instance=card}}}
 if variant==2 then sb.hand=sb.discard;sb.draw=sb.hand end
 if variant==3 then sb.player=nil end
 if variant==4 then sb.orbs=nil end
 if variant==5 then sb.discard=nil end
 if variant==6 then sb.shuffleRng=nil end
 local state=obj('state',sb)
 local eb={action=action,cardId='generated',status='rebound',value=(action=='fission' and variant%2 or 2),ball=ball,uid='c'}
 if variant==7 then eb.value=nil;eb.cardId=nil;eb.status=nil end
 if variant==8 then eb.value='bad';eb.uid={};eb.status={} end
 local dynamic=variant==9 and {action=function(n,v)return n==1 and v or 'unknown' end,status=function(n,v)return n==1 and 'other' or v end} or nil
 local effect=obj('effect',eb,dynamic)
 local qb={};local q=obj('queue',{
 pushTop=function(s,v)step('call:top');table.insert(qb,1,v)end,
 pushBottom=function(s,v)step('call:bottom');qb[#qb+1]=v end})
 local combat=obj('combat',{
 draw=function(s,n)step('call:draw:'..tostring(n));return sb.hand end,
 cardDefinition=function(s,c)step('call:definition:'..c.uid);return obj('definition',{cost=c.combatCost})end,
 combatBaseCost=function(s,c)step('call:base:'..c.uid);return 0 end})
 local modules={
 abyss_copy={copy=function(c)local r={};for k,v in pairs(c)do r[k]=v end;return r end},
 abyss_events=obj('events',{emit=function(s,name,event)step('call:emit:'..name);sb.lastEvent=event or name end}),
 abyss_sts_random=obj('random',{shuffle=function(r,p)step('call:shuffle');r.seed=r.seed+1;for i=1,math.floor(#p/2)do p[i],p[#p+1-i]=p[#p+1-i],p[i]end end,
 randomInt=function(r,n)step('call:randomInt:'..n);r.seed=r.seed+1;return n end}),
 abyss_actor=obj('actor',{applyPower=function(s,t,k,n,src)step('call:applyPower');t.statuses[k]=n end}),abyss_power_schedule={},
 abyss_card_actions=obj('actions',{fresh=function(c,s,id)step('call:fresh:'..tostring(id));return card end,
 created=function(c,s,x)step('call:created');x.created=(x.created or 0)+1 end,
 toHand=function(s,x)step('call:toHand');s.hand[#s.hand+1]=x end}),
 abyss_corruption=obj('corruption',{created=function(s,c)step('call:corrupt');c.corrupted=true end}),
 abyss_hand_choice=obj('choice',{begin=function(s,k,n,q)step('call:choice');return nil,false,card,7 end}),
 abyss_orbs=obj('orbModule',{rechannel=function(s,b,c)step('call:rechannel');sb.rechanneled=b end})}
 local env=setmetatable({require=function(name)step('require:'..name);return assert(modules[name],name)end},{__index=_G})
 local m=assert(load(source,'review-module','t',env))();armed=true
 local result=table.pack(pcall(m.execute,combat,state,effect,q));armed=false
 if not result[1] then
  if result[2]==fault then result[2]='injected' else result[2]=tostring(result[2]):gsub('%[string "review%-module"%]:%d+: ',''):gsub(" %(local '[^']+'%)",''):gsub(" %(field '[^']+'%)",'') end
 end
 print(action..'/'..variant..'/'..stop..'|'..table.concat(trace,'>')..'|'..encode({state=state,effect=effect,queue=qb,result=result},backs))
 return count
end
for _,action in ipairs({'generate','white_noise','power','genetic','recursion','rechannel','recycle','scrape','all_for_one','discard_to_hand','fission','reboot','unknown'})do
 for variant=0,9 do local count=run(action,variant,0);for stop=1,count do run(action,variant,stop)end end
end
