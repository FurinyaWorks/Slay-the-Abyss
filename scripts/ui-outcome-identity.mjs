import {createHash} from 'node:crypto';
import {basename} from 'node:path';

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
// Only the exact UUID print injected by build-native-candidate is provenance.
// Keep all other Lua bytes, including whitespace and other diagnostic prints.
const buildMarker=/^print\("ABYSS_BUILD [a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}"\)\n/;
export function outcomeConditions(save,mountedValues){
 const sources=save.assets.scripts.map(row=>({path:row.path,source:basename(row.path)==='abyss_ui.lua'?row.source.replace(buildMarker,''):row.source})).sort((a,b)=>a.path.localeCompare(b.path));
 const intervention=sources.filter(row=>basename(row.path)==='abyss_component_bridge.lua');
 const workload=sources.filter(row=>basename(row.path)!=='abyss_component_bridge.lua');
 const model=Object.fromEntries(Object.entries(save.assets).filter(([name])=>name!=='scripts').map(([name,value])=>{
  if(!['server','client'].includes(name)||!value.meta)return [name,value];
  const meta={...value.meta};delete meta.sourceFile;
  return [name,{...value,meta}];
 }));
 return {visualSha256:hash([save.assets.server.root,save.assets.client.root,workload,mountedValues]),
  loadSha256:hash([save.serverLogic,model,workload,mountedValues]),interventionSha256:hash(intervention)};
}
