import {portraitSources} from '../../scripts/official-portraits.mjs';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {toLua} from '../../scripts/build-lua-data.mjs';
import {v25Theme} from '../../scripts/v25-layout.mjs';
import {v25PortraitRuntimeProfile} from '../../scripts/v25-portrait-profile.mjs';

// The production generator validates exact full-source hashes. Inject only its
// frozen literal block in this VM; never read or replace shared generated Lua.
export function componentPortraitInputPrelude(script,{cwd=process.cwd(),nativeLifecycle=false}={}) {
  if(script!=='tests/lua/support/component_portrait_diagnosis.lua')return '';
  const source=portraitSources(cwd,{selectionAvatar:false,battlePortrait:true})[0];
  const profile=nativeLifecycle?`,v25PortraitProfile=${toLua(v25PortraitRuntimeProfile(v25Theme(JSON.parse(readFileSync(join(cwd,'data/presentation/ui_theme.json'),'utf8')))))}`:'';
  return `package.loaded.abyss_traveler_portrait_assets=(function()\n${source.literals}\nreturn {imagePrefabId=41,containerPrefabId=73,battle133={root=ROOT,rows=ELEMENTS,width=133,count=4315,runtimeV2=true,cache=true,sourceSha256='${source.runtime}',jsonSha256='${source.json}'}${profile}} end)();\n`;
}
