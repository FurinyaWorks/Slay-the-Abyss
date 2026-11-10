// Rebase hash-pinned private inputs into a caller-created source snapshot.
// The audit caller authenticates the git archive SHA; this helper only owns
// fresh local .artifacts outputs and never changes original sources or Git.
import {readFileSync,writeFileSync,copyFileSync,mkdirSync,lstatSync,statSync,realpathSync,constants} from 'node:fs';
import {resolve,join,relative,isAbsolute,dirname} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {inside,fileRecord,sha256} from './evidence-files.mjs';
import {prepareV25CardTemplates} from './v25-card-templates.mjs';

const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const identity=path=>process.platform==='win32'?resolve(path).toLowerCase():resolve(path);
function entry(path){try{return lstatSync(path);}catch(error){if(error.code==='ENOENT')return null;throw error;}}
function contains(root,path){const rel=relative(root,path);return rel===''||rel!=='..'&&!rel.startsWith('..\\')&&!rel.startsWith('../')&&!isAbsolute(rel);}
function relativeInput(root,path){
 const rel=relative(root,path);
 if(!rel||!contains(root,path)||rel.split(/[\\/]/).some(part=>part==='..'||part===''))throw Error('Private input escapes its declared root');
 return rel;
}
function record(expected,root){
 if(typeof expected?.path!=='string'||!digest(expected.sha256)||!Number.isSafeInteger(expected.bytes)||expected.bytes<0)throw Error('Invalid V25 receipt input record');
 const actual=fileRecord(resolve(root,expected.path),root);
 if(actual.sha256!==expected.sha256||actual.bytes!==expected.bytes)throw Error('V25 receipt input hash or byte count differs');
 return actual;
}
function sameRecord(first,second){return first.path===second.path&&first.sha256===second.sha256&&first.bytes===second.bytes;}
function receiptInputs(rows,root){
 if(!Array.isArray(rows)||!rows.length)throw Error('Missing V25 receipt inputs');
 const result=new Map();
 for(const row of rows){const actual=record(row,root);if(result.has(actual.path))throw Error('Duplicate V25 receipt input');result.set(actual.path,actual);}
 return result;
}
function indices(values){
 if(!values||Array.isArray(values)||typeof values!=='object')throw Error('Missing V25 template indices');
 const entries=Object.entries(values),numbers=entries.map(([,value])=>value);
 if(!entries.length||numbers.some(value=>!Number.isSafeInteger(value)||value<1)||new Set(numbers).size!==numbers.length)throw Error('V25 template indices must be unique positive integers');
 return entries.map(([name])=>name).sort();
}
function verifyReceipt(receipt,root){
 const assets=receipt?.v25CardAssets;
 if(!assets||!digest(assets.sourceManifestSha256))throw Error('Missing V25 private card receipt');
 const assetFile=record(assets.assetFile,root),expected=receiptInputs(assets.inputs,root),names=indices(assets.templateIndices);
 const prepared=prepareV25CardTemplates(assetFile.path,{root});
 if(!sameRecord(assetFile,prepared.inputs[0])||expected.size!==prepared.inputs.length
  ||prepared.inputs.some(row=>!expected.has(row.path)||!sameRecord(row,expected.get(row.path))))throw Error('V25 receipt input set differs from fresh sources');
 if(prepared.sourceManifestSha256!==assets.sourceManifestSha256)throw Error('V25 source manifest hash differs from receipt');
 if(!isDeepStrictEqual(names,prepared.templates.map(row=>row.name).sort()))throw Error('V25 receipt template name set differs');
 return {assetFile,prepared};
}
function snapshotState(snapshot,root){
 if(typeof snapshot!=='string'||!snapshot||snapshot.split(/[\\/]/).includes('..'))throw Error('Invalid audit snapshot path');
 const path=resolve(root,snapshot),state=entry(path);
 if(!state||!state.isDirectory())throw Error('Audit snapshot must already exist as an isolated directory');
 const physical=realpathSync.native(path);
 if(identity(physical)!==identity(path))throw Error('Audit snapshot cannot be an output alias');
 if(contains(physical,root)||entry(join(physical,'.git')))throw Error('Audit snapshot must be isolated from the original source repository');
 return {path:physical,dev:state.dev,ino:state.ino};
}
function checkSnapshot(snapshot){
 const current=statSync(snapshot.path);
 if(current.dev!==snapshot.dev||current.ino!==snapshot.ino||identity(realpathSync.native(snapshot.path))!==identity(snapshot.path))throw Error('Audit snapshot identity changed');
}
function plainDirectory(root,path){
 const state=entry(path);
 if(!state)return false;
 if(!state.isDirectory())throw Error('Audit snapshot output parent must be a plain directory, not an alias');
 const physical=inside(root,path);
 if(identity(physical)!==identity(path))throw Error('Audit output parent cannot be an alias');
 return true;
}
function parents(root,parent){
 if(!contains(root,parent))throw Error('Audit destination escapes the snapshot private root');
 let cursor=root;
 for(const part of relative(root,parent).split(/[\\/]/).filter(Boolean)){
  cursor=join(cursor,part);
  if(!plainDirectory(root,cursor)){mkdirSync(cursor,{mode:0o700});plainDirectory(root,cursor);}
 }
}
function copyPlan(prepared,snapshot){
 const privateRoot=join(snapshot.path,'.artifacts','v25-private-input'),output=join(snapshot.path,'.artifacts','v25-card-assets.json');
 if(entry(privateRoot)||entry(output))throw Error('Audit private outputs must be fresh; existing evidence is preserved');
 const artifacts=dirname(privateRoot);plainDirectory(snapshot.path,artifacts);
 const seen=new Set(),copies=[];
 for(const from of prepared.inputs.slice(1)){
  const relativePath=relativeInput(prepared.privateInputRoot,from.path),to=resolve(privateRoot,relativePath),key=identity(to);
  if(!contains(privateRoot,to)||seen.has(key))throw Error('Private audit output path collision or escape');
  seen.add(key);copies.push({relativePath,from,to});
 }
 return {privateRoot,output,artifacts,copies};
}

