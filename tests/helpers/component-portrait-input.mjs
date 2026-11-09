import {portraitSources} from '../../scripts/official-portraits.mjs';

// The production generator validates exact full-source hashes. Inject only its
// frozen literal block in this VM; never read or replace shared generated Lua.
export function componentPortraitInputPrelude(script,{cwd=process.cwd()}={}) {
  if(script!=='tests/lua/support/component_portrait_diagnosis.lua')return '';
  const source=portraitSources(cwd,{selectionAvatar:false,battlePortrait:true})[0];
  return `package.loaded.abyss_traveler_portrait_assets=(function()\n${source.literals}\nreturn {imagePrefabId=41,containerPrefabId=73,battle133={root=ROOT,rows=ELEMENTS,width=133,count=4315,runtimeV2=true,cache=true,sourceSha256='${source.runtime}',jsonSha256='${source.json}'}} end)();\n`;
}
