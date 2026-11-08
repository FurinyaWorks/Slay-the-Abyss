package.path="src/lua/?.lua;build/lua/?.lua;"..package.path
-- This harness traces reads as well as writes: replacing ordered policy tests
-- with a cached kind/table dispatch is an observable change.
local trace, ids, backing, callbacks = {}, {}, {}, {}
local fault
local function value(v)
    if type(v)=="table" then return ids[v] or "table" end
    if type(v)=="function" then return callbacks[v] or "unnamed callback" end
    return tostring(v)
end
local function log(...) local a={...};for i=1,#a do a[i]=value(a[i]) end;trace[#trace+1]=table.concat(a,"|") end
local function proxy(data, name)
    local p={};ids[p]=name;backing[p]=data
    return setmetatable(p,{
        __index=function(_,k)log("read",name,k,data[k]);return data[k]end,
        __newindex=function(_,k,v)log("write",name,k,v);data[k]=v end,
        __len=function()return #data end,
    })
end
-- Complete graph serialization includes alias identity and nested state; proxy
-- storage is inspected without introducing extra reads into the behavior trace.
local function graph(root)
    local seen, nextId={},0
    local function visit(v)
        if type(v)~="table" then return type(v)..":"..value(v) end
        if seen[v]then return "ref:"..seen[v]end
        nextId=nextId+1;seen[v]=nextId
        local out={"table:"..nextId..":"..(ids[v]or "")}
        local keys
        local data=backing[v]or v
        keys={};for k in pairs(data)do keys[#keys+1]=k end
        table.sort(keys,function(a,b)return type(a)..tostring(a)<type(b)..tostring(b)end)
        for _,k in ipairs(keys)do out[#out+1]=visit(k).."="..visit(data[k])end
        return "{"..table.concat(out,",").."}"
    end
    return visit(root)
end
local modules={"awakened_one","nemesis","reptomancer","darklings","act3_bosses","act1_bosses",
"guardian_ai","jaw_worm_ai","gremlin_nob_ai","blue_slaver_ai","red_slaver_ai","acid_slime_s_ai",
"sentry_ai","spike_slime_m_ai","acid_slime_m_ai","fungi_beast_ai","louse_ai","looter_ai","act2_ai",
"act3_ai","giant_head","act2_powers","act4_enemies","event_combat_enemies"}
for _,name in ipairs(modules)do
    package.loaded["abyss_"..name]=setmetatable({
        owns=function(e)log("owns",name);return e.owners[name] or false end,
    },{__index=function(_,method)return function(...)
        log("call",name,method,...)
        log("arguments",graph(table.pack(...)))
        local args={...}; if type(args[2])=="table" then args[2].delegated=name..":"..method end
        if fault=="delegate"then error("injected delegate",0)end
        local shared={owner=args[2],payload={kind=name,method=method}}
        return nil,false,shared,shared,nil,name..":"..method,nil
    end end})
end
package.loaded.abyss_actor={
    applyPower=function(s,e,id,n,source)log("power",s,e,id,n,source);if fault=="power"then error("injected power",0)end;e.power=n end,
    block=function(s,e,n,retain)log("block",s,e,n,retain);if fault=="block"then error("injected block",0)end;e.block=n end,
    isActive=function(e)log("active",e);return e.hp>0 end,
}
package.loaded.abyss_events={emit=function(s,kind,payload)log("event",s,kind,payload.enemy,payload.reason,payload.id);if fault=="event"then error("injected event",0)end end}
local AI=require("abyss_enemy_ai")
local function random(s,n)log("random",s,n);if fault=="random"then error("injected random",0)end;s.draws=s.draws+1;return n end
callbacks[random]="random"
callbacks[package.loaded.abyss_actor.applyPower]="Actors.applyPower"
local kinds={"rolled_attack","opening_roll_attack","shield_gremlin","mad_gremlin","charge_then_attack",
"jaw_worm","gremlin_nob","blue_slaver","red_slaver","acid_slime_s","sentry","spike_slime_m","spike_slime_l",
"acid_slime_m","acid_slime_l","fungi_beast","louse","ritual_then_attack","guardian","sleep_then_cycle",
"giant_head","nemesis","act3_boss","act1_boss","act3","act2","looter","unknown",false}
local count=0
local function scenario(kind,owner,mode)
    trace={};count=count+1;fault=mode and mode:match("^fail%-(.+)$")
    local ai=proxy({kind=kind,rollRange=100,attackIntent="attack",protectIntent="protect",angryStacks=3,
        initialCharge=0,chargeIntent="charge",chargeLimit=2,ritualIntent="ritual",sleepIntent="sleep",
        sleepBlock=8,sleepTurns=3,awakeCycle={"attack","protect"},stunnedIntent="stunned"},"ai")
    local intents={}
    for i,id in ipairs({"attack","protect","charge","ritual","sleep","stunned"})do intents[i]={id=id}end
    local owners={};if owner then for _,name in ipairs(owner)do owners[name]=true end end
    local e=proxy({ai=kind and ai or nil,owners=owners,id="enemy",intents=intents,intentIndex=1,
        hp=10,maxHp=10,aiPhase="sleep",aiTurns=0,aiCycle=1,aiCharge=0},"enemy")
    local ally=proxy({hp=10},"ally")
    local s=proxy({enemies={e,ally},draws=0},"state")
    if mode=="missing-intent"then ai.attackIntent="missing" end
    if mode=="empty-cycle"then ai.awakeCycle={} end
    local function invoke(method,...)
        local result=table.pack(pcall(AI[method],s,e,random,...))
        log("result",method,result.n)
        for i=1,result.n do
            -- Source line locations change when responsibility functions move.
            local v=result[i]
            if not result[1] and type(v)=="string"then v=v:gsub("^[^:]+:%d+: ","")end
            result[i]=v
            log("return",i,v)
        end
        log("return-graph",graph(result))
        log("state-graph",graph(s))
        return result
    end
    if fault then
        if fault=="event"then e.aiTurns=2 end
        local result=invoke(fault=="event" and "advance" or "initialize")
        assert(result.n==2 and not result[1] and result[2]=="injected "..fault,"[ENEMY_LIFECYCLE] exact thrown callback")
        if fault=="random"then assert(s.draws==0 and e.aiCharge==0 and e.intentIndex==1,"[ENEMY_LIFECYCLE] no writes after failed draw")
        elseif fault=="block"then assert(s.draws==1 and e.aiPhase=="sleep" and e.intentIndex==5 and e.block==nil,"[ENEMY_LIFECYCLE] sleep partial state")
        elseif fault=="power"then assert(s.draws==1 and e.intentIndex==1 and e.power==nil,"[ENEMY_LIFECYCLE] power partial state")
        elseif fault=="event"then assert(s.draws==0 and e.aiPhase=="awake" and e.aiTurns==3 and e.intentIndex==1,"[ENEMY_LIFECYCLE] wake partial state")
        else assert(e.delegated=="jaw_worm_ai:initialize","[ENEMY_LIFECYCLE] delegated partial state")end
    elseif mode=="after" then
        e.hp=0
        invoke("afterAction",{kind="split"})
        invoke("afterAction",{kind="attack"})
    elseif mode=="phase" or mode=="empty-cycle" then
        for _,phase in ipairs({"sleep","stunned","awake","unknown"})do
            e.aiPhase=phase;e.aiTurns=1
            invoke("advance");invoke("advance")
        end
    else
        local result=invoke("initialize")
        if not mode and kind=="jaw_worm"then
            assert(result.n==8 and result[1] and result[2]==nil and result[3]==false and result[4]==result[5] and result[4].owner==e and result[6]==nil and result[8]==nil,"[ENEMY_LIFECYCLE] full delegated packed return")
        end
        if not mode and not owner and (not kind or kind=="rolled_attack" or kind=="opening_roll_attack" or kind=="shield_gremlin" or kind=="mad_gremlin" or kind=="charge_then_attack" or kind=="ritual_then_attack" or kind=="sleep_then_cycle")then
            assert(result.n==1 and result[1],"[ENEMY_LIFECYCLE] exact no-return arity")
        end
        if mode=="missing-intent"then assert(result.n==2 and not result[1] and result[2]=="unknown AI intent: missing","[ENEMY_LIFECYCLE] unknown intent error")end
        if kind=="unknown" and not owner then assert(not result[1] and tostring(result[2]):find("unsupported enemy AI"),"[ENEMY_LIFECYCLE] unsupported")end
        if not owner and (kind=="rolled_attack" or kind=="opening_roll_attack" or kind=="shield_gremlin" or kind=="mad_gremlin" or kind=="charge_then_attack" or kind=="ritual_then_attack" or kind=="sleep_then_cycle")then
            assert(s.draws==1,"[ENEMY_LIFECYCLE] inherited opening roll")
        end
        for _=1,4 do invoke("advance")end
        if kind=="shield_gremlin" and not owner then
            ally.hp=0;invoke("advance");ally.hp=10;invoke("advance")
            assert(e.intentIndex==1 and s.draws==1,"[ENEMY_LIFECYCLE] shield permanent Bash")
        end
        if kind=="charge_then_attack" and not owner then
            e.intentIndex=1;AI.beforeAction(s,e,random,{kind="attack"});assert(e.aiCharge==0,"[ENEMY_LIFECYCLE] reset before action")
        end
    end
    if ABYSS_ENEMY_TRACE then
        print("CASE "..count.." "..tostring(kind).." "..tostring(mode))
        print(table.concat(trace,"\n"))
    end
end
for _,kind in ipairs(kinds)do scenario(kind);scenario(kind,nil,"after")end
for _,name in ipairs({"event_combat_enemies","act4_enemies","darklings","awakened_one","reptomancer"})do
    scenario("jaw_worm",{name});scenario("jaw_worm",{name},"after")
end
scenario("giant_head",{"event_combat_enemies","act4_enemies","darklings","awakened_one","reptomancer"})
scenario("giant_head",{"reptomancer"})
scenario("sleep_then_cycle",nil,"phase")
scenario("unknown",nil,"phase")
scenario("rolled_attack",nil,"missing-intent")
scenario("sleep_then_cycle",nil,"empty-cycle")
scenario("charge_then_attack",nil,"fail-random")
scenario("sleep_then_cycle",nil,"fail-block")
scenario("mad_gremlin",nil,"fail-power")
scenario("sleep_then_cycle",nil,"fail-event")
scenario("jaw_worm",nil,"fail-delegate")
print("ENEMY_LIFECYCLE_PASS "..count)
