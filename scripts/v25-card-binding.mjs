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
export function v25CardBindingSource(prepared,indices,options={}){
 if((!prepared||!indices)&&!options.masks)return '-- Generated private card surface configuration.\nreturn {enabled=false}\n';
 indices={...indices,...options.maskIndices};
 const used=new Map();
 const index=name=>{
  const value=indices[name];
  if(!Number.isSafeInteger(value)||value<=0)throw Error('Missing V25 native template binding: '+name);
  if(used.has(value)&&used.get(value)!==name)throw Error('Duplicate V25 native template binding: '+name);
  used.set(value,name);
  return value;
 };
 const variants=prepared?Object.fromEntries(Object.entries(prepared.binding.variants).map(([kind,rarities])=>[kind,
  Object.fromEntries(Object.entries(rarities).map(([rarity,name])=>[rarity,index(name)]))])):{};
 const value={schemaVersion:1,enabled:!!prepared,...(prepared?{variants,
  manaTemplateId:index(prepared.binding.manaTemplateId),sourceManifestSha256:prepared.sourceManifestSha256}:{})};
 const data={...prepared?.textureData,...options.masks?.textureData};
 if(Object.keys(data).length){
  const {imageTemplateId,groupTemplateId}=options;
  if(![imageTemplateId,groupTemplateId].every(id=>Number.isSafeInteger(id)&&id>0)
   ||imageTemplateId===groupTemplateId)throw Error('Packed V25 textures require distinct image and group templates');
  value.textures=Object.fromEntries(Object.entries(data).map(([name,texture])=>[index(name),texture]));
  if(used.has(imageTemplateId)||used.has(groupTemplateId))throw Error('Packed V25 texture templates alias a root');
  value.renderProfile='source-rgba-packed-v1';value.imageTemplateId=imageTemplateId;value.groupTemplateId=groupTemplateId;
  if(options.masks){
   const names=Object.keys(options.masks.textureData??{});
   if(names.length!==1)throw Error('Packed V25 UI mask requires its one source texture');
   value.uiMask={templateId:index(names[0]),hostName:'v25Constellation',displaySize:[118,118]};
  }
 }
 return `-- Generated private card surface configuration.\nreturn ${toLua(value)}\n`;
}
export function writeV25CardBinding(directory,prepared,indices,options){
 const source=v25CardBindingSource(prepared,indices,options);writeFileSync(join(directory,v25CardModule+'.lua'),source);return source;
}
