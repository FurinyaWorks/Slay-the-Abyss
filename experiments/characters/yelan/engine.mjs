// Isolated design toy. Never imported by the production build.
export function rng(seed) { let s=seed>>>0; return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;}; }
function shuffle(a,r) { for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a; }
const plans={pressure:[8,12,10,16],armor:[6,8,14,10],burst:[4,5,22,8]};
export function start(cards,{seed=1,deck='starter',enemy='pressure',upgraded=false}={}) {
 const ids=['001','001','001','001','002','002','002','002','003','004'];
 if(deck==='line') ids.push('006','007','012');
 if(deck==='dice') ids.push('008','009','011');
 const r=rng(seed);const s={cards:Object.fromEntries(cards.map(c=>[c.id,c])),r,seed,deck,enemy,upgraded,hp:72,maxHp:72,enemyHp:72,enemyBlock:enemy==='armor'?8:0,block:0,line:0,dice:0,diceDamage:0,energy:3,turn:1,hand:[],pile:shuffle(ids.map(x=>'YL-P'+x),r),discard:[],log:[],over:false};
 draw(s,5);s.log.push('开战遗物候选：获得1层索（每战仅一次，无治疗）。');s.line=1;return s;
}
export function intent(s){return plans[s.enemy][(s.turn-1)%4];}
function draw(s,n){for(let i=0;i<n&&s.hand.length<10;i++){if(!s.pile.length){s.pile=shuffle(s.discard.splice(0),s.r);}if(s.pile.length)s.hand.push(s.pile.pop());}}
function damage(s,n){const absorbed=Math.min(s.enemyBlock,n);s.enemyBlock-=absorbed;s.enemyHp=Math.max(0,s.enemyHp-(n-absorbed));if(!s.enemyHp)s.over=true;}
export function text(c,up=false){return (up?c.upgrade:c.base).map(([op,n,k])=>({damage:`造成${n}伤害`,block:`获得${n}格挡`,line:`获得${n}层索（上限3）`,cash:`消耗全部索，造成${n}+${k}×层数伤害`,dice:`玲珑窗口刷新为${n}次，每次追加${k}伤害（本回合）`,draw:`抽${n}张牌`,scaled:`造成${n}+${k}×当前索伤害，不消耗索`}[op])).join('；');}
export function play(s,index){
 if(s.over||!Number.isInteger(index)||index<0||index>=s.hand.length)return false;
 const c=s.cards[s.hand[index]];if(c.cost>s.energy)return false;
 s.energy-=c.cost;s.hand.splice(index,1);const effects=s.upgraded?c.upgrade:c.base;
 for(const [op,n,k] of effects){if(s.over)break;
 if(op==='damage')damage(s,n);else if(op==='block')s.block+=n;else if(op==='line')s.line=Math.min(3,s.line+n);
 else if(op==='cash'){const count=s.line;s.line=0;damage(s,n+k*count);}else if(op==='scaled')damage(s,n+k*s.line);
 else if(op==='dice'){s.dice=n;s.diceDamage=k;}else if(op==='draw')draw(s,n);
 }
 // One proc per root attack card, never from proc damage; target death ends the chain.
 if(!s.over&&c.type==='attack'&&s.dice>0){s.dice--;damage(s,s.diceDamage);}
 s.discard.push(c.id);s.log.push(`第${s.turn}回合 ${c.id}${s.upgraded?'+':''}：${text(c,s.upgraded)}`);return true;
}
export function end(s){if(s.over)return false;s.discard.push(...s.hand.splice(0));const hit=Math.max(0,intent(s)-s.block);s.hp=Math.max(0,s.hp-hit);s.log.push(`敌方行动 ${intent(s)}，失血${hit}；索保留${s.line}，玲珑窗口到期。`);s.dice=0;s.diceDamage=0;s.block=0;if(!s.hp){s.over=true;return true;}s.turn++;s.energy=3;s.enemyBlock=s.enemy==='armor'?8:0;draw(s,5);return true;}
