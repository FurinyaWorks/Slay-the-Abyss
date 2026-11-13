// Cross-file traceability only; never grants primary-source or human approval.
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
const dir=resolve(dirname(fileURLToPath(import.meta.url)),'..');const root=resolve(dir,'../../..');
export function checkTraceability(cards,sources,matrix){
 const errors=[];const expected=new Set(Array.from({length:75},(_,i)=>`ganyu-${String(i+1).padStart(2,'0')}`));
 for(const [rows,key] of [[cards.cards,'id'],[sources.records,'card_id'],[matrix.rows,'id']])if(rows.length!==75||rows.some(r=>!expected.has(r[key])))errors.push('incomplete fixed 75 inventory');
 const unique=(rows,key)=>new Set(rows.map(r=>r[key])).size===rows.length;
 if(!unique(cards.cards,'id')||!unique(sources.records,'card_id')||!unique(matrix.rows,'id'))errors.push('duplicate inventory');
 if(cards.cards.length!==sources.records.length||cards.cards.length!==matrix.rows.length)errors.push('inventory size');
 for(const c of cards.cards){
  const s=sources.records.find(r=>r.card_id===c.id),m=matrix.rows.find(r=>r.id===c.id);
  if(!s||!m){errors.push(`${c.id}: missing trace`);continue;}
  if(s.name!==c.name||s.proposed_name!==(c.candidate_name??null)||s.decision_role!==c.role||m.role!==c.role)errors.push(`${c.id}: metadata drift`);
  if(c.source_ref!==c.id||s.effect_ref!==`cards.json#${c.id}`)errors.push(`${c.id}: effect reference drift`);
  const ops=[...new Set([...c.base.effects,...c.upgrade.effects].map(e=>e.op))].sort();
  if(JSON.stringify(ops)!==JSON.stringify([...m.effects].sort()))errors.push(`${c.id}: effect inventory drift`);
  // The frozen source pass contains no verified per-card primary or human approval.
  if(c.name!==`待命名·${c.id}`||c.review?.human_approved!==false||c.review?.status!=='HOLD'||s.source_verified!==false||s.human_review?.approved!==false||m.primary_verified!==false||m.human_approved!==false)errors.push(`${c.id}: unsupported approval`);
  const locator=s.source_locator;const [file,heading]=typeof locator==='string'?locator.split('#'):[];
  const path=file?.startsWith('docs/')?resolve(root,file):resolve(dir,file??'');
  if(!file||!existsSync(path))errors.push(`${c.id}: missing locator`);
  else if(heading&&!readFileSync(path,'utf8').split('\n').some(line=>line.replace(/^#+\s+/,'').trim()===heading))errors.push(`${c.id}: missing heading`);
 }
 return errors;
}
export function readInputs(){const read=p=>JSON.parse(readFileSync(resolve(dir,p),'utf8'));return [read('cards.json'),read('sources.json'),read('source-review/per-card.json')];}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const inputs=readInputs();const errors=checkTraceability(...inputs);console.log(JSON.stringify({cards:inputs[0].cards.length,traceabilityValid:errors.length===0,sourceVerification:'HOLD',humanReview:'HOLD',errors},null,2));process.exitCode=errors.length?1:0;}
