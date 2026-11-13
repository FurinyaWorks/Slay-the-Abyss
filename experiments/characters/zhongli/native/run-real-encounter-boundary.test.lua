package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local Run=require('abyss_run');local C,D=H.C,H.Data
for _,id in ipairs({'cultist_solo','jaw_solo','louse_pair','small_slimes'})do
 local r=Run.new(D,37,{experimental=true,candidateLifecycle={kind='zhongli',relicEnabled=false}});local before=C.copy(r)
 local ok,why=Run.startCombat(r,id)
 if id=='louse_pair'or id=='small_slimes'then assert(ok==false and why=='unsupported_zhongli_encounter');H.same(r,before)else assert(ok==true and #r.combat.enemies==1)end
 print('ACTUAL_ENCOUNTER_BOUNDARY',id,tostring(ok),tostring(why))
end
