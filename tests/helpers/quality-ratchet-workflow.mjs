// Undo only the two complete ratchet gates in their reviewed job positions.
// This view is for immutable historical contracts, never current CI execution.
const fastBefore='      - run: npm run check:network && npm run verify:backlog && npm run check:syntax\n        if: runner.os == \'Linux\'\n';
const fastAfter='      - name: Complete affected regression set\n';
const fullBefore='      - run: npm run check:engineering\n        if: matrix.shard == 1\n';
const fullAfter='      - name: Check production platform load\n';
export const qualityRatchetWorkflowGates=Object.freeze([
`      - name: Enforce new Lua quality debt in Fast PRs
        if: runner.os == 'Linux'
        env:
          QUALITY_RATCHET_BASE: \${{ github.event.pull_request.base.sha }}
        run: node scripts/check-quality-ratchet.mjs
`,
`      - name: Enforce incremental Lua CC and SCC ratchet
        if: matrix.shard == 1 && (github.event_name == 'pull_request' || github.event_name == 'merge_group' || github.event_name == 'push')
        env:
          QUALITY_RATCHET_BASE: \${{ github.event.pull_request.base.sha || github.event.merge_group.base_sha || github.event.before }}
        run: node scripts/check-quality-ratchet.mjs
`,
]);
export function beforeQualityRatchetWorkflow(text){
 if(typeof text!=='string')return text;
 const eol=text.includes('\r\n')?'\r\n':'\n',line=value=>value.replaceAll('\n',eol);
 const contexts=[[fastBefore,qualityRatchetWorkflowGates[0],fastAfter],[fullBefore,qualityRatchetWorkflowGates[1],fullAfter]];
 const edits=contexts.map(([before,gate,after])=>[line(before+gate+after),line(before+after)]);
 if(text.split('        run: node scripts/check-quality-ratchet.mjs').length!==3
   ||qualityRatchetWorkflowGates.some(gate=>text.split(line(gate)).length!==2)
   ||!edits.every(([current])=>text.split(current).length===2))return text;
 for(const [current,prior]of edits)text=text.replace(current,prior);
 return text;
}
