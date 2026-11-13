import {battleStart,nextTurn,STARTER} from './battle.mjs';
import {visibleTurn} from './pressure.mjs';
import {POOLS,offers} from './journey.mjs';
const groups=[];
for(const armor of [0,12])for(const added of [false,true]){
 const rows=[];for(let seed=10001;seed<=10010;seed++){
  let s=battleStart({seed,deck:added?[...STARTER,'zl17']:STARTER});s.enemy.block=armor;let turns=0,plays=0;
  while(turns<20&&s.hp&&s.enemy.hp){const r=visibleTurn(s,[9],'defense');plays+=r.actions.filter(a=>a.id==='zl17').length;s=nextTurn(r.state,[9]);turns++;}
  rows.push({seed,outcome:!s.hp?'death':!s.enemy.hp?'win':'truncated',hp:s.hp,enemyHp:s.enemy.hp,turns,plays});
 }
 const losses=rows.map(r=>60-r.hp).sort((a,b)=>a-b);groups.push({armor,added,n:10,wins:rows.filter(r=>r.outcome==='win').length,deaths:rows.filter(r=>r.outcome==='death').length,truncated:rows.filter(r=>r.outcome==='truncated').length,lossP50:losses[4],lossP90:losses[8],rows});
}
const inclusion=Object.fromEntries(POOLS.v7.map(id=>[id,0]));for(let seed=1;seed<=10000;seed++)for(const room of [1,2])for(const id of offers(seed,room,'v7'))inclusion[id]++;
console.log(JSON.stringify({scope:'40 fixed one-card-addition battles; initial enemy block 0/12 only, 9 damage each turn, visible full-turn defense policy. No natural acquisition or balance approval.',seeds:'10001..10010 exploratory, no tuning',confounds:'deck thickness changes shuffle; fixed addition unlike reward; enemy armor never refreshes; only single enemy no block-loss triggers',probability:{pool:POOLS.v7,common:1,uncommon:0,rare:0,idealUniformInclusion:3/13,empiricalOffers:20000,inclusion,warning:'finite LCG bias'},groups},null,2));
