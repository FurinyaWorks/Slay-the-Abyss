import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {spawnSync,execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
const dir='.artifacts/emerald-cost';
const files=['tests/ci-host-timing-calibration.test.mjs','tests/ci-windows-shape-expansion.test.mjs','tests/class-potion-orb-source-inverse.test.mjs','tests/watcher-actor-source-inverse.test.mjs'];
const hash=b=>createHash('sha256').update(b).digest('hex');
const paths=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean).sort();
const snapshot=()=>Object.fromEntries(paths.map(p=>[p,existsSync(p)?hash(readFileSync(p)):null]));
const save=(name,value)=>{const bytes=Buffer.from(JSON.stringify(value,null,2)+'\n'),compressed=gzipSync(bytes,{mtime:0});writeFileSync(`${dir}/${name}.json.gz`,compressed);return {path:`${dir}/${name}.json.gz`,sha256:hash(compressed),uncompressedSha256:hash(bytes),files:Object.keys(value).length};};
const results=[];
for(const file of files){
 const stem=file.split('/').at(-1).replace('.test.mjs','');
 const before=snapshot(),beforeReceipt=save(`${stem}-before`,before);
 const args=['--test','--test-concurrency=1','--test-reporter=spec','--test-reporter-destination=stdout','--test-reporter=./scripts/ci-timing-reporter.mjs',`--test-reporter-destination=${dir}/${stem}.jsonl`,file];
 const env={...process.env};delete env.NODE_TEST_CONTEXT;
 const startedAt=new Date().toISOString(),start=performance.now();
 const run=spawnSync(process.execPath,args,{env,encoding:'utf8',timeout:180000,maxBuffer:16*1024*1024});
 const processWallMs=performance.now()-start,finishedAt=new Date().toISOString();
 const log=Buffer.from(run.stdout+'\n'+run.stderr);writeFileSync(`${dir}/${stem}.log`,log);writeFileSync(`${dir}/${stem}.log.gz`,gzipSync(log,{mtime:0}));
 const after=snapshot(),afterReceipt=save(`${stem}-after`,after),changed=paths.filter(p=>before[p]!==after[p]);
 const value=key=>{const match=log.toString().match(new RegExp('ℹ '+key+' ([\\d.]+)'));return match?Number(match[1]):null;};
 const native=readFileSync(`${dir}/${stem}.jsonl`),receipt={testFile:file,command:[process.execPath,...args],startedAt,finishedAt,returncode:run.status,signal:run.signal,error:run.error?.message??null,processWallMs,nodeTotalDurationMs:value('duration_ms'),tests:value('tests'),pass:value('pass'),fail:value('fail'),cancelled:value('cancelled'),skipped:value('skipped'),nativeSummary:JSON.parse(native.toString().trim()),before:beforeReceipt,after:afterReceipt,changedInputs:changed,inputsMatched:changed.length===0,log:{path:`${dir}/${stem}.log.gz`,sha256:hash(readFileSync(`${dir}/${stem}.log.gz`)),uncompressedSha256:hash(log)},native:{path:`${dir}/${stem}.jsonl`,sha256:hash(native)},node:process.version,platform:process.platform,architecture:process.arch,localHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceTree:execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim()};
 results.push(receipt);writeFileSync(`${dir}/complete-file-observations.json`,JSON.stringify(results,null,2)+'\n');
 console.log(JSON.stringify({file,status:run.status,processWallMs,nodeTotalDurationMs:receipt.nodeTotalDurationMs,native:receipt.nativeSummary.durationMs,tests:receipt.tests,pass:receipt.pass,fail:receipt.fail,changed:changed.length}));
 if(run.status!==0||changed.length||receipt.fail!==0)process.exit(1);
}
