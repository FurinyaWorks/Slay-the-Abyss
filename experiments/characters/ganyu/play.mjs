import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { catalogue, cardText, endTurn, play, relicText } from './engine.mjs';
import { createBattle, nextBattleTurn } from './battle.mjs';
const seed=Number(process.argv[2] ?? 37);
let state=createBattle([{hp:35,block:0,intent:6},{hp:22,block:0,intent:4}],seed);
const io=createInterface({input:stdin,output:stdout});
console.log('甘雨0.2隔离机械试玩。名字/数值未批准，无奖励/地图，非正式游戏。');
console.log(`${relicText()}\n抽牌种子 ${seed}；每敌意图恒定，仅用于比较选择。`);
try {
 while(state.phase==='player') {
  console.log(`\n回合${state.turn} HP${state.hp} 格挡${state.block} 能量${state.energy} 蓄力${state.charge}`);
  console.log(state.enemies.map((e,i)=>`${i+1}:HP${e.hp} 格挡${e.block} 攻击${JSON.stringify(e.intent)}`).join(' | '));
  console.log('公开抽牌堆核心箭数量（不显示牌序）：',state.draw.filter(c=>c.id==='ganyu-03').length);
  state.hand.forEach((c,i)=>console.log(`${i+1}. ${cardText(c.id,c.upgraded)} (${catalogue.cards.find(x=>x.id===c.id).role})`));
  const answer=(await io.question('出牌:牌号 目标号；结束:e；退出:q > ')).trim();
  if(answer==='q') break;
  try {
   if(answer==='e') {state=endTurn(state);if(state.phase==='between')state=nextBattleTurn(state);}
   else {const [a,b]=answer.split(/\s+/).map(Number);state=play(state,a-1,Number.isInteger(b)?b-1:null);}
  }catch(error){console.log(`操作拒绝（未支付）：${error.message}`);}
 }
 console.log(`停止状态 ${state.phase}；剩余生命${state.hp}，回合${state.turn}。不是平衡或真人体验通过证明。`);
} finally {io.close();}
