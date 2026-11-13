import {createInterface} from 'node:readline';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {loadAdapter} from './play-adapters.mjs';
import {createSession,parseCommand} from './play-session.mjs';
export async function main(args){
 const [root,character,head,seedText='37',mode='starter',...extra]=args;
 if(extra.length||!root||!character||!head||!/^\d+$/.test(seedText))throw Error('Usage: node play.mjs ROOT CHARACTER EXACT_HEAD [seed=37] [starter|all]');
 const adapter=await loadAdapter(root,character,head),session=createSession(adapter,{seed:Number(seedText),mode});
 console.log('隔离单战试玩；来源/命名/平衡 HOLD；非正式游戏接入。');
 console.log('仅调用原模型：初始遗物、抽洗、出牌、敌袭和回合结算。无奖励/商店/营地/升级取得/连续战/美术/原生设备证据。');
 console.log('目标编号保持敌人原编号（包括已死亡位置）；省略目标时魈/刻晴选择第1敌人，甘雨单体牌需显式目标，钟离仅单敌。');
 console.log(mode==='all'?'全候选各一张人工测试牌组，不是自然获得或批准牌组。':'沿用角色默认初始牌组。');
 console.log(JSON.stringify({source:adapter.identity,commands:'show | catalog | p REV SLOT [TARGET] | e REV | c REV | r REV | q'},null,2));
 console.log(JSON.stringify(session.view(),null,2));
 const io=createInterface({input:process.stdin,crlfDelay:Infinity});
 process.stdout.write('> ');
 try{
  for await(const line of io){
   try{
    const c=parseCommand(line);
    if(c.type==='q')break;
    console.log(JSON.stringify(c.type==='show'?session.view():c.type==='catalog'?session.catalog():session.dispatch(c),null,2));
   }catch(e){console.error('拒绝：'+e.message);}
   process.stdout.write('> ');
  }
 }finally{io.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=2;});
}
