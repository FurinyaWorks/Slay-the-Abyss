local U=require('abyss_uncommon_relics')
package.preload.abyss_run=function()error('healing should not initialize Run gameplay orchestration')end
local r={hp=20,maxHp=80,relics={'meat_on_the_bone'},phase='reward'}
U.battleEnd(r);assert(r.hp==32 and package.loaded.abyss_run==nil)
print('COLD_PERMANENT_HEAL_INDEPENDENT')
