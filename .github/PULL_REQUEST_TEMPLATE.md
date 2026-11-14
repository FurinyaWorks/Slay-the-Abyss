## What & why
<!-- One paragraph: the change and the problem it solves. Link the task. -->

## Type of change
- [ ] fix (PATCH)   - [ ] feat (MINOR)   - [ ] breaking (MAJOR)
- [ ] chore / docs / refactor / test / ci (no release)

## Base branch
- [ ] feature/* → `develop`
- [ ] release/* or hotfix/* → `master` (+ back-merge into `develop`)

## PR dependencies
Depends-on: none
<!-- External prerequisites that must merge first: replace none with #123, #456.
Work fully included in a coordinated integration is recorded below, not falsely
claimed to have merged independently. Required by merge:auto. -->

<!-- Coordinated integration only: record source PR/branch, frozen full HEAD SHA,
included scope and conflict-resolution decisions in this PR body. Ordinary PRs
need no extra table. See docs/CI.md: 多 Agent 协调集成. One coordinator owns the
integration branch; pause source PR auto-merge and confirm dequeue before takeover.
Review/test the complete combined candidate; source green checks are not inherited. -->

## Backlog closeout
Backlog: none
<!-- List every changed task: TASK-1=done, TASK-2=verify, TASK-3=continue,
TASK-4=superseded:TASK-3. done requires all AC already evidenced and checked;
verify keeps started work In Progress with open acceptance; superseded preserves history and its successor.
Use recorded for cleanup/status updates already committed; it validates without mutating the task again.
verify:delivery --merged applies this line via CLI after exact merged verification.
Use none only when this PR has no task updates. -->

## How to test
1.

## Checklist
- [ ] PR < ~400 lines (or explained why not)
- [ ] Tests added/updated and passing locally
- [ ] No secrets/PII in diff
- [ ] Breaking changes documented + migration notes
- [ ] Backlog task status updated
- [ ] One independent slice, or a scoped coordinated integration with frozen sources; external dependencies have landed
- [ ] After merge, compare the exact PR head before deleting its branch/worktree; retain dirty files, independent commits and unique evidence

## Screenshots / logs

<!-- Source/base/head, fresh command results and evidence paths. For candidate/UI
claims: current receipt/run and actual human review scope. For integration:
check + presentation + engineering-posix, actual checkout identity, traceable
independent review (or GitHub-verified --low-risk-docs waiver). Offline PASS does not imply official import or gameplay PASS. -->
