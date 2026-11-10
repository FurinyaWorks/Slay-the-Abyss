import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {v25CardBindingSource} from '../../scripts/v25-card-binding.mjs';
import {compileRgbaRectangles} from '../../scripts/v25-private-card-assets.mjs';

// Both real Lua entry points exercise the actual JavaScript serializer using
// the same six source pixels. Other paths/workspaces receive no fixture state.
const root=fileURLToPath(new URL('../..',import.meta.url));
export function v25TextureBindingPrelude(script,{cwd=process.cwd()}={}){
 if(script!=='tests/lua/v25_texture_runtime.lua'||resolve(cwd)!==resolve(root))return '';
 const packed=compileRgbaRectangles({width:3,height:2,rgba:Uint8Array.from([255,0,0,255,0,255,0,128,10,20,30,0,255,0,0,255,0,0,255,64,0,0,255,64])});
 const texture={width:packed.width,height:packed.height,blocks:packed.blocks,count:packed.count,drawCount:packed.drawCount,display:{position:[.5,2],size:[3,2]}};
 const binding=v25CardBindingSource({binding:{variants:{attack:{common:'shell'}},manaTemplateId:'mana'},textureData:{shell:texture,mana:texture},sourceManifestSha256:'a'.repeat(64)},
  {shell:101,mana:102},{imageTemplateId:41,groupTemplateId:73});
 return `GENERATED_BINDING=(function()\n${binding}\nend)()\n`;
}
