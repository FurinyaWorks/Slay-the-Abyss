import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,symlinkSync,realpathSync} from 'node:fs';
import {join,dirname,resolve,relative,isAbsolute} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {sourceEpoch,ciRepairSourceEpoch} from './closeout-source-epoch.mjs';
import {stsStylePriorRuntime} from './sts-style-prior-runtime.mjs';
import {assertStsStyleCiCurrent} from './sts-style-ci-source.mjs';
import {historicalStsStyleFixtures} from './historical-sts-style-runner.mjs';
import {discoverJs} from '../../scripts/ci-shards.mjs';
import {runLua} from '../../scripts/test-lua.mjs';
const script=process.argv[2],timeout=Number(process.argv[3]),started=Date.now(),root=fileURLToPath(new URL('../..',import.meta.url));
assert(historicalStsStyleFixtures.includes(script));assert(Number.isSafeInteger(timeout)&&timeout>0);
const remaining=()=>{const value=timeout-(Date.now()-started);assert(value>0,'historical StS fixture exceeded original total deadline');return value;};
const raw=p=>readFileSync(join(root,p),'utf8');
const config='config/architecture.json';
assert.equal(sourceEpoch.preCombinedSource(config,raw(config),{target:'stsStylePrior',readSource:raw}),ciRepairSourceEpoch.proof.current[config].source,'all current production owners authenticate before historical materialization');
assertStsStyleCiCurrent(discoverJs(),(p,e)=>readFileSync(join(root,p),e));
assert.equal(createHash('sha256').update(raw(script).replaceAll('\r\n','\n')).digest('hex'),stsStylePriorRuntime.files[script].sha256,'full original Lua contract is unchanged');
const directory=mkdtempSync(join(tmpdir(),'abyss-sts-style-'));
try{
 for(const [path,row]of Object.entries(stsStylePriorRuntime.files)){
  assert(!isAbsolute(path)&&!path.split('/').includes('..'),'fixed historical input');
  const target=join(directory,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,row.source);
 }
 for(const path of ['art','node_modules','tests/helpers','tests/fixtures']){
  mkdirSync(dirname(join(directory,path)),{recursive:true});symlinkSync(join(root,path),join(directory,path),process.platform==='win32'?'junction':'dir');
 }
 console.log('Historical StS replay: exact complete cb1 source and builders; original 12-slot Lua contract retained; current browser covered separately.');
 for(const builder of ['build-lua-data.mjs','build-ui.mjs','build-ui-theme.mjs']){
  const r=spawnSync(process.execPath,['scripts/'+builder],{cwd:directory,encoding:'utf8',timeout:remaining(),windowsHide:true});
  assert.ifError(r.error);assert.equal(r.status,0,r.stdout+r.stderr);
 }
 const r=runLua(join(directory,script),{cwd:directory,timeout:remaining()});
 process.stdout.write(r.stdout);process.stderr.write(r.stderr);process.exitCode=r.status;
}finally{
 const actual=realpathSync(directory),within=relative(resolve(tmpdir()),actual);
 assert(within&&!isAbsolute(within)&&!within.startsWith('..')&&within.startsWith('abyss-sts-style-'),'owned historical StS temporary root');
 rmSync(actual,{recursive:true,force:true});
}
