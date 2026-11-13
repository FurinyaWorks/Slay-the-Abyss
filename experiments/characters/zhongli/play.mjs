import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {battleStart,playInstance,nextTurn,visibleState,RELIC} from './battle.mjs';
const terminal=createInterface({input:stdin,output:stdout});
let state=battleStart({seed:42});
console.log('钟离机制小样0.2：全部名称/数值待审；非正式75卡。\n'+RELIC.name+'：'+RELIC.description);
try{
  while(state.hp>0&&state.enemy.hp>0){
    const hits=[state.turn%3===0?14:8];
    const view=visibleState(state,hits);
    console.log(`\n回合${state.turn} 生命${state.hp} 能量${state.energy} 格挡${state.block} 玉璋${state.jade} 敌生命${state.enemy.hp} 本回合意图${hits.join('+')}`);
    view.hand.forEach((c,i)=>console.log(`${i+1}. 待命名·${c.id} ${c.text}`));
    const input=(await terminal.question('数字出牌 / e结束回合 / q退出：')).trim();
    if(input==='q')break;
    if(input==='e'){state=nextTurn(state,hits);continue;}
    if(!/^\d+$/.test(input)||Number(input)<1||Number(input)>view.hand.length){console.log('输入无效，未执行任何动作。');continue;}
    const result=playInstance(state,view.hand[Number(input)-1].instance);
    if(result.ok)state=result.state;else console.log('未出牌：'+result.reason);
  }
  if(!state.hp)console.log('战败。');else if(!state.enemy.hp)console.log('此机制样本战斗胜利；不代表平衡或完整职业验收。');
}finally{terminal.close();}
