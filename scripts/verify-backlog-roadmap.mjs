import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {auditOutcomeTasks} from './product-outcome.mjs';
import {readTaskHeader} from './backlog-metadata.mjs';
export {readTaskHeader} from './backlog-metadata.mjs';

// Priority describes the current queue, not whether a launch requirement matters.
// Historical completed/ records are deliberately not reclassified.
export function auditPriorities(tasks) {
  const errors = [], high = [];
  for (const task of tasks) {
    if (!['high', 'medium', 'low'].includes(task.priority)) errors.push(`${task.id}: 缺少有效优先级（high/medium/low）`);
    if (task.priority !== 'high') continue;
    if (task.status === 'Done') errors.push(`${task.id}: 已完成任务不应占用当前 High 队列`);
    else high.push(task.id);
  }
  if (high.length > 5) errors.push(`未完成 High 任务 ${high.length} 项，超过5项上限：${high.join('、')}；请按依赖重新排序`);
  return errors;
}

export function auditQueueOwners(tasks) {
  return tasks.filter(task => task.status !== 'Done' && (!task.assignees?.length
    || task.assignees.some(owner => !owner.trim() || owner.startsWith('--'))))
    .map(task => `${task.id}: 缺少有效负责人`);
}

export function auditMilestoneScope(titles, archivedTitles = [], requireCurrentStages = false) {
  const contracts = [
    // 2026-10-29 confirmed Traveler-only/two-act scope supersedes the two-role release.
    { stage: 'M3', required: ['岩系旅行者', '第一幕', '第二幕', '核心闭环'] },
    { stage: 'M4', required: ['前两幕', '首局', 'UI', '输入', '音画', '性能'] },
  ];
  // Finished stages move to the archive; their frozen scope stays verifiable there.
  const historicalTitles = [...titles, ...archivedTitles];
  const historicalErrors = contracts.flatMap(({ stage, required }) => {
    const matches = historicalTitles.filter(title => new RegExp(`^${stage}(?:[\\s｜|:：]|$)`).test(title));
    const retiredScope = /第三幕|第四幕|四幕|全章节|两职业|双职业|四职业|八职业|全职业|雷电/;
    return matches.length === 1 && required.every(part => matches[0].includes(part)) && !retiredScope.test(matches[0]) ? []
      : [`${stage}: 里程碑范围必须明确包含${required.join('、')}，不得恢复两职业或扩大为四/八/全职业、第三/四幕，也不得退回仅第一幕或缺少该关口`];
  });
  // M7 remains immutable history, never an active engineering work queue.
  const currentPresent=requireCurrentStages||historicalTitles.some(t=>/^M[789](?:[\s｜|:：]|$)/.test(t));
  const currentErrors=currentPresent?[
    {stage:'M8',required:['产品体验','核心特色']},
    {stage:'M9',required:['内容建设','扩充']},
  ].flatMap(({stage,required})=>{
    const matches=titles.filter(t=>new RegExp('^'+stage+'(?:[\\s｜|:：]|$)').test(t));
    return matches.length===1&&required.every(x=>matches[0].includes(x))?[]
      :[stage+': 当前活动里程碑必须唯一，M7已归档'];
  }):[];
  const legacyActive=titles.filter(t=>/^M7(?:[\s｜|:：]|$)/.test(t));
  const legacyArchived=archivedTitles.filter(t=>/^M7(?:[\s｜|:：]|$)/.test(t));
  if(legacyActive.length)currentErrors.push('M7: 工程里程碑已退出活动看板，禁止恢复');
  if(currentPresent&&(legacyArchived.length!==1||!legacyArchived[0].includes('工程架构')||!legacyArchived[0].includes('性能强化')))
    currentErrors.push('M7: 必须完整保留已归档的工程历史里程碑，禁止删除或改写身份');
  return [...historicalErrors,...currentErrors];
}