export function prepareAuditV25CardInputs({snapshot,receipt,root=process.cwd()}={}){
 const originalRoot=inside(root,root),target=snapshotState(snapshot,originalRoot);
 const {assetFile,prepared}=verifyReceipt(receipt,originalRoot),plan=copyPlan(prepared,target);
 const original=JSON.parse(readFileSync(assetFile.path,'utf8')),rebased=structuredClone(original),copied=new Map(),copies=[];
 checkSnapshot(target);
 if(!plainDirectory(target.path,plan.artifacts)){mkdirSync(plan.artifacts,{mode:0o700});plainDirectory(target.path,plan.artifacts);}
 mkdirSync(plan.privateRoot,{mode:0o700});plainDirectory(target.path,plan.privateRoot);
 for(const item of plan.copies){
  checkSnapshot(target);parents(plan.privateRoot,dirname(item.to));
  if(!sameRecord(fileRecord(item.from.path,originalRoot),item.from))throw Error('Original private source changed before copying');
  copyFileSync(item.from.path,item.to,constants.COPYFILE_EXCL);
  const to=fileRecord(item.to,target.path);
  if(to.sha256!==item.from.sha256||to.bytes!==item.from.bytes||identity(to.path)!==identity(item.to))throw Error('Audit private copy readback differs');
  copied.set(item.from.path,to);copies.push({relativePath:item.relativePath,from:{...item.from},to});
 }
 for(const row of rebased.inputs){
  const from=inside(originalRoot,resolve(originalRoot,row.path)),to=copied.get(from);
  if(!to)throw Error('Compiled private locator lacks an exact copied source');
  row.path=to.path;
 }
 checkSnapshot(target);plainDirectory(target.path,plan.artifacts);
 writeFileSync(plan.output,JSON.stringify(rebased)+'\n',{flag:'wx',mode:0o600});
 const rebasedFile=fileRecord(plan.output,target.path),copyPrepared=prepareV25CardTemplates(rebasedFile.path,{root:target.path});
 const templateSha256=sha256(JSON.stringify(prepared.templates));
 if(templateSha256!==sha256(JSON.stringify(copyPrepared.templates))||!isDeepStrictEqual(prepared.binding,copyPrepared.binding)
  ||!isDeepStrictEqual(prepared.textureData,copyPrepared.textureData)
  ||prepared.sourceManifestSha256!==copyPrepared.sourceManifestSha256)throw Error('Rebased V25 templates differ from original pinned sources');
 for(const input of prepared.inputs)if(!sameRecord(fileRecord(input.path,originalRoot),input))throw Error('Original private source changed during audit copy');
 checkSnapshot(target);
 return {v25CardAssetsPath:rebasedFile.path,prepared:copyPrepared,locatorRebase:{
  kind:'private-v25-card-input-locators',snapshot:target.path,originalPrivateInputRoot:prepared.privateInputRoot,
  copiedPrivateInputRoot:copyPrepared.privateInputRoot,manifestRelativePath:copyPrepared.manifestRelativePath,
  sourceManifestSha256:prepared.sourceManifestSha256,compiledAsset:{from:assetFile,to:rebasedFile},copies,
  changedFields:original.inputs.map((_,index)=>`inputs[${index}].path`),templateSha256,
  sourceBytesUnchanged:true,nativeImport:'not_run',devicePerformance:'not_run'}};
}
