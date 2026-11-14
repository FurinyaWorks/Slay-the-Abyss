// Independent, offline, first-script-only probes. No production or browser interaction.
// From repository root: node experiments/characters/hutao-v6-lab/reviews/decisions/baseline-probes.mjs
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
const path=process.argv[2] || 'experiments/characters/hutao-v6-lab/baseline/pr640.html';
const bytes=readFileSync(path);
const html=bytes.toString('utf8');
const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
if(scripts.length<1) throw Error('source has no script');
const {CARDS,HutaoGame,STARTER,REWARD_POOL}=runInNewContext(scripts[0][1]+'\n({CARDS,HutaoGame,STARTER,REWARD_POOL})',{}, {timeout:2000});
const blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
if(blob!=='364e1d3e8c8559e2fcb26276b9ae8a2813f21735') throw Error('SOURCE_MISMATCH '+blob);
const build=(ids,hp=72,butterfly=0)=>{const g=new HutaoGame(17);g.hp=hp;g.butterfly=butterfly;g.hand=ids.map(id=>g.newCard(id));return g;};
const take=(g,id)=>{const c=g.hand.find(x=>x.id===id);if(!c)throw Error('missing '+id);const r=g.play(c.uid);if(!r.ok)throw Error('cannot play '+id+': '+r.reason);};
function route(ids,plays,hp=72,butterfly=0){const g=build(ids,hp,butterfly);for(const id of plays)take(g,id);if(g.phase==='combat')g.endTurn();return {hp:g.hp,enemyHp:g.enemies[0].hp,mark:g.enemies[0].mark,turn:g.turn,phase:g.phase};}
const cards=Object.keys(CARDS);const executable={total:0,errors:[],denied:0};
for(const hp of [72,36,8])for(const butterfly of [0,2])for(const marked of [false,true])for(const upgraded of [false,true])for(const id of cards){const g=build([id],hp,butterfly);g.hand[0].upgraded=upgraded;g.enemies[0].mark=marked?2:0;try{const can=g.canPlay(g.hand[0]);const r=g.play(g.hand[0].uid);if(can.ok!==r.ok)executable.errors.push([id,hp,butterfly,marked,upgraded,'preflight mismatch']);if(!can.ok)executable.denied++;}catch(e){executable.errors.push([id,hp,butterfly,marked,upgraded,String(e)]);}executable.total++;}
const natural={seed_range:'1..256',N:256,e:0,heavy:0,e_and_heavy:0,e_without_attack:0,e_with_normal:0,denied:0};
for(let seed=1;seed<=256;seed++){const g=new HutaoGame(seed),h=g.hand.map(x=>x.id),e=h.includes('e');natural.e+=Number(e);natural.heavy+=Number(h.includes('heavy'));natural.e_and_heavy+=Number(e&&h.includes('heavy'));natural.e_without_attack+=Number(e&&!h.some(id=>id==='heavy'||id==='normal'));natural.e_with_normal+=Number(e&&h.includes('normal'));natural.denied+=g.hand.filter(x=>!g.canPlay(x).ok).length;}
const h=build(['hearth','normal']);h.hand[0].upgraded=true;take(h,'hearth');take(h,'normal');
const low=build(['hearth','normal'],36);low.hand[0].upgraded=true;take(low,'hearth');take(low,'normal');
function first(seed,proactive){const g=new HutaoGame(seed),selected=[];for(let t=0;t<12&&g.phase==='combat';t++){for(let a=0;a<7&&g.phase==='combat';a++){let c=proactive&&g.butterfly===0?g.hand.find(x=>x.id==='e'&&g.canPlay(x).ok):null;if(!c)for(const id of ['heavy','normal','q','caution','guard']){if(id==='q'&&g.hp>=g.maxHp-3)continue;c=g.hand.find(x=>x.id===id&&g.canPlay(x).ok);if(c)break;}if(!c)break;selected.push(c.id);g.play(c.uid);}if(g.phase==='combat')g.endTurn();}return {phase:g.phase,hp:g.hp,turn:g.turn,selected};}
const paired=[];for(let seed=1;seed<=256;seed++)paired.push({safe:first(seed,false),proactive:first(seed,true)});
const mean=(key,p)=>paired.reduce((sum,row)=>sum+row[key][p],0)/paired.length;
const policy={seed_range:'1..256',N:paired.length,safe:{won:paired.filter(x=>x.safe.phase==='reward').length,mean_hp:mean('safe','hp'),mean_turn:mean('safe','turn')},proactive:{won:paired.filter(x=>x.proactive.phase==='reward').length,mean_hp:mean('proactive','hp'),mean_turn:mean('proactive','turn')},proactive_lower_hp:paired.filter(x=>x.proactive.hp<x.safe.hp).length,proactive_higher_hp:paired.filter(x=>x.proactive.hp>x.safe.hp).length};
const q={q_first:route(['q','normal'],['q','normal'],36,2),attack_first:route(['q','normal'],['normal','q'],36,2)};
console.log(JSON.stringify({identity:{path,bytes:bytes.length,git_blob:blob,sha256:createHash('sha256').update(bytes).digest('hex'),runtime:process.version},cards:{unique:cards.length,faces:2*cards.length,starter:STARTER.length,rewards:REWARD_POOL.length},executable,natural,scenarios:{e_vs_no_e:{e:route(['e','heavy','normal','guard'],['e','heavy','guard']),no_e:route(['e','heavy','normal','guard'],['heavy','normal','guard'])},hearth_plus:{advertised:CARDS.hearth.upgradeDescription,actual_damage_high_hp:35-h.enemies[0].hp,actual_damage_low_hp:35-low.enemies[0].hp},q_order:q},policy},null,2));
