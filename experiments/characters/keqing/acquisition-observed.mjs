import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { starterIds } from './battle.mjs';
import { rewardPool, acceptReward } from './rewards.mjs';
import {runObservedCombat as runCombat} from './observation-policy.mjs';
export function buildObservedAcquisition() {
  const rows=[];
  // Predeclared, deterministic stratification. Not random offers or an untouched statistical sample.
  for(const [index,candidate] of rewardPool.entries()) for(const repeat of [0,1]) for(const policy of ['aggressive','balanced','defensive']) {
    const seed=23003+index*151+repeat*47;
    const offer=[candidate,rewardPool[(index+1)%rewardPool.length]];
    const opening=runCombat({seed,encounter:'solo',policy});
    const branches=[];
    if(opening.outcome==='won') for(const choice of [null,candidate]) for(const encounter of ['pair','heavy']) {
      const deck=acceptReward(starterIds,offer,choice);
      branches.push({choice,after:runCombat({seed:seed+1,deck,encounter,policy,hp:opening.endHp})});
    }
    rows.push({candidate,seed,policy,offer,opening,branches});
  }
  const hash=createHash('sha256');
  for(const file of ['mechanics.mjs','battle.mjs','pressure.mjs','pressure-v2.mjs','rewards.mjs','observation-policy.mjs','acquisition-observed.mjs']) hash.update(readFileSync(new URL(file,import.meta.url)));
  return {version:'KQ-acquisition-observed-1',rewardPool,seedFormula:'23003 + rewardPool index * 151 + repeat(0/1) * 47',sourceDigest:hash.digest('hex'),scope:'Stratified research acquisition: first victory -> public two-card offer -> focus candidate or skip -> add -> real shuffled second fight. Does not prove player selection, balance or natural full-run draft.',rows};
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const r=buildObservedAcquisition();
  writeFileSync(new URL('acquisition-observed-results.json',import.meta.url),JSON.stringify(r,null,2)+'\n');
  console.log(JSON.stringify({candidates:r.rewardPool.length,openings:r.rows.length,branches:r.rows.flatMap(x=>x.branches).length,digest:r.sourceDigest}));
}
