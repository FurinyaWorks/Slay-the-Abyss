import {existsSync,readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readTaskHeader} from './verify-backlog-roadmap.mjs';

// Explicit instructions in the merged PR, never inference from age or green CI.
export function planBacklogCloseout({body,records,mergeSha,prNumber,changedTaskIds=[]}) {
  const errors=[],commands=[],lines=(body??'').split(/\r?\n/).filter(line=>/^Backlog:/.test(line));
  if(!/^[a-f0-9]{40}$/.test(mergeSha??'')||!Number.isSafeInteger(prNumber)||prNumber<1)errors.push('Invalid merged delivery identity');
  if(lines.length!==1)errors.push('Declare exactly one Backlog: line in the PR');
  const value=lines[0]?.slice(8).trim(),actions=new Map();
  if(value!=='none')for(const entry of (value??'').split(',')) {
    const match=entry.trim().match(/^(TASK-\d+(?:\.\d+)*)=(done|verify|continue|recorded|superseded:(TASK-\d+(?:\.\d+)*))$/);
    if(!match||actions.has(match?.[1])){errors.push('Invalid or duplicate Backlog disposition: '+entry);continue;}
    actions.set(match[1],match[2]);
  }
  for(const id of changedTaskIds)if(!actions.has(id))errors.push(`${id}: missing Backlog disposition`);
  const byId=new Map();
  for(const record of records) {
    if(byId.has(record.id))errors.push(`${record.id}: ambiguous Backlog identity`);
    byId.set(record.id,record);
  }
  for(const [id,action] of actions) {
    const task=byId.get(id),marker=`[delivery:${mergeSha}] ${action}`;
    if(!task){errors.push(`${id}: task missing from this checkout; refresh the working tree`);continue;}
    if(task.metadataErrors?.length){errors.push(`${id}: invalid native metadata`);continue;}
    const note=`${marker} PR #${prNumber}; remaining AC: ${task.acCount-task.acCompleted}.`;
    if(action==='recorded') {
      if(!['tasks','completed','archive'].includes(task.location)||!['To Do','In Progress','Blocked','Done'].includes(task.status)||
        task.location==='completed'&&task.status!=='Done'||task.status==='Done'&&(!task.acCount||task.acCompleted!==task.acCount))
        errors.push(`${id}: recorded cleanup has inconsistent status or AC`);
    } else if(action==='done') {
      if(!task.acCount||task.acCompleted!==task.acCount){errors.push(`${id}: done requires every existing AC checked with evidence`);continue;}
      if(task.location==='completed'&&task.status==='Done')continue;
      if(task.location!=='tasks'){errors.push(`${id}: archived work cannot be silently completed`);continue;}
      if(task.status!=='Done'||!task.source.includes(marker))commands.push(['task','edit',id,'-s','Done','--remove-label','待验,delivery-verify','--append-notes',note]);
      commands.push(['task','complete',id]);
    } else if(action.startsWith('superseded:')) {
      const successor=action.slice(11),target=byId.get(successor),seen=new Set([id]);
      let next=successor;
      while(actions.get(next)?.startsWith('superseded:')&&!seen.has(next)){seen.add(next);next=actions.get(next).slice(11);}
      if(!target||target.metadataErrors?.length||!['To Do','In Progress','Blocked','Done'].includes(target.status)||target.location==='archive'||seen.has(next)||successor===id){errors.push(`${id}: missing, invalid, archived or cyclic successor ${successor}`);continue;}
      if(records.some(record=>record.location==='tasks'&&record.status!=='Done'&&record.dependencies?.includes(id))) {
        errors.push(`${id}: migrate active dependencies before superseding`);continue;
      }
      if(task.location==='archive'&&task.source.includes(marker)&&task.references?.includes(successor))continue;
      if(task.location!=='tasks'||task.status==='Done'){errors.push(`${id}: only unfinished active work may be superseded`);continue;}
      if(!task.source.includes(marker)||!task.references?.includes(successor))commands.push(['task','edit',id,'--add-ref',successor,...(!task.source.includes(marker)?['--append-notes',note]:[])]);
      commands.push(['task','archive',id]);
    } else {
      if(task.location!=='tasks'||task.status==='Done'){errors.push(`${id}: not unfinished active work`);continue;}
      if(action==='verify'&&task.acCompleted===task.acCount){errors.push(`${id}: no open AC left to verify; reconcile as done`);continue;}
      if(action==='verify'&&task.status==='Blocked'){errors.push(`${id}: resolve the explicit Blocked reason before resuming verification`);continue;}
      const waiting=task.status==='In Progress'&&task.labels?.includes('待验');
      if(task.source.includes(marker)&&(action==='continue'||waiting))continue;
      commands.push(['task','edit',id,...(action==='verify'?['-s','In Progress','--add-label','待验,delivery-verify']:[]),'--append-notes',note]);
    }
  }
  return {errors,commands:errors.length?[]:commands};
}

