// A development slice, not a claim that V25 artwork or devices are accepted.
export const v25ChromeProfile='v25-layered-v1';
export function validateV25Chrome({v25BattleChrome=false,lightweight2d=false,releaseCandidate=false,v25CardAssets,v25UiMasks}={}) {
  if(v25CardAssets!==undefined&&(!v25BattleChrome||typeof v25CardAssets!=='string'||!v25CardAssets||v25CardAssets.includes('\0')))throw Error('Private V25 card assets require explicit V25 chrome and a file');
  if(v25UiMasks!==undefined&&(!v25BattleChrome||typeof v25UiMasks!=='string'||!v25UiMasks||v25UiMasks.includes('\0')))throw Error('Private V25 UI masks require explicit V25 chrome and a file');
  if(typeof v25BattleChrome!=='boolean'||v25BattleChrome&&(lightweight2d||releaseCandidate))
    throw Error('V25 battle chrome requires a non-release candidate without bounded/flat artwork');
  return v25BattleChrome;
}
export function v25ChromeArgs(argv) {
  const args=[];let v25BattleChrome=false,v25CardAssets,v25UiMasks;
  for(const arg of argv) {
    if(arg.startsWith('--v25-ui-masks')){
      if(!arg.startsWith('--v25-ui-masks=')||v25UiMasks!==undefined||!arg.slice('--v25-ui-masks='.length))throw Error('Invalid or duplicate V25 private UI masks option');
      v25UiMasks=arg.slice('--v25-ui-masks='.length);continue;
    }
    if(arg.startsWith('--v25-card-assets')){
      if(!arg.startsWith('--v25-card-assets=')||v25CardAssets!==undefined||!arg.slice('--v25-card-assets='.length))throw Error('Invalid or duplicate V25 private card assets option');
      v25CardAssets=arg.slice('--v25-card-assets='.length);continue;
    }
    if(!arg.startsWith('--v25-battle-chrome')){args.push(arg);continue;}
    if(arg!=='--v25-battle-chrome'||v25BattleChrome)throw Error('Invalid or duplicate V25 battle chrome option');
    v25BattleChrome=true;
  }
  return {args,v25BattleChrome,...(v25CardAssets!==undefined?{v25CardAssets}:{}),...(v25UiMasks!==undefined?{v25UiMasks}:{})};
}
export function v25UiMasksFromReceipt(receipt){
 const value=receipt.v25UiMasks;
 if(value===undefined)return undefined;
 const binding=value.templateIndices;
 if(!v25ChromeFromReceipt(receipt)||typeof value.assetFile?.path!=='string'||!value.assetFile.path||!/^[a-f0-9]{64}$/.test(value.assetFile.sha256??'')
  ||!Array.isArray(value.inputs)||!binding||Object.keys(binding).length!==1||!Number.isSafeInteger(binding.AbyssV25SelectionConstellation)||binding.AbyssV25SelectionConstellation<=0)throw Error('Invalid private V25 UI mask receipt');
 return value.assetFile.path;
}
export function v25CardAssetsFromReceipt(receipt){
 const value=receipt.v25CardAssets;
 if(value===undefined)return undefined;
 if(!v25ChromeFromReceipt(receipt)||typeof value.assetFile?.path!=='string'||!/^[a-f0-9]{64}$/.test(value.assetFile?.sha256??'')||!Array.isArray(value.inputs)||!value.templateIndices)throw Error('Invalid private V25 card assets receipt');
 return value.assetFile.path;
}
export function v25ChromeFromReceipt(receipt) {
  if(receipt.experimentalBattleChrome===undefined)return false;
  if(receipt.experimentalBattleChrome!==v25ChromeProfile||receipt.experimentalProfile!==undefined)
    throw Error('Invalid V25 battle chrome receipt');
  return true;
}
