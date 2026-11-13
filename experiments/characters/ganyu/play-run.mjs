import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {createResearchRun} from './acquisition.mjs';
import {catalogue,cardText,relicText} from './engine.mjs';
import {command,mildRoute} from './run-console.mjs';
const seed=Number(process.argv[2]??37);
let run=createResearchRun(mildRoute,{battleSeed:seed,rewardSeed:seed});
const io=createInterface({input:stdin,output:stdout});
console.log(`甘雨 ${catalogue.version} 四房人工操作研究试玩。默认10张初始卡和初始遗物；胜利后候选三选一，生命跨战保留，无恢复。不是正式地图/稀有度分布或平衡批准。`);
console.log(relicText());
console.log('战斗：牌号 [目标号] / e结束；奖励：o打开或重开 / 1–3领取 / s暂时跳过 / p下一房；q退出。');
try{
 while(['battle','reward'].includes(run.phase)){
  console.log(`\n房间 ${run.index+1}/4；生命 ${run.hp}；持久卡组 ${run.deck.length}张；状态 ${run.phase}`);
  if(run.phase==='battle'){
   const b=run.battle;console.log(`回合 ${b.turn}；能量 ${b.energy}；格挡 ${b.block}；蓄力 ${b.charge}；冰雨 ${JSON.stringify(b.storm)}`);
   console.log(b.enemies.map((e,i)=>`${i+1}: HP${e.hp} 盾${e.block} 意图${JSON.stringify(e.intent)}`).join(' | '));
   b.hand.forEach((c,i)=>console.log(`${i+1}. ${c.id} ${cardText(c.id,c.upgraded)}`));
  }else if(run.offer.open)run.offer.cards.forEach((id,i)=>console.log(`${i+1}. ${id} ${cardText(id)}`));
  else console.log(run.offer.claimed?'已领取，p进入下一房。':'奖励未领取；o打开，p直接下一房将失效。');
  const answer=await io.question('> ');if(answer.trim()==='q')break;
  try{run=command(run,answer);}catch(e){console.log(`操作拒绝，状态未改变：${e.message}`);}
 }
 console.log(`结束：${run.phase}，房间${run.index+1}，生命${run.hp}。无自动保存；相同种子与操作可重现。`);
}finally{io.close();}
