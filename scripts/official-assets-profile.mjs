// Candidate-only art direction from PR #588. This does not accept the default skin.
export const officialAssetsProfile = 'official-assets-battle-v2';
export const officialAssetFlags = Object.freeze({cards:false,menuBackground:false,selectionAvatar:true,battlePortrait:true,monsters:false});
export function validateOfficialAssets(options={}) {
 const {officialAssets=false,releaseCandidate=false,lightweight2d=false,v25BattleChrome=false,
  v25CardAssets,v25UiMasks,nativeCardArt,readyCardArt,artFeatures={},performanceArt=false,componentWidgets,prepare}=options;
 if(typeof officialAssets!=='boolean')throw Error('Official assets must be an explicit boolean');
 if(!officialAssets)return false;
 if(releaseCandidate||lightweight2d||v25BattleChrome||v25CardAssets!==undefined||v25UiMasks!==undefined
  ||nativeCardArt!==undefined||readyCardArt===true||performanceArt||componentWidgets||prepare)
  throw Error('Official assets require a separate non-release candidate without other art profiles');
 for(const [key,value] of Object.entries(artFeatures)){
  if(!Object.hasOwn(officialAssetFlags,key)||value!==officialAssetFlags[key])
   throw Error('Official assets preserve the existing Traveler portraits and disable custom cards, monsters and scenery');
 }
 return true;
}
export function officialAssetsArgs(argv){
 const args=[];let officialAssets=false;
 for(const arg of argv){
  if(!arg.startsWith('--official-assets')){args.push(arg);continue;}
  if(arg!=='--official-assets'||officialAssets)throw Error('Invalid or duplicate official assets option');
  officialAssets=true;
 }
 return {args,officialAssets};
}
export function officialAssetsFromReceipt(receipt){
 const value=receipt?.officialAssetsProfile;
 if(value===undefined)return false;
 if(![officialAssetsProfile,'official-assets-first-v1'].includes(value))throw Error('Invalid official assets profile receipt');
 validateOfficialAssets({officialAssets:true,artFeatures:receipt.artFeatures?.flags,
  lightweight2d:receipt.experimentalProfile!==undefined,v25BattleChrome:receipt.experimentalBattleChrome!==undefined,
  v25CardAssets:receipt.v25CardAssets,v25UiMasks:receipt.v25UiMasks,nativeCardArt:receipt.nativeCardArt,
  readyCardArt:receipt.readyCardArt?.enabled===true});
 const flags=receipt.artFeatures?.flags;
 if(!flags||Object.entries(officialAssetFlags).some(([key,value])=>flags[key]!==value))throw Error('Official assets receipt has different artwork flags');
 return true;
}
