// Read-only boundary inventory. NEVER emits production card definitions.
import {execFileSync} from 'node:child_process';import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';
export const baseline='903bf2a31e91f10fb24763ab4cea23d586d0bb83';
export function classify(op){
 const primitive={damage:'damage/value',block:'block/value',draw:'draw/value',aoe:'damage to all active enemies; queued target semantics require adapter'};
 if(Object.hasOwn(primitive,op))return {status:'ANALOGUE_NOT_PARITY',analogue:primitive[op],blocker:'amount/value schema and production powers/reactions/queue/UID behaviour require parity tests'};
 const known=['charge','storm','charged_shot','charged_direct','charged_block','charged_draw','charged_aoe','storm_release','storm_focus','storm_block','storm_draw','spend_one_damage','spend_one_block','spend_one_draw','full_charge_damage','full_charge_block','seek_card','seek_effect'];
 return {status:known.includes(op)?'GANYU_CONTRACT_NOT_INTEGRATED':'UNKNOWN_BLOCKED',blocker:known.includes(op)?'needs explicit resource/field/selection lifecycle and queued production adapter':'new op must be reviewed; never silently exported'};
}
export function inventory(catalogue){return catalogue.cards.map(c=>({id:c.id,productionReady:false,retain:!!c.retain,exhaust:!!c.exhaust,variants:['base','upgrade'].map(level=>({level,cost:c[level].cost,effects:c[level].effects.map(e=>({op:e.op,...classify(e.op)}))}))}));}
export function audit(){
 const paths=['src/lua/abyss_character_profiles.lua','src/lua/abyss_combat_effect_dispatch.lua','src/lua/abyss_combat_effect_damage.lua','src/lua/abyss_combat_effect_cards.lua','src/lua/abyss_retained_cards.lua','data/cards.json'];
 const hashes={};for(const path of paths)hashes[path]=createHash('sha256').update(execFileSync('git',['show',`${baseline}:${path}`])).digest('hex');
 const bytes=readFileSync(new URL('../cards.json',import.meta.url));const catalogue=JSON.parse(bytes);
 const report={status:'BLOCKED_NOT_AN_EXPORT',baseline,productionFiles:hashes,candidateSha256:createHash('sha256').update(bytes).digest('hex'),cards:inventory(catalogue)};
 writeFileSync(new URL('report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');return report;
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1])console.log(JSON.stringify({count:audit().cards.length,status:'BLOCKED_NOT_AN_EXPORT'}));
