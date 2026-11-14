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
  if(task?.verificationOnly)errors.push('implementation already delivered; resume verification instead of implementing again');
  if(task?.allCriteriaChecked)errors.push('all AC checked; reconcile delivery and task status before claiming');
  return {decision:errors.length?'HOLD':'ALLOW',reasons:errors};
}
export function loadTask(id,root='.') {
  const names=readdirSync(join(root,'backlog/tasks')).filter(n=>n.startsWith(id.toLowerCase()+' - ')&&n.endsWith('.md'));
  if(names.length!==1)return null;
  const s=readFileSync(join(root,'backlog/tasks',names[0]),'utf8');
  const lines=s.replace(/^\uFEFF/,'').split(/\r?\n/);
  if(!/^---[ \t]*$/.test(lines[0]))return null;
  const end=lines.findIndex((line,index)=>index>0&&/^---[ \t]*$/.test(line));
  if(end<0)return null;
  const header=lines.slice(1,end);
  const keys=header.filter(line=>/^\w[\w-]*[ \t]*:/.test(line)).map(line=>line.match(/^([\w-]+)[ \t]*:/)[1]);
  if(new Set(keys).size!==keys.length)return null;
  // Do not silently ignore YAML key forms that this deliberately small native
  // metadata reader cannot interpret (quoted/explicit keys, aliases or merges).
  if(header.some(line=>line.trim()&&!/^[ \t#]/.test(line)&&!/^\w[\w-]*[ \t]*:/.test(line)))return null;
  // Only native, single-line scalar metadata is used for intake. Ambiguous
  // fields must not let the first To Do hide a later In Progress or identity.
  const scalar=k=>{
    const pattern=new RegExp('^'+k+'[ \\t]*:[ \\t]*(.*)$');
    const fields=header.flatMap((line,index)=>{
      const match=line.match(pattern);
      return match?[{value:match[1],index}]:[];
    });
    if(fields.length!==1)return null;
    const field=fields[0];
    for(const line of header.slice(field.index+1)) {
      if(!line.trim()||/^\s*#/.test(line))continue;
      if(/^[ \t]/.test(line))return null;
      break;
    }
    const value=field.value.trim();
    if(!value)return null;
    if(value[0]==='\''||value[0]==='"') {
      if(value.length<2||value.at(-1)!==value[0])return null;
      return value.slice(1,-1)||null;
    }
    return /['"]/.test(value)?null:value;
  };
  const task={id:scalar('id'),status:scalar('status'),milestone:scalar('milestone')};
  if(!task.id||!task.status)return null;
  // Milestone never gates eligibility, but duplicate/invalid metadata is not
  // an authoritative task record. An absent milestone remains supported.
  if(header.some(line=>/^milestone[ \t]*:/.test(line))&&!task.milestone)return null;
  const labels=header.join('\n').match(/^labels:[ \t]*(\[[^\n]*\]|\n(?:[ \t]+-[^\n]*\n?)*)/m)?.[1]??'';
  if(/(?:^|[\s\[,'"])(?:待验|delivery-verify)(?=$|[\s\],'"])/u.test(labels))task.verificationOnly=true;
  const criteria=[...(s.match(/<!-- AC:BEGIN -->([\s\S]*?)<!-- AC:END -->/)?.[1]??'').matchAll(/^- \[([ xX])\] /gm)];
  if(criteria.length&&criteria.every(match=>match[1].toLowerCase()==='x'))task.allCriteriaChecked=true;
  return task;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const id=process.argv[2]||'';
  const policy=JSON.parse(readFileSync('config/task-intake.json','utf8'));
  const result=evaluateIntake({id,task:loadTask(id),policy});
  console.log(result.decision+' '+id);
  if(result.reasons.length){console.error(result.reasons.join('\n'));process.exitCode=1}
  else console.log('Still check task dependencies, approvals, open PRs, task claims and file ownership; this command does not claim the task.');
}
