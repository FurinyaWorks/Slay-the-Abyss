import {createHash} from 'node:crypto';
import {lightweightProfile} from './lightweight-2d-profile.mjs';

export const uiProfileModule='abyss_ui_profile';
export function validateUiProfileOptions({nativePageLifecycle=false,lightweight2d=false,releaseCandidate=false}={}) {
 if(typeof nativePageLifecycle!=='boolean'||nativePageLifecycle&&(lightweight2d!==true||releaseCandidate!==false))
  throw Error('Native page lifecycle requires an explicit bounded non-release experiment');
 return nativePageLifecycle;
}
export function uiProfileArgs(argv) {
 const args=[];let nativePageLifecycle=false;
 for(const arg of argv){
  if(!arg.startsWith('--native-page-lifecycle')){args.push(arg);continue;}
  if(arg!=='--native-page-lifecycle'||nativePageLifecycle)throw Error('Invalid or duplicate native page lifecycle option');
  nativePageLifecycle=true;
 }
 return {args,nativePageLifecycle};
}
export function uiProfileSource(nativePageLifecycle=false) {
 if(typeof nativePageLifecycle!=='boolean')throw Error('Invalid native page lifecycle boolean');
 return `-- Generated candidate-local UI policy; rebuild to change.\nreturn {schemaVersion=1,nativePageLifecycle=${nativePageLifecycle}}\n`;
}
export function uiProfileReceipt(nativePageLifecycle=false) {
 uiProfileSource(nativePageLifecycle);
 const config={schemaVersion:1,nativePageLifecycle};
 return {...config,configSha256:createHash('sha256').update(JSON.stringify(config)).digest('hex')};
}
export function uiProfileFromReceipt(receipt) {
 const profile=receipt?.uiProfile;
 if(profile===undefined)return false; // Older frozen source epochs have no policy module.
 if(!profile||profile.schemaVersion!==1||typeof profile.nativePageLifecycle!=='boolean'
  ||Reflect.ownKeys(profile).some(key=>!['schemaVersion','nativePageLifecycle','configSha256'].includes(key)))throw Error('Invalid native page lifecycle receipt');
 if(profile.configSha256!==uiProfileReceipt(profile.nativePageLifecycle).configSha256)throw Error('UI profile config digest mismatch');
 if(profile.nativePageLifecycle&&receipt.experimentalProfile!==lightweightProfile)throw Error('Native page lifecycle receipt requires bounded experiment');
 return profile.nativePageLifecycle;
}
