import {fileURLToPath} from 'node:url';
import {newCampaign,campaignAction} from './campaign.mjs';
import {observe,choose} from './research.mjs';
export const defenseOrder=['x06','x27','x13','x07','x32','x16','x22','x09'];
export function stressOne(seed,policy,draft){
 let c=newCampaign(seed),fights=[],current=null,rejected=0,truncated=false;
 const begin=()=>({stage:c.stage,startHp:c.battle.hp,actions:0,seen:[],plays:{}});
 const see=()=>{for(const id of c.battle.hand)if(!current.seen.includes(id))current.seen.push(id);};
 while(['battle','reward'].includes(c.phase)){
  if(c.phase==='reward'){
   const card=draft==='skip'?null:draft==='first'?c.offer[0]:defenseOrder.find(id=>c.offer.includes(id))??null;
   const r=campaignAction(c,{type:'reward',card});if(!r.ok){rejected++;break;}c=r.state;current=null;continue;
  }
  if(!current)current=begin();see();
  if(current.actions>=200){truncated=true;break;}
  const a=choose(observe(c.battle),policy),id=a?c.battle.hand[a.index]:null;
  const r=campaignAction(c,a?{type:'play',...a}:{type:'end'});current.actions++;
  if(!r.ok){rejected++;break;}c=r.state;see();if(id)current.plays[id]=(current.plays[id]??0)+1;
  if(c.phase!=='battle'){Object.assign(current,{endHp:c.battle.hp,lost:current.startHp-c.battle.hp,turn:c.battle.turn,outcome:c.phase==='defeat'?'defeat':'victory'});fights.push(current);current=null;}
 }
 if(current){Object.assign(current,{endHp:c.battle.hp,lost:current.startHp-c.battle.hp,turn:c.battle.turn,outcome:'incomplete'});fights.push(current);}
 return {seed,policy,draft,phase:c.phase,stage:c.stage,hp:c.battle.hp,rejected,truncated,choices:c.choices,fights};
}
const quantile=(xs,q)=>{const sorted=[...xs].sort((a,b)=>a-b);return sorted.length?sorted[Math.ceil(sorted.length*q)-1]:null;};
export function stressReport(){
 const rows=[];for(const policy of ['guard','burst','never-mask'])for(const draft of ['skip','first','defense'])for(let seed=10001;seed<=10064;seed++)rows.push(stressOne(seed,policy,draft));
 const summary=[];for(const policy of ['guard','burst','never-mask'])for(const draft of ['skip','first','defense']){
  const r=rows.filter(x=>x.policy===policy&&x.draft===draft),losses=r.flatMap(x=>x.fights.map(f=>f.lost));
  summary.push({policy,draft,n:r.length,wins:r.filter(x=>x.phase==='victory').length,deathsByStage:[0,1,2].map(stage=>r.filter(x=>x.phase==='defeat'&&x.stage===stage).length),lossP50:quantile(losses,.5),lossP90:quantile(losses,.9),fightDenominator:losses.length,rejected:r.reduce((n,x)=>n+x.rejected,0),truncated:r.filter(x=>x.truncated).length});
 }
 return {version:'xiao-draft-stress-1',seedRange:[10001,10064],scope:'Fixed synthetic route, uniform offers, no permanent upgrades, not natural G6.',summary,rows};
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(JSON.stringify(stressReport(),null,2));
