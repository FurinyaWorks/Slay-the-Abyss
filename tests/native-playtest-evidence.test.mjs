import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { sha256 } from '../scripts/evidence-files.mjs';
import { requireStartupEvidence } from '../scripts/native-playtest-evidence.mjs';

test('startup uses raw decoding and actual run request, not claimed metadata',()=>{
  const runDir=mkdtempSync(join(tmpdir(),'abyss-run-')),runId=runDir.split(/[\\/]/).at(-1);
  const mapPath=join(runDir,'candidate.gil'),file=join(runDir,'log.gia');
  writeFileSync(mapPath,'fixture candidate');
  const prints=[{clientScript:true,text:'ABYSS_BUILD fixture-build'},{clientScript:true,text:'ABYSS_UI ready'}];
  // Explicit JSON format test double. The production CLI injects MCP inspectDebugLog.
  const decodeLog=bytes=>({sourceHash:sha256(bytes),prints:JSON.parse(bytes),nextOffset:null});
  const save=rows=>writeFileSync(file,JSON.stringify(rows));save(prints);
  writeFileSync(join(runDir,'request.json'),JSON.stringify({runDir,mapPath,clientScriptLog:true}));
  const expected={runDir,runId,mapPath,buildId:'fixture-build',candidateHash:sha256(readFileSync(mapPath)),startedAt:0};
  const status={state:'succeeded',runId,runDir,steps:[{step:'log-subscribed',clientScripts:true}],log:{file,prints}};
  const check=(value=status,context=expected)=>requireStartupEvidence(value,context,{decodeLog,parserVersion:'fixture-json-v1'});
  try {
    assert.equal(check().status,'pass');
    assert.throws(()=>check({...status,steps:[]}),/subscription/);
    assert.throws(()=>check({...status,runId:'wrong'}),/another run/);
    assert.throws(()=>check(status,{...expected,candidateHash:'f'.repeat(64)}),/candidate/);
    assert.throws(()=>check(status,{...expected,startedAt:Date.now()+10000}),/Stale/);
    assert.throws(()=>check({...status,log:{...status.log,prints:[prints[1]]}}),/differ/);
    assert.throws(()=>check(status,{...expected,buildId:'old'}),/never reached ready/);
    save([]);assert.throws(()=>check(),/differ/);
    writeFileSync(file,'');assert.throws(()=>check(),/Empty/);
    const faults=[...prints,{clientScript:true,text:'ABYSS_UI failed startup: fixture'}];save(faults);
    assert.throws(()=>check({...status,log:{file,prints:faults}}),/runtime fault/);
    const client=text=>({clientScript:true,text});
    const build=client('ABYSS_BUILD fixture-build'),ready=client('ABYSS_UI ready');
    for(const [name,rows,accepted] of [
      ['another build cannot supply ready',[build,client('ABYSS_BUILD other-build'),ready],false],
      ['old success cannot certify a different final build',[...prints,client('ABYSS_BUILD other-build'),ready],false],
      ['old success cannot certify an incomplete restart',[...prints,build],false],
      ['old success cannot certify an incomplete different build',[...prints,client('ABYSS_BUILD other-build')],false],
      ['ready before build is insufficient',[ready,build],false],
      ['incomplete build marker invalidates old success',[...prints,client('ABYSS_BUILD')],false],
      ['malformed build identity cannot reuse old success',[...prints,client('ABYSS_BUILD\tfixture-build'),ready],false],
      ['latest matching restart reaches ready',[...prints,build,ready],true],
      ['latest expected build supersedes an earlier build',[client('ABYSS_BUILD other-build'),ready,build,ready],true],
      ['ordinary client output does not reset identity',[build,client('unrelated diagnostic'),ready],true],
      ['non-client build output cannot reset identity',[build,{clientScript:false,text:'ABYSS_BUILD other-build'},ready],true],
      ['non-client ready cannot certify a restart',[...prints,build,{clientScript:false,text:'ABYSS_UI ready'}],false],
    ]) {
      save(rows);
      const invoke=()=>check({...status,log:{file,prints:rows}});
      if(accepted)assert.equal(invoke().status,'pass',name);
      else assert.throws(invoke,/never reached ready/,name);
    }
    for(const clientScript of ['false',1]) {
      const nonClient=text=>({clientScript,text});
      for(const [rows,accepted] of [
        [[nonClient(build.text),nonClient(ready.text)],false],
        [[build,nonClient(ready.text)],false],
        [[build,nonClient('ABYSS_BUILD other-build'),ready],true],
        [[...prints,nonClient('ABYSS_UI failed fixture')],true],
      ]) {
        save(rows);
        const claims=rows.map(row=>({...row,clientScript:row.clientScript===true}));
        const invoke=()=>check({...status,log:{file,prints:claims}});
        if(accepted)assert.equal(invoke().status,'pass');
        else assert.throws(invoke,/never reached ready/);
      }
    }
    save(prints);assert.equal(check().status,'pass');
  } finally {rmSync(runDir,{recursive:true,force:true});}
});
