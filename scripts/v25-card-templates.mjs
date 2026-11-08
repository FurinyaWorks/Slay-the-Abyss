// Native template preparation only. Private texture data stays in caller-owned
// build artifacts; templates are instantiated lazily by the runtime integrator.
import {readFileSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {fileRecord,inside} from './evidence-files.mjs';
import {decodeRgbaRectangles,compilePrivateCardAssets} from './v25-private-card-assets.mjs';

const logicalSize=[150,210],kinds=['attack','skill','power'],rarities=['basic','common','uncommon','rare'];
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const normalized=value=>value.replaceAll('\\','/');
const pair=value=>Array.isArray(value)&&value.length===2&&value.every(Number.isFinite);
function relativeSource(path){
 if(typeof path!=='string'||!path||isAbsolute(path)||/^[a-z]:/i.test(path)||path.split(/[\\/]/).some(part=>part==='..'||part===''))throw Error('Invalid private source path');
 return normalized(path);
}
function readInputs(pack,file,root){
 if(!Array.isArray(pack.inputs)||!pack.inputs.length)throw Error('Missing private source input identities');
 const records=new Map([[file.path,file]]);
 for(const row of pack.inputs){
  if(typeof row?.path!=='string'||!digest(row.sha256)||!Number.isSafeInteger(row.bytes)||row.bytes<0)throw Error('Invalid private source identity');
  const record=fileRecord(resolve(root,row.path),root);
  if(record.sha256!==row.sha256||record.bytes!==row.bytes)throw Error('Private source input hash differs');
  if(records.has(record.path))throw Error('Duplicate private source identity');
  records.set(record.path,record);
 }
 return records;
}
function sourceContract(pack,records,root){
 const first=pack.inputs[0],manifestPath=inside(root,resolve(root,first.path));
 const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
 if(manifest.schemaVersion!==1||manifest.sourceSiteVersion!==25||manifest.privateSourceCommit!==pack.privateSourceCommit
  ||!isDeepStrictEqual(manifest.cardShells?.variants,pack.cardShells?.variants)
  ||manifest.cardShells?.mana!==pack.cardShells?.mana||manifest.cardShells?.costBakedIntoShell!==false)
  throw Error('Compiled card bindings differ from their pinned source manifest');
 const key=Object.values(manifest.cardShells.variants.attack)[0],asset=pack.assets[key],suffix='/'+relativeSource(asset?.source);
 const source=[...records.values()].find(row=>normalized(row.path).endsWith(suffix)&&row.sha256===asset.sourceSha256);
 if(!source)throw Error('Card source lacks a matching pinned input');
 const inputRoot=inside(root,resolve(normalized(source.path).slice(0,-suffix.length)));
 const relativeManifest=relativeSource(relative(inputRoot,manifestPath));
 return {manifestSha256:first.sha256,inputRoot,relativeManifest};
}
function requiredKeys(pack){
 if(!isDeepStrictEqual(pack.cardShells?.logicalSize,logicalSize)||pack.cardShells.costBakedIntoShell!==false)throw Error('V25 card root must preserve 150 by 210 live-text geometry');
 const result=[];
 for(const kind of kinds)for(const rarity of rarities){
  const key=pack.cardShells.variants?.[kind]?.[rarity];
  if(typeof key!=='string'||!Object.hasOwn(pack.assets,key))throw Error('Missing V25 card binding');
  if(!result.includes(key))result.push(key);
 }
 const mana=pack.cardShells.mana;
 if(typeof mana!=='string'||!Object.hasOwn(pack.assets,mana))throw Error('Missing V25 mana binding');
 if(result.includes(mana))throw Error('Mana must retain its independent template');
 result.push(mana);return result;
}
function geometry(asset){
 if(asset.lossless!==true||asset.alphaExact!==true||asset.coverageExact!==true||asset.transparentRgbPreserved!==true
  ||asset.sampling?.scale!==1||asset.sampling?.method!=='none')throw Error('V25 templates require the lossless original RGBA profile');
 if(!isDeepStrictEqual(asset.logicalCardSize,logicalSize)||!isDeepStrictEqual(asset.sampleSize,[asset.width,asset.height])
  ||!pair(asset.logicalCardSourceTopLeft)||!pair(asset.display?.position)||!isDeepStrictEqual(asset.display?.size,[asset.width,asset.height]))
  throw Error('Invalid V25 source geometry');
 const [x,y]=asset.logicalCardSourceTopLeft;
 const expected=[asset.width/2-x-logicalSize[0]/2,logicalSize[1]/2-asset.height/2+y];
 if(expected.some((value,index)=>Math.abs(value-asset.display.position[index])>1e-9))throw Error('V25 display does not retain source crop geometry');
 if(!digest(asset.sourceSha256)||!digest(asset.rgbaSha256)||!digest(asset.blocksSha256))throw Error('Missing V25 source pixel hashes');
}
function frame(asset){
 const blocks=asset.blocks,images=[];
 for(let i=0;i<asset.count;i++){
  const row=blocks.slice(i*24,(i+1)*24),[x,y,w,h]=[0,4,8,12].map(at=>parseInt(row.slice(at,at+4),16)),alpha=parseInt(row.slice(22,24),16);
  if(alpha===0)continue; // Exact RGBA identity was checked; transparent RGB needs no control.
  images.push({name:'pixel'+(i+1),kind:'image',image:100001,visible:true,focusable:false,
   position:[asset.display.position[0]-asset.width/2+x+w/2,asset.display.position[1]+asset.height/2-y-h/2],
   size:[w,h],colour:'#'+row.slice(16,22),opacity:alpha/255});
 }
 if(images.length!==asset.drawCount)throw Error('Visible rectangle count differs from the source');
 return images;
}
function level(nodes,prefix){
 const result=[];
 for(let i=0;i<nodes.length;i+=60)result.push({name:prefix+(result.length+1),kind:'container',position:[0,0],size:[...logicalSize],visible:true,focusable:false,children:nodes.slice(i,i+60)});
 return result;
}
function template(name,images){
 let pages=level(level(images,'group'),'page'),depth=0;
 while(pages.length>60)pages=level(pages,'section'+(++depth)+'_');
 // Container bounds describe coordinates; no mask clips the card's source overflow.
 return {name,kind:'container',position:[0,0],size:[...logicalSize],visible:false,focusable:false,children:pages};
}
function assetMetadata(asset,name){
 return {templateName:name,width:asset.width,height:asset.height,count:asset.count,drawCount:asset.drawCount,
  sourceSha256:asset.sourceSha256,rgbaSha256:asset.rgbaSha256,blocksSha256:asset.blocksSha256,
  logicalCardSize:[...asset.logicalCardSize],logicalCardSourceTopLeft:[...asset.logicalCardSourceTopLeft],display:structuredClone(asset.display)};
}

export function prepareV25CardTemplates(file,{root=process.cwd()}={}){
 const sourceFile=fileRecord(resolve(root,file),root),pack=JSON.parse(readFileSync(sourceFile.path,'utf8'));
 if(pack.schemaVersion!==1||pack.profile!=='v25-source-rgba-lossless-v1'||pack.licenseScope!=='private-local-only'||pack.sourceSiteVersion!==25
  ||!pack.assets||Array.isArray(pack.assets))throw Error('Expected pinned private lossless V25 card assets');
 const records=readInputs(pack,sourceFile,root),keys=requiredKeys(pack);
 for(const key of keys){geometry(pack.assets[key]);decodeRgbaRectangles(pack.assets[key]);}
 const contract=sourceContract(pack,records,root);
 // Freshly reconstruct PNG pixels from the pinned source, so recomputed hashes
 // on a modified/lossy compiled file cannot masquerade as original source RGBA.
 const fresh=compilePrivateCardAssets({inputRoot:contract.inputRoot,manifest:contract.relativeManifest,manifestSha256:contract.manifestSha256,keys});
 const templates=[],assets={},names=new Map();
 for(const key of keys){
  const asset=pack.assets[key],original=fresh.assets[key];
  if(asset.sourceSha256!==original.sourceSha256||asset.rgbaSha256!==original.rgbaSha256||!isDeepStrictEqual(asset.display,original.display)
   ||!isDeepStrictEqual(asset.logicalCardSourceTopLeft,original.logicalCardSourceTopLeft))throw Error('Compiled RGBA or geometry differs from the pinned PNG source');
  const name='AbyssV25Card'+(templates.length+1);names.set(key,name);
  templates.push(template(name,frame(asset)));assets[key]=assetMetadata(asset,name);
 }
 const variants=Object.fromEntries(kinds.map(kind=>[kind,Object.fromEntries(rarities.map(rarity=>[rarity,names.get(pack.cardShells.variants[kind][rarity])]))]));
 for(const record of records.values())if(fileRecord(record.path,root).sha256!==record.sha256)throw Error('V25 source hash changed during template preparation');
 return {templates,binding:{schemaVersion:1,enabled:true,variants,manaTemplateId:names.get(pack.cardShells.mana)},
  inputs:[...records.values()],sourceManifestSha256:contract.manifestSha256,assets,
  privateInputRoot:contract.inputRoot,manifestRelativePath:contract.relativeManifest,
  verification:{sourceRgba:'fresh PNG decode and byte-exact rectangle validation',nativeImport:'not_run',devicePerformance:'not_run'}};
}
