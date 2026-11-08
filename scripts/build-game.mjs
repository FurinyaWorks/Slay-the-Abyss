import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

// Build-time aliases only. The existing candidate builder owns flags and receipts.
export function gameBuildArgs(argv) {
 const paths=[];let combat='2d',art='enhanced';const seen=new Set();
 for(const arg of argv){
  const match=/^--(combat|art-version)=(.+)$/.exec(arg);
  if(match){if(seen.has(match[1]))throw Error('Duplicate option: '+match[1]);seen.add(match[1]);
   if(match[1]==='combat')combat=match[2];else art=match[2];
  }else if(arg.startsWith('--'))throw Error('Unknown build option: '+arg);
  else paths.push(arg);
 }
 if(!['2d','3d'].includes(combat)||!['legacy','enhanced'].includes(art))throw Error('Use --combat=2d|3d and --art-version=legacy|enhanced');
 if(combat==='3d')throw Error('3D is archived at PR #553/#556; no accepted mainline 3D runtime is available.');
 if(paths.length<1||paths.length>2)throw Error('Usage: npm run build:game -- <base.gil> [output] [--art-version=legacy|enhanced]');
 return [...paths,...(art==='enhanced'?['--lightweight-2d','--native-page-lifecycle']:[]),
  '--art-cards=false','--art-monsters=false','--art-menu-background=true','--art-selection-avatar=true','--art-battle-portrait=true'];
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const args=gameBuildArgs(process.argv.slice(2));
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('./build-native-candidate.mjs',import.meta.url)),...args],{stdio:'inherit',windowsHide:true});
  if(result.error)throw result.error;process.exitCode=result.status??1;
 }catch(error){console.error(error.message);process.exitCode=1;}
}
