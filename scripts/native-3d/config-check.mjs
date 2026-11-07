import {writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {runLua} from '../test-lua.mjs';
import {sha256} from '../evidence-files.mjs';

export function verifyNativeConfig(scripts,workspace){
 const names=['abyss_native_battle_config','abyss_native_battle','abyss_native_battle_geometry','abyss_native_projection'];
 const selected=names.map(name=>{
  const matches=scripts.filter(s=>s.name===name);
  if(matches.length!==1||typeof matches[0].source!=='string')throw Error('Missing unique native configuration/runtime: '+name);
  return matches[0];
 });
 const preloads=selected.map(s=>`package.preload['${s.name}']=function()\n${s.source}\nend`).join('\n');
 const source=preloads+`
local config=require('abyss_native_battle_config')
local Native=require('abyss_native_battle')
local Geometry=require('abyss_native_battle_geometry')
assert(#config.models==9 and config.maxActors==5,'production model/slot coverage changed')
for i,model in ipairs(config.models)do
 assert(model.model==i,'model IDs must remain one-based numeric indices')
 assert(type(config.bodies[i])=='table','numeric body entry missing for model '..i)
 assert(type(config.projections.models[i])=='table','numeric projection model entry missing for model '..i)
 for slot=1,config.maxActors do assert(type(config.projections.models[i][slot])=='table','numeric projection entry missing')end
end
for id,index in pairs(config.enemyModels)do
 assert(config.models[index] and config.bodies[index] and config.projections.models[index],'unresolved enemy model: '..id)
end
local cases=0
for _,model in ipairs(config.models)do
 local definition
 for id,value in pairs(config.enemyModels)do if value==model.model then definition=id end end
 assert(definition,'each configured model needs a real enemy mapping')
 local enemies={}
 for i=1,config.maxActors do enemies[i]={id='wire_'..model.model..'_'..i,definitionId=definition,hp=20}end
 local battle={player={id='player'},enemies=enemies}
 local requests={}
 local view={run={phase='combat',combat=battle},battleUI={},refresh=function()end}
 local adapter=Native.attach(view,{GetChild=function()end},{config=config,log=function()end,
  send=function(command,modelId,actor,seq)requests[#requests+1]={command=command,actor=actor,seq=seq}end})
 adapter:resize(1600,900);adapter:update(.01)
 assert(#requests==config.maxActors,'all configured native actors initialize')
 for i=config.maxActors,1,-1 do
  local request=requests[i];assert(request.command=='show')
  assert(adapter:ack('ready',request.seq))
  local feet=config.worldFeet[i]
  assert(adapter:position(i,request.seq,feet[1],feet[2],feet[3]))
  assert(Geometry.get(enemies[i]),'native actor must have a projected target')
 end
 assert(adapter:position(0,requests[1].seq,config.heroFeet[1],config.heroFeet[2],config.heroFeet[3]))
 local before=Geometry.get(enemies[1])
 assert(adapter:position(-1,requests[1].seq,config.camera.focus[1],config.camera.focus[2]+.3,config.camera.focus[3]))
 assert(Geometry.get(enemies[1]).y~=before.y,'camera receipt must reproject targets')
 before=Geometry.get(enemies[1])
 adapter:resize(1280,960);adapter:update(.01)
 assert(Geometry.get(enemies[1]).y~=before.y,'4:3 resize must reproject targets')
 adapter:destroy()
 assert(not Geometry.get(enemies[1]),'destroy must clear targets')
 cases=cases+1
end
print('NATIVE_SERIALIZED_CONFIG_PASS models='..cases..' slots='..config.maxActors)
`;
 mkdirSync(workspace,{recursive:true});
 const path=join(workspace,'serialized-native-config-check.lua');writeFileSync(path,source);
 const result=runLua(path,{timeout:30000});
 const receipt={ok:result.status===0&&result.stdout.includes('NATIVE_SERIALIZED_CONFIG_PASS'),
  status:result.status,stdout:result.stdout,stderr:result.stderr,
  inputs:selected.map(s=>({name:s.name,sha256:sha256(s.source)})),
  scope:'Fengari executes final embedded Lua configuration/runtime across every model and five slots; not official LuaHost/graphics evidence'};
 writeFileSync(join(workspace,'serialized-native-config-check.json'),JSON.stringify(receipt,null,2));
 if(!receipt.ok)throw Error('Serialized native configuration runtime rejected: '+result.stdout+result.stderr);
 return receipt;
}
