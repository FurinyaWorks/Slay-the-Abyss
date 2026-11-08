import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {lightweightAssets} from './art/lightweight-2d-assets.mjs';
import {toLua} from './build-lua-data.mjs';

export const lightweightProfile='bounded-2d-v1';
export const lightweightInputs=['scripts/art/lightweight-2d-assets.mjs'];
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function boundedAssets(){
 const assets=lightweightAssets();
 for(const [name,a] of Object.entries(assets)){
  if(a.count!==a.rows.length||a.count<1||a.count>60||a.rows.some(r=>![18,20].includes(r.length)||r.some(v=>!Number.isFinite(v))))throw Error('Invalid bounded asset '+name);
  a.sourceSha256=a.jsonSha256=a.artworkSha256=hash(a.rows);
  if(name==='avatar96'||name==='battle133')a.renderProfile=lightweightProfile;
  delete a.identityMeaning;
 }
 return assets;
}
export function lightweightInventory(){
 const assets=Object.entries(boundedAssets()).map(([asset,a])=>({asset,images:a.count,groups:Math.ceil(a.count/60),pages:Math.ceil(a.count/3600),instances:asset==='lowpolyLand'?3:1,artworkSha256:a.artworkSha256}));
 return {renderProfile:lightweightProfile,assets,instances:assets.reduce((n,a)=>n+a.instances,0),batchSize:64,
  peakDynamicControls:assets.reduce((n,a)=>n+(a.images+a.groups+a.pages)*a.instances,0),maxDirectDynamicChildren:60,
  officialCapacity:'not_measured',measurement:'offline-runtime-control-contract-not-official-capacity',devicePerformance:'not_run'};
}
export function writeLightweightProfile(directory){
 writeFileSync(join(directory,'lightweight-2d.json'),JSON.stringify(lightweightInventory()));
}
export function isLightweightProfile(directory){
 const path=join(directory,'lightweight-2d.json');
 if(!existsSync(path))return false;
 if(JSON.stringify(JSON.parse(readFileSync(path,'utf8')))!==JSON.stringify(lightweightInventory()))throw Error('Bounded 2D profile identity differs');
 return true;
}
export function boundedPortraitSource(imagePrefabId,containerPrefabId){
 return `-- Original bounded geometry; actual row digests, no third-party artwork.\nreturn ${toLua({imagePrefabId,containerPrefabId,...boundedAssets()})}\n`;
}
