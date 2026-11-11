import {beforeQualityRatchetWorkflow} from './quality-ratchet-workflow.mjs';
// Project only the complete reviewed #584 Draft/Fast workflow change before
// entering older, immutable workflow contracts. Partial or duplicate wiring
// stays visible; unrelated source bytes are never removed.
const rootGate = "    if: github.event_name != 'pull_request' || github.event.pull_request.draft == false\n";
const summaryGate = "    if: ${{ !cancelled() && (github.event_name != 'pull_request' || github.event.pull_request.draft == false) }}\n";
export const draftQualityWorkflowEdits = Object.freeze([
  [
    '    types: [opened, synchronize, reopened, ready_for_review, labeled, unlabeled]\n',
    '    types: [opened, synchronize, reopened, ready_for_review, converted_to_draft, labeled, unlabeled]\n',
  ],
  ['  impact:\n    runs-on: ubuntu-slim\n', '  impact:\n' + rootGate + '    runs-on: ubuntu-slim\n'],
  [
    '    runs-on: ${{ matrix.os }}\n    timeout-minutes: 8\n    defaults:\n',
    '    runs-on: ${{ matrix.os }}\n    # Execution ceiling, not a speed target; slow affected tests stay affected.\n'
      + "    timeout-minutes: ${{ matrix.os == 'windows-2025' && 45 || 30 }}\n    defaults:\n",
  ],
  [
    '    needs: [impact, rules, fast, presentation, engineering-posix]\n    if: ${{ !cancelled() }}\n    runs-on: ubuntu-slim\n',
    '    needs: [impact, rules, fast, presentation, engineering-posix]\n' + summaryGate + '    runs-on: ubuntu-slim\n',
  ],
  [
    '  presentation:\n    # These filesystem tests include symlinks; keep the local service unprivileged.\n',
    '  presentation:\n' + rootGate + '    # These filesystem tests include symlinks; keep the local service unprivileged.\n',
  ],
  [
    '    needs: [impact, engineering-posix-shards, fast]\n    if: ${{ !cancelled() }}\n    runs-on: ubuntu-slim\n',
    '    needs: [impact, engineering-posix-shards, fast]\n' + summaryGate + '    runs-on: ubuntu-slim\n',
  ],
].map(Object.freeze));

export function beforeDraftQualityWorkflow(text) {
  const original = text;
  text = beforeQualityRatchetWorkflow(text);
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const edits = draftQualityWorkflowEdits.map(pair => pair.map(value => value.replaceAll('\n', eol)));
  if (!edits.every(([, after]) => text.split(after).length === 2)) return original;
  for (const [before, after] of edits) text = text.replace(after, before);
  return text;
}
