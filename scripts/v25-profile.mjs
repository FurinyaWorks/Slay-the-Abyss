// A development slice, not a claim that V25 artwork or devices are accepted.
export const v25ChromeProfile='v25-layered-v1';
export function validateV25Chrome({v25BattleChrome=false,lightweight2d=false,releaseCandidate=false}={}) {
  if(typeof v25BattleChrome!=='boolean'||v25BattleChrome&&(lightweight2d||releaseCandidate))
    throw Error('V25 battle chrome requires a non-release candidate without bounded/flat artwork');
  return v25BattleChrome;
}
export function v25ChromeArgs(argv) {
  const args=[];let v25BattleChrome=false;
  for(const arg of argv) {
    if(!arg.startsWith('--v25-battle-chrome')){args.push(arg);continue;}
    if(arg!=='--v25-battle-chrome'||v25BattleChrome)throw Error('Invalid or duplicate V25 battle chrome option');
    v25BattleChrome=true;
  }
  return {args,v25BattleChrome};
}
export function v25ChromeFromReceipt(receipt) {
  if(receipt.experimentalBattleChrome===undefined)return false;
  if(receipt.experimentalBattleChrome!==v25ChromeProfile||receipt.experimentalProfile!==undefined)
    throw Error('Invalid V25 battle chrome receipt');
  return true;
}