function readRecords(root,ids) {
  const records=[];
  // Archived legacy duplicate IDs must not shadow current/completed records.
  for(const [directory,location] of [['backlog/tasks','tasks'],['backlog/completed','completed'],['backlog/archive/tasks','archive']]) {
    if(!existsSync(join(root,directory)))continue;
    for(const name of readdirSync(join(root,directory)).filter(name=>name.endsWith('.md'))) {
      const source=readFileSync(join(root,directory,name),'utf8'),task=readTaskHeader(source);
      if(location==='archive'&&(!ids.has(task.id)||records.some(record=>record.id===task.id)))continue;
      records.push({...task,source,location,filePath:join(directory,name)});
    }
  }
  return records;
}

export function runBacklog(args,{root=process.cwd()}={}) {
  const windows=process.platform==='win32';
  const command='$cliArgs=@('+args.map(arg=>"'"+arg.replaceAll("'","''")+"'").join(',')+'); & backlog @cliArgs; exit $LASTEXITCODE';
  const result=spawnSync(windows?'pwsh':'backlog',windows?['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(command,'utf16le').toString('base64')]:args,
    {cwd:root,encoding:'utf8',timeout:30000,windowsHide:true,maxBuffer:8*1024*1024});
  if(result.error||result.status!==0)throw Error('Backlog CLI failed: '+(result.error?.message||result.stderr||result.stdout));
  return result.stdout;
}

export function syncBacklogCloseout({pr,files,targetSha,root=process.cwd()},run=runBacklog) {
  if(pr?.merged!==true||pr?.base?.ref!=='develop')throw Error('Backlog synchronization requires a verified merged develop PR');
  const changedTaskIds=[...new Set(files.map(file=>file.filename?.match(/^backlog\/(?:tasks|completed|archive\/tasks)\/task-(\d+(?:\.\d+)*) - /)?.[1]).filter(Boolean).map(id=>'TASK-'+id))];
  const declaration=(pr.body??'').split(/\r?\n/).filter(line=>/^Backlog:/.test(line)).join('\n');
  const ids=new Set(declaration.match(/TASK-\d+(?:\.\d+)*/g)??[]);
  const input={body:pr.body,mergeSha:pr.merge_commit_sha,prNumber:pr.number,changedTaskIds};
  const records=readRecords(root,ids),plan=planBacklogCloseout({...input,records});
  if(plan.errors.length)throw Error('Backlog pending: '+plan.errors.join('; '));
  // Do not let an old PR/worktree overwrite a task that evolved on develop.
  const git=(...args)=>{
    const result=spawnSync('git',args,{cwd:root,encoding:'utf8',timeout:10000,maxBuffer:8*1024*1024});
    if(result.error||result.status!==0)throw Error('Backlog pending: cannot bind task snapshot to Git');
    return result.stdout;
  };
  if(!/^[a-f0-9]{40}$/.test(targetSha??'')||git('rev-parse','HEAD').trim()!==targetSha)
    throw Error('Backlog pending: refresh checkout to the actual current develop SHA');
  git('merge-base','--is-ancestor',pr.merge_commit_sha,targetSha);
  const digest=list=>createHash('sha256').update(JSON.stringify(list.filter(record=>ids.has(record.id))
    .map(record=>[record.id,record.filePath,record.source]).sort((a,b)=>a[0].localeCompare(b[0])))).digest('hex');
  const directory=join(root,'build/delivery'),receiptPath=join(directory,`backlog-${pr.number}-${pr.merge_commit_sha}.json`);
  const receipt=existsSync(receiptPath)?JSON.parse(readFileSync(receiptPath,'utf8')):null;
  // Only our exact last readback can resume a partial CLI sequence. A marker
  // retained in later user edits is not a mutation capability.
  const retry=receipt?.schemaVersion===1&&receipt.targetSha===targetSha&&receipt.prNumber===pr.number&&
    receipt.mergeSha===pr.merge_commit_sha&&receipt.declaration===declaration&&receipt.snapshot===digest(records);
  const paths=git('ls-tree','-r','-z','--name-only',pr.merge_commit_sha,'--','backlog/tasks','backlog/completed','backlog/archive/tasks').split('\0').filter(Boolean);
  for(const id of ids) {
    const task=records.find(record=>record.id===id),prefix=id.toLowerCase()+' - ';
    const matches=paths.filter(path=>path.split('/').at(-1).startsWith(prefix));
    if(!task||matches.length!==1)throw Error(`${id}: merged task snapshot missing or ambiguous`);
    const committed=git('show',`${pr.merge_commit_sha}:${matches[0]}`).replaceAll('\r\n','\n'),current=task.source.replaceAll('\r\n','\n');
    if(current!==committed&&!retry)throw Error(`${id}: task changed since this PR; reconcile the newer task instead of overwriting it`);
  }
  mkdirSync(directory,{recursive:true});
  const save=()=>writeFileSync(receiptPath,JSON.stringify({schemaVersion:1,targetSha,prNumber:pr.number,
    mergeSha:pr.merge_commit_sha,declaration,snapshot:digest(readRecords(root,ids))},null,2)+'\n');
  save();
  for(const args of plan.commands){run(args,{root});save();}
  const after=planBacklogCloseout({...input,records:readRecords(root,ids)});
  if(after.errors.length||after.commands.length)throw Error('Backlog CLI readback differs from declared disposition; preserve this checkout and reconcile');
  return {state:'backlog_synced',taskIds:[...ids],commands:plan.commands.length};
}
