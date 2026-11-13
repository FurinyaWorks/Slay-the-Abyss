import test from 'node:test';
import assert from 'node:assert/strict';
import {auditRoleCapacityGate,readTaskHeader} from '../scripts/verify-backlog-roadmap.mjs';

const role=(status='To Do',dependencies=['TASK-105'])=>({id:'TASK-97',status,dependencies});
const capacity=(status='To Do')=>({id:'TASK-105',status});

test('Backlog CLI block list parses the role expansion dependency',()=>{
  const source='---\nid: TASK-97\nstatus: To Do\nassignee:\n  - Furinya\ndependencies:\n  - TASK-105\n---\n';
  assert.deepEqual(readTaskHeader(source).dependencies,['TASK-105']);
  assert.deepEqual(readTaskHeader(source.replace('dependencies:\n  - TASK-105','dependencies: []')).dependencies,[]);
});
test('mass character rollout requires the exact capacity task, even when still queued',()=>{
  assert.deepEqual(auditRoleCapacityGate([role(),capacity()]),[]);
  assert.match(auditRoleCapacityGate([role('To Do',[]),capacity()]).join('\n'),/显式依赖/);
  assert.match(auditRoleCapacityGate([role()]).join('\n'),/缺少/);
});
test('mass rollout cannot start or complete before capacity GO',()=>{
  for(const s of ['In Progress','Done'])
    assert.match(auditRoleCapacityGate([role(s),capacity('To Do')]).join('\n'),/未取得GO/);
  assert.deepEqual(auditRoleCapacityGate([role('In Progress'),capacity('Done')]),[]);
  assert.deepEqual(auditRoleCapacityGate([role('Done'),capacity('Done')]),[]);
});
test('unrelated release, single-character experiment and other milestones remain unblocked',()=>{
  assert.deepEqual(auditRoleCapacityGate([{id:'TASK-85',status:'In Progress'},{id:'TASK-103',status:'To Do'}]),[]);
  assert.deepEqual(auditRoleCapacityGate([role('Blocked'),capacity('To Do')]),[]);
});
