// Copy private bytes into an isolated archive; only the PNG locator may change.
import {readFileSync,writeFileSync,existsSync,realpathSync,lstatSync} from 'node:fs';
import {resolve,join,relative,isAbsolute} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {fileRecord,prepareOutputDirectory} from './evidence-files.mjs';
import {prepareUiMask,prepareV25UiMasks,v25UiMaskTemplate} from './v25-ui-mask-assets.mjs';

const identity=value=>process.platform==='win32'?value.toLowerCase():value;
function isolatedSnapshot(snapshot,root){
 const lexical=resolve(snapshot),physical=realpathSync.native(lexical),source=realpathSync.native(root);
 const rel=relative(physical,source);
 if(!lstatSync(lexical).isDirectory()||identity(lexical)!==identity(physical)||existsSync(join(physical,'.git'))
  ||!rel||!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..\\')&&!rel.startsWith('../'))throw Error('UI mask audit snapshot must be an isolated plain directory');
 return physical;
}
export function rebasePrivateUiMask({snapshot,receipt,root=process.cwd(),expected,python}={}){
 const directory=isolatedSnapshot(snapshot,root),record=receipt?.v25UiMasks;
 if(!record?.assetFile||!Array.isArray(record.inputs))throw Error('UI mask audit requires a complete receipt');
 const prepared=prepareUiMask(record.assetFile.path,{root,expected,python,name:v25UiMaskTemplate});
 if(!isDeepStrictEqual(record.assetFile,prepared.inputs[0])||!isDeepStrictEqual(record.inputs,prepared.inputs))throw Error('UI mask receipt input identities differ');
 const destination=join(directory,'.artifacts','private-v25-ui-mask');
 if(existsSync(destination))throw Error('UI mask audit destination already exists');
 const physical=prepareOutputDirectory(directory,destination);
 if(identity(physical)!==identity(destination))throw Error('UI mask audit output cannot be an alias');
 const source=prepared.inputs[1],image=join(physical,'source.png'),file=join(physical,'mask.private.json');
 const bytes=readFileSync(source.path);writeFileSync(image,bytes,{flag:'wx'});
 const copied=fileRecord(image,directory);
 if(copied.sha256!==source.sha256||copied.bytes!==source.bytes)throw Error('UI mask copied PNG identity differs');
 const pack=structuredClone(prepared.pack);pack.source.path=image;
 writeFileSync(file,JSON.stringify(pack)+'\n',{flag:'wx'});
 const rebuilt=prepareUiMask(file,{root:directory,expected,python,name:v25UiMaskTemplate});
 if(!isDeepStrictEqual(rebuilt.template,prepared.template))throw Error('UI mask locator rebase changed native pixels');
 for(const input of prepared.inputs)if(!isDeepStrictEqual(fileRecord(input.path,root),input))throw Error('UI mask input changed during audit copy');
 return {v25UiMasksPath:file,prepared:rebuilt,locatorRebase:{source:{from:source.path,to:image,sha256:source.sha256},
  assetFile:{from:prepared.inputs[0],to:rebuilt.inputs[0]},normalization:'Only source.path changed; alpha, RGB tint, canvas bounds and native template are identical'}};
}
export function prepareAuditV25UiMasks(options){
 const prepared=prepareV25UiMasks(options.receipt?.v25UiMasks?.assetFile?.path,{root:options.root});
 return rebasePrivateUiMask({...options,expected:{sourceSha256:prepared.contract.sourceSha256,width:512,height:512,tint:prepared.contract.colour}});
}
