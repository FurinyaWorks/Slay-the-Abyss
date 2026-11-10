// Opt-in offline whole-campaign evidence. Not a default CI fixture and not
// official-client/platform evidence; existing test timeouts remain unchanged.
import {spawn,spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {createWriteStream,existsSync,mkdirSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildUI} from './build-ui.mjs';
import {buildLuaData,luaString,toLua} from './build-lua-data.mjs';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const args=process.argv.slice(2);let seed=2,capture=false,output;
for(let i=0;i<args.length;i++){
 const arg=args[i];
 if(arg==='--capture'){if(capture)throw Error('Duplicate --capture');capture=true;}
 else if(arg==='--seed'){seed=Number(args[++i]);if(!Number.isSafeInteger(seed)||seed<0)throw Error('Expected nonnegative integer seed');}
 else if(arg==='--output'){if(output)throw Error('Duplicate --output');output=args[++i];if(!output)throw Error('Missing output directory');}
 else throw Error('Unknown argument '+arg);
}
process.chdir(root);
output=resolve(output??`.artifacts/pr588/campaign-validation/run-${new Date().toISOString().replaceAll(':','-')}`);
const artifactRoot=resolve('.artifacts');
if(!output.startsWith(artifactRoot+'/'))throw Error('Evidence output must stay inside .artifacts');
if(existsSync(output))throw Error('Refusing to overwrite an existing campaign evidence directory');
mkdirSync(output,{recursive:true});
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function files(directory){return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
 const path=join(directory,entry.name);return entry.isDirectory()?files(path):entry.isFile()?[path]:[];
});}
function inputs(){
 // Conservative source closure: include all production/build/data/config and
 // reused fixture/policy sources, not just a guessed list of Lua requires.
 const paths=['package.json','package-lock.json',...['src/lua','scripts','data','config','tests/lua/support','tests/helpers'].flatMap(files)].sort();
 return Object.fromEntries(paths.map(path=>[path.replaceAll('\\','/'),hash(path)]));
}
const before=inputs();const sourceClosure=digest(before);
const git=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'});
if(git.status!==0)throw Error(git.stderr);
const dirty=spawnSync('git',['status','--porcelain'],{encoding:'utf8'});
if(dirty.status!==0)throw Error(dirty.stderr);
const generated=join(output,'generated');mkdirSync(generated);
buildLuaData('data',join(generated,'abyss_data.lua'));
buildUI(generated,undefined,{officialAssets:true,nativePageLifecycle:true});
const modules=readdirSync(generated).filter(n=>n.endsWith('.lua')).map(n=>n.slice(0,-4)).sort();
const generatedHashes=Object.fromEntries(files(generated).sort().map(p=>[relative(generated,p),hash(p)]));
const source=`local generated=${luaString(generated.replaceAll('\\','/'))}
package.path=generated..'/?.lua;src/lua/?.lua'
for _,name in ipairs(${toLua(modules)})do package.preload[name]=assert(loadfile(generated..'/'..name..'.lua'))end
OFFICIAL_CAMPAIGN_SEED=${seed}
OFFICIAL_CAMPAIGN_CAPTURE=${capture}
OFFICIAL_CAMPAIGN_SOURCE=${luaString(sourceClosure)}
dofile('scripts/official-assets-campaign.lua')
`;
writeFileSync(join(output,'entry.lua'),source);
const cli=createRequire(import.meta.url).resolve('fengari-node-cli/src/lua-cli.js');
const stdout=createWriteStream(join(output,'stdout.log')),stderr=createWriteStream(join(output,'stderr.log'));
const startedAt=new Date().toISOString(),start=performance.now();
const child=spawn(process.execPath,[cli,'-e',source],{cwd:root,env:{...process.env,LUA_INIT:'',LUA_INIT_5_3:''}});
child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
let pending='',passed=false,failure,watchdog;const checkpoints=[];
const stop=reason=>{failure??=reason;child.kill('SIGTERM');};
// Dedicated campaign limits only. No changes to ordinary fixture/CI budgets.
const reset=()=>{clearTimeout(watchdog);watchdog=setTimeout(()=>stop('No campaign progress for 30000ms'),30000);};
reset();const overall=setTimeout(()=>stop('Campaign exceeded standalone 600000ms budget'),600000);
function line(value){
 if(value.startsWith('CAMPAIGN_ACTION ')||value.startsWith('CAMPAIGN_CHECKPOINT '))reset();
 if(value.startsWith('CAMPAIGN_CHECKPOINT ')){try{checkpoints.push(JSON.parse(value.slice(20)));}catch(error){stop('Invalid checkpoint JSON: '+error.message);}}
 if(value.startsWith('OFFICIAL_VISUAL_SCENES ')){try{JSON.parse(value.slice(23));writeFileSync(join(output,'visual-scenes.json'),value.slice(23)+'\n');}catch(error){stop('Invalid visual JSON: '+error.message);}}
 if(value==='OFFICIAL_CAMPAIGN_PASS')passed=true;
 if(value.startsWith('CAMPAIGN_ROOM ')||value.startsWith('CAMPAIGN_ACT_TWO')||value.startsWith('CAMPAIGN_RESULT ')||value==='OFFICIAL_CAMPAIGN_PASS')console.log(value);
}
child.stdout.on('data',chunk=>{stdout.write(chunk);pending+=chunk;let i;while((i=pending.indexOf('\n'))>=0){line(pending.slice(0,i));pending=pending.slice(i+1);}});
child.stderr.on('data',chunk=>{stderr.write(chunk);process.stderr.write(chunk);});
child.on('error',error=>{failure=error.message;});
const {code,signal}=await new Promise(resolve=>child.on('close',(code,signal)=>resolve({code,signal})));
clearTimeout(watchdog);clearTimeout(overall);if(pending)line(pending);
await Promise.all([new Promise(resolve=>stdout.end(resolve)),new Promise(resolve=>stderr.end(resolve))]);
const after=inputs();const sourceStable=digest(after)===sourceClosure;
if(!sourceStable)failure??='Source closure changed during execution';
if(code!==0||signal||!passed)failure??='Campaign did not reach victory and restart assertions';
const report={kind:'offline-natural-continuous-host-ui-campaign',platformVerified:false,physicalInputVerified:false,
 seed,capture,command:`node scripts/verify-official-campaign.mjs --seed ${seed}${capture?' --capture':''} --output ${relative(root,output)}`,
 startedAt,finishedAt:new Date().toISOString(),elapsedMs:performance.now()-start,nodeVersion:process.version,
 sourceCommit:git.stdout.trim(),sourceDirty:dirty.stdout.length>0,sourceStatus:dirty.stdout,
 hashAlgorithm:'sha256',sourceClosure,inputHashes:before,inputHashesAfter:after,sourceStable,generatedHashes,
 cliHash:hash(cli),entryHash:hash(join(output,'entry.lua')),stdoutHash:hash(join(output,'stdout.log')),stderrHash:hash(join(output,'stderr.log')),
 budgets:{noProgressMs:30000,totalMs:600000,existingFixtureBudgetsChanged:false},checkpoints,exitCode:code,signal,
 status:failure?'failed':'passed',failure:failure??null};
writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,exitCode:code,elapsedMs:report.elapsedMs,sourceClosure,sourceStable,report:relative(root,join(output,'report.json'))}));
process.exitCode=failure?1:0;