export function auditCompetitionRoster(scope) {
  // Only the current decision is authoritative; historical rosters elsewhere stay intact.
  // The current public roster must not silently restore Raiden or an arbitrary role.
  const current = scope.split(/^##[ \t]+/m).slice(1)
    .filter(section => /^2026-10-29 比赛单角色收敛决策[ \t]*\r?\n/.test(section));
  const decisions = current.length === 1 ? current[0].match(/最终选择[^。\r\n]*。/g) ?? [] : [];
  const frozenDecision = '最终选择仅岩系旅行者（Ironclad）完整玩通第一幕与第二幕并正常结算。';
  return decisions.length === 1 && decisions[0] === frozenDecision ? []
    : ['M3: 比赛职业合同必须仅为岩系旅行者（Ironclad）完整通关第一幕与第二幕；不得替换角色或恢复两职业公开范围'];
}

function milestoneTitles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).filter(name => name.endsWith('.md')).map(name => {
    const source = readFileSync(join(directory, name), 'utf8');
    return source.match(/^title:[ \t]*([^\r\n]*)/m)?.[1].trim().replace(/^['"]|['"]$/g, '') ?? '';
  });
}

function configuredCurrentStages(root) {
  const file = join(root, 'config/task-intake.json');
  if (!existsSync(file)) return false;
  return (JSON.parse(readFileSync(file, 'utf8')).currentMilestoneIds ?? []).some(id => /^m-[789]$/.test(id));
}

export function verifyMilestoneScope(root = '.') {
  return [...auditMilestoneScope(milestoneTitles(join(root, 'backlog/milestones')),
    milestoneTitles(join(root, 'backlog/archive/milestones')), configuredCurrentStages(root)),
  ...auditCompetitionRoster(readFileSync(join(root, 'docs/SCOPE.md'), 'utf8'))];
}

// Match Backlog's identity comparison, not a task-ID format requirement.
function taskIdentity(id) {
  const value = id.trim(), prefix = value.match(/^([a-z]+)-/i)?.[1] ?? 'TASK';
  const suffix = value.replace(new RegExp(`^${prefix}-`, 'i'), '');
  const normalized = /^\d+(?:\.\d+)*$/.test(suffix)
    ? suffix.split('.').map(part => part.replace(/^0+/, '') || '0').join('.') : suffix;
  return `${prefix}-${normalized}`.toUpperCase();
}

export function auditRoadmap(tasks, roadmap, milestones, completed = []) {
  const errors = [], identities = new Map();
  for (const task of [...tasks, ...completed]) {
    if (!task.id) continue;
    const id = taskIdentity(task.id), matches = identities.get(id) ?? [];
    matches.push(task.filePath ?? task.id);
    identities.set(id, matches);
  }
  for (const [id, paths] of identities) {
    if (paths.length > 1) errors.push(`${id}: 重复任务编号：${paths.join('；')}`);
  }
  // Ambiguous identities cannot safely resolve parents or roadmap entries.
  if (errors.length) return errors;
  // Completed parents retain launch ancestry, but only active-directory tasks are audited below.
  const byId = new Map([...tasks, ...completed].map(task => [task.id, task]));
  const sections = new Map();
  let section;
  for (const line of roadmap.split(/\r?\n/)) {
    const heading = line.match(/^###\s+(M[1-9])(?:\s|[｜|:：]|$)/);
    if (heading) section = heading[1];
    else if (/^#{1,3} /.test(line)) section = null;
    if (section) for (const match of line.matchAll(/^- (TASK-\d+(?:\.\d+)*)(?=[：:\s])/g)) sections.set(match[1], section);
  }
  function isLaunch(task, seen = new Set()) {
    if (!task || seen.has(task.id)) return false;
    seen.add(task.id);
    return Boolean(sections.has(task.id) || task.milestone || task.labels?.includes('launch') || isLaunch(byId.get(task.parentTaskId), seen));
  }
  for (const task of tasks) {
    if (task.status === 'Done' || !isLaunch(task)) continue;
    if (!task.milestone || !milestones[task.milestone]) errors.push(`${task.id}: 缺少有效首发里程碑`);
    else if (sections.get(task.id) !== milestones[task.milestone]) errors.push(`${task.id}: 未列入 ${milestones[task.milestone]} 排期`);
    if (!task.assignees?.length || task.assignees.some(owner => !owner.trim() || owner.startsWith('--'))) errors.push(`${task.id}: 缺少有效负责人`);
  }
  return errors;
}

// Explicit capacity-proof dependency for mass character rollouts, independent of M7 stage completion.
export function auditRoleCapacityGate(tasks, completed = []) {
  const byId = new Map([...completed, ...tasks].map(task => [task.id, task]));
  const rollout = byId.get('TASK-97');
  if (!rollout) return [];
  const capacity = byId.get('TASK-105');
  const errors = [];
  if (!capacity) errors.push('TASK-97: 缺少角色容量前置TASK-105');
  if (!rollout.dependencies?.includes('TASK-105'))
    errors.push('TASK-97: 必须显式依赖TASK-105，禁止绕过容量量产准入');
  if (['In Progress','Done'].includes(rollout.status) && capacity?.status !== 'Done')
    errors.push('TASK-97: 容量TASK-105未取得GO，不得启动或完成角色批量量产');
  return errors;
}

export function auditOrderedStageIds(records, requireCurrentStages = false) {
  const active=records.filter(x=>/^M[789](?:[\s｜|:：]|$)/.test(x.title));
  if(active.length===0&&!requireCurrentStages)return [];
  const errors=['M8','M9'].flatMap(stage=>{
    const matches=active.filter(x=>new RegExp('^'+stage+'(?:[\\s｜|:：]|$)').test(x.title));
    const required='m-'+stage.slice(1);
    return matches.length===1&&matches[0].id===required?[]
      :[stage+': 活动原生ID必须为 '+required];
  });
  if(active.some(x=>/^M7(?:[\s｜|:：]|$)/.test(x.title)))errors.push('M7: 只能位于历史归档，不得重新创建活动工程里程碑');
  return errors;
}

export function verifyBacklogRoadmap(root = '.') {
  const files = directory => readdirSync(join(root, directory)).filter(name => name.endsWith('.md')).sort().map(name => ({
    filePath: `${directory}/${name}`, source: readFileSync(join(root, directory, name), 'utf8') }));
  const readTasks = directory => files(directory).map(({ filePath, source }) => ({ ...readTaskHeader(source), filePath }));
  const tasks = readTasks('backlog/tasks'), completed = readTasks('backlog/completed');
  const stateErrors=[...tasks,...completed].flatMap(task=>[
    ...task.metadataErrors.map(error=>`${task.id??task.filePath}: ${error}`),
    ...(!task.id?[`${task.filePath}: 缺少任务ID`]:[]),
    ...(task.status==='Done'&&task.acCompleted<task.acCount?[`${task.id}: Done仍有未勾AC`]:[]),
    ...(task.status==='To Do'&&task.labels.some(label=>['待验','delivery-verify'].includes(label))?[`${task.id}: 已开展待验任务不能退回To Do；应保留In Progress，明确阻塞时用Blocked`]:[]),
    ...(task.status==='In Progress'&&task.acCount>0&&task.acCompleted===task.acCount?[`${task.id}: AC已全勾，须核对交付并同步状态，不得继续重复施工`]:[]),
  ]);
  const archiveFiles = directory => { try { return files(directory); } catch { return []; } };
  const activeMilestoneFiles = files('backlog/milestones');
  const milestoneRecords=activeMilestoneFiles.map(({source})=>({
    id:source.match(/^id:\s*(m-\d+)/m)?.[1],
    title:source.match(/^title:[ \t]*([^\r\n]*)/m)?.[1].trim().replace(/^['"]|['"]$/g,'')||''
  }));
  // Only historical stages may resolve from the archive; current stages must stay active.
  const archivedMilestoneFiles = archiveFiles('backlog/archive/milestones');
  const historicalMilestoneFiles = archivedMilestoneFiles.filter(({source}) => !/^title:[ \t]*['"]?M[789](?:[\s｜|:：]|$)/m.test(source));
  const requiresCurrent = configuredCurrentStages(root) || archivedMilestoneFiles.some(({source}) => /^title:[ \t]*['"]?M[789](?:[\s｜|:：]|$)/m.test(source));
  const milestones = Object.fromEntries([...activeMilestoneFiles, ...historicalMilestoneFiles].map(({ source }) => {
    const id = source.match(/^id:\s*(m-\d+)/m)?.[1];
    const title = source.match(/^title:[ \t]*([^\r\n]*)/m)?.[1].trim().replace(/^['"]|['"]$/g, '') ?? '';
    const stage = title.match(/^(M[1-9])(?:\s|[｜|:：]|$)/)?.[1];
    return [id, stage];
  }).filter(([id, stage]) => id && stage));
  // Done tasks may retain historical m-7; unfinished work cannot stay under a retired milestone.
  const retiredM7Errors=tasks.filter(task=>task.status!=='Done'&&task.milestone==='m-7')
    .map(task=>task.id+': 未完成任务不得再使用已归档M7；迁至实际M8/M9交付或无里程碑维护队列');
  const intakeFile=join(root,'config/task-intake.json');
  const intakeM7Errors=existsSync(intakeFile)&&JSON.parse(readFileSync(intakeFile,'utf8')).currentMilestoneIds?.includes('m-7')
    ?['M7: task-intake仍宣称已归档工程里程碑为活动阶段']:[];
  return [...new Set([...stateErrors,...auditRoadmap(tasks, readFileSync(join(root, 'docs/MILESTONES.md'), 'utf8'), milestones, completed),
    ...auditPriorities(tasks), ...auditQueueOwners(tasks), ...auditRoleCapacityGate(tasks,completed), ...retiredM7Errors, ...intakeM7Errors,
    ...auditOrderedStageIds(milestoneRecords, requiresCurrent), ...auditOutcomeTasks([...tasks,...completed],root)])];
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const errors = [...verifyBacklogRoadmap(), ...verifyMilestoneScope()];
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log('任务编号、首发排期、负责人及仅岩系旅行者前两幕规划范围检查通过；当前任务均有优先级、未完成High不超过5项；不认证运行时准入、平台或实机。');
}
