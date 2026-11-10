import {readFileSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

function validPolicy(policy) {
  return policy?.schemaVersion===1&&Array.isArray(policy.blockedUntilOwnerApproval)
    &&policy.blockedUntilOwnerApproval.every(id=>typeof id==='string'&&/^TASK-\d+(?:\.\d+)*$/.test(id));
}
export function evaluateIntake({id,task,policy}) {
  const errors=[];
  if(!/^TASK-\d+(?:\.\d+)*$/.test(id||''))errors.push('invalid task identity');
  if(!task||task.id!==id)errors.push('task not found or identity mismatch');
  if(!validPolicy(policy))return {decision:'HOLD',reasons:[...errors,'task intake policy invalid']};
  if(policy.blockedUntilOwnerApproval.includes(id))errors.push('explicit Owner approval required');
  if(task?.status!=='To Do')errors.push('already active, blocked or completed; inspect existing PR instead of duplicating');
  return {decision:errors.length?'HOLD':'ALLOW',reasons:errors};
}
export function loadTask(id,root='.') {
  const names=readdirSync(join(root,'backlog/tasks')).filter(n=>n.startsWith(id.toLowerCase()+' - ')&&n.endsWith('.md'));
  if(names.length!==1)return null;
  const s=readFileSync(join(root,'backlog/tasks',names[0]),'utf8');
  const header=s.replace(/^\uFEFF/,'').split(/^---\s*$/m)[1]||'';
  const scalar=k=>header.match(new RegExp('^'+k+':\\s*([^\\r\\n]+)','m'))?.[1].trim().replace(/^['"]|['"]$/g,'')||null;
  return {id:scalar('id'),status:scalar('status'),milestone:scalar('milestone')};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const id=process.argv[2]||'';
  const policy=JSON.parse(readFileSync('config/task-intake.json','utf8'));
  const result=evaluateIntake({id,task:loadTask(id),policy});
  console.log(result.decision+' '+id);
  if(result.reasons.length){console.error(result.reasons.join('\n'));process.exitCode=1}
  else console.log('Still check task dependencies, approvals, open PRs, task claims and file ownership; this command does not claim the task.');
}
