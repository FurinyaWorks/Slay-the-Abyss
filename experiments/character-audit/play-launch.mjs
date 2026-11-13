// Convenience launcher; content-pinned, never fetches, checks out or modifies a model.
import {execFileSync} from 'node:child_process';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
export const pins=Object.freeze({
 ganyu:{cards:75,tree:'139addcb69e097f80f4314ebe3f6c9a5a4811370',modes:['starter','all','run'],note:'四房研究旅程；44仍旧值；非正式地图'},
 xiao:{cards:75,tree:'9d184954fd1160ef6f4ee6728362b2dc1919d665',modes:['starter','all','run'],note:'三房研究旅程；领取/跳过立即下一房'},
 keqing:{cards:75,tree:'c411d0e6f634208993fb258fc7e6f46ba67e668f',modes:['starter','all','run'],note:'已支付043/044待选及三房研究旅程；无存档，待独审'},
 zhongli:{cards:75,tree:'43cf97c15c1d130cfc9cf9ff2e68fbe12e40cf06',modes:['starter','all','run'],note:'75候选/v37池三房；validator 修订定向复核待确认，所有正式门禁HOLD'},
});
export function select(character,tree,mode='starter',seed='37'){
 if(!Object.hasOwn(pins,character))throw Error('unknown character');const pin=pins[character];
 if(tree!==pin.tree)throw Error('model tree is not the reviewed pinned content; do not silently use latest branch');
 if(!pin.modes.includes(mode))throw Error('unsupported mode for this character');
 if(!/^\d+$/.test(seed)||!Number.isInteger(Number(seed))||Number(seed)<1||Number(seed)>0xffffffff)throw Error('invalid seed');
 return {character,mode,seed:String(Number(seed)),pin};
}
export async function launch(args){
 if(args.length===1&&args[0]==='--list'){console.log(JSON.stringify(pins,null,2));return;}
 const [character,root,mode='starter',seed='37',...extra]=args;if(!root||extra.length)throw Error('Usage: play-launch.mjs --list | CHARACTER ROOT [starter|all|run] [seed]');
 const dir=resolve(root);const git=(...a)=>execFileSync('git',['-C',dir,...a],{encoding:'utf8'}).trim();
 const tree=git('rev-parse','HEAD^{tree}'),head=git('rev-parse','HEAD');const selected=select(character,tree,mode,seed);
 // main/loadAdapter rechecks clean identity before/after import and before every command.
 console.log(selected.pin.note);const {main}=await import('./play.mjs');await main([dir,character,head,selected.seed,mode]);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)launch(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=2;});
