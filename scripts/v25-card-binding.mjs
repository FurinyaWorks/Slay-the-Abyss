import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {fileRecord} from './evidence-files.mjs';
import {toLua} from './build-lua-data.mjs';

export const v25CardModule='abyss_v25_card_assets';
export function assertV25CardPreparation(prepared,inputs,templates){
 if(!prepared)return;
 if(!isDeepStrictEqual(prepared.inputs,inputs.slice(-prepared.inputs.length)))throw Error('Private V25 source snapshot differs from preparation');
 if(templates)for(const expected of prepared.templates){
  const matches=templates.filter(template=>template.name===expected.name);
  if(matches.length!==1||!isDeepStrictEqual(matches[0],expected))throw Error('Private V25 emitted template differs from preparation: '+expected.name);
 }
}
export function v25PrivateInputs(file,root=process.cwd()){
 const record=fileRecord(resolve(root,file));
 const pack=JSON.parse(readFileSync(record.path,'utf8'));
 if(pack.profile!=='v25-source-rgba-lossless-v1'||pack.licenseScope!=='private-local-only'||!Array.isArray(pack.inputs))throw Error('Expected private lossless V25 assets');
 return [record,...pack.inputs.map(input=>{
  if(typeof input?.path!=='string'||!/^[a-f0-9]{64}$/.test(input.sha256??''))throw Error('Invalid private V25 input identity');
  const actual=fileRecord(input.path);
  if(actual.sha256!==input.sha256||actual.bytes!==input.bytes)throw Error('Private V25 source changed: '+input.path);
  return actual;
 })];
}
export function v25CardBindingSource(prepared,indices){
 if(!prepared||!indices)return '-- Generated private card surface configuration.\nreturn {enabled=false}\n';
 const used=new Map();
 const index=name=>{
  const value=indices[name];
  if(!Number.isSafeInteger(value)||value<=0)throw Error('Missing V25 native template binding: '+name);
  if(used.has(value)&&used.get(value)!==name)throw Error('Duplicate V25 native template binding: '+name);
  used.set(value,name);
  return value;
 };
 const variants=Object.fromEntries(Object.entries(prepared.binding.variants).map(([kind,rarities])=>[kind,
  Object.fromEntries(Object.entries(rarities).map(([rarity,name])=>[rarity,index(name)]))]));
 return `-- Generated private card surface configuration.\nreturn ${toLua({schemaVersion:1,enabled:true,variants,
  manaTemplateId:index(prepared.binding.manaTemplateId),sourceManifestSha256:prepared.sourceManifestSha256})}\n`;
}
export function writeV25CardBinding(directory,prepared,indices){
 const source=v25CardBindingSource(prepared,indices);writeFileSync(join(directory,v25CardModule+'.lua'),source);return source;
}
