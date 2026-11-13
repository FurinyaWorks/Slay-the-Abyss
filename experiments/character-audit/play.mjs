import {createInterface} from 'node:readline';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {loadAdapter} from './play-adapters.mjs';
import {createSession,parseCommand} from './play-session.mjs';
export async function main(args){
 const [root,character,head,seedText='37',mode='starter',...extra]=args;
 if(extra.length||!root||!character||!head||!/^\d+$/.test(seedText))throw Error('Usage: node play.mjs ROOT CHARACTER EXACT_HEAD [seed=37] [starter|all|run]');
 const adapter=await loadAdapter(root,character,head,{run:mode==='run'}),session=createSession(adapter,{seed:Number(seedText),mode});
 console.log('隔离研究试玩；来源/命名/平衡 HOLD；非正式游戏接入。');
 console.log(mode==='run'?(character==='ganyu'?'甘雨四房：初始10卡、胜利三选一、生命跨战保留；无正式地图/治疗/升级/存档。':`${character==='xiao'?'魈':'钟离'}三房：奖励自动展示，k领取或n跳过都立即进入下一房；不支持o/s暂关；生命跨战保留。无正式地图/存档。`):'仅调用原模型：初始遗物、抽洗、出牌、敌袭和回合结算。无奖励/商店/营地/升级取得/连续战/美术/原生设备证据。');
 console.log('目标编号保持敌人原编号（包括已死亡位置）；省略目标时魈/刻晴选择第1敌人，甘雨单体牌需显式目标，钟离仅单敌。');
 console.log(mode==='all'?'全候选各一张人工测试牌组，不是自然获得或批准牌组。':'沿用角色默认初始牌组。');
 if(adapter.paidFactory)console.log('刻晴已支付待选：按pending列出的实例，用 j {"type":"choose","revision":当前revision,"token":"当前token","instance":"实例ID"} 继续；无撤销/重置/存档，仅进程中会话。');
 console.log(JSON.stringify({source:adapter.identity,commands:'show | catalog | p REV SLOT [TARGET] | e REV | c REV | r REV | o REV打开 | s REV暂关 | k REV CHOICE领取 | n REV下一房 | q'},null,2));
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
