import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {requireLuaTool} from './setup-lua-static.mjs';
import {parseDiagnostics} from './check-lua-static.mjs';
import {analyzeSources} from './check-architecture.mjs';
import {discoverSources,architectureSources,measureSources,dependencyCycles} from './lua-quality-metrics.mjs';
import {evaluateQualityRatchet} from './quality-ratchet-policy.mjs';

const sha=v=>/^[a-f0-9]{40}$/.test(v??'');
const lua=file=>/^src\\/lua\\/(?:[^/\\\\\\0]+\\/)*[^/\\\\\\0]+\\.lua$/.test(file)&&!file.split('/').includes('..');
const git=(args,options={})=>{
  const r=spawnSync('git',args,{encoding:'utf8',timeout:30000,maxBuffer:8*1024*1024,...options});
  if(r.error||r.status!==0)throw Error('git '+args[0]+': '+(r.error?.message??r.stderr??r.status));
  return r.stdout;
};
export function parseChangedLua(output){
  const words=output.split('\\0');
  if(words.at(-1)==='')words.pop();
  if(words.length%2)throw Error('Malformed Git name-status output');
  const changed=[];
  for(let i=0;i<words.length;i+=2){
    const status=words[i],file=words[i+1];
    if(!['A','M','D'].includes(status)||!lua(file))throw Error('Unsupported Lua change: '+status+' '+file);
    changed.push({status,file});
  }
  if(new Set(changed.map(c=>c.file)).size!==changed.length)throw Error('Duplicate changed Lua file');
  return changed;
}
function pinnedTool(){
  try{return requireLuaTool();}
  catch(error){
    if(process.env.CI!=='true'||!/Luacheck missing/.test(error.message))throw error;
    // Only a changed-Lua Fast PR needs the pinned downloader; Full already installs it.
    const setup=spawnSync(process.execPath,['scripts/setup-lua-static.mjs'],
      {encoding:'utf8',timeout:75000,maxBuffer:1024*1024});
    if(setup.error||setup.status!==0)throw Error('Pinned Luacheck setup: '+(setup.error?.message??setup.stderr??setup.status));
    return requireLuaTool();
  }
}
function measure(changedSources,tool){
  if(!Object.keys(changedSources).length)return [];
  const root=mkdtempSync(join(tmpdir(),'abyss-quality-ratchet-'));
  try{
    writeFileSync(join(root,'.luacheckrc'),readFileSync('.luacheckrc'));
    for(const [file,source] of Object.entries(changedSources)){
      if(!lua(file))throw Error('Invalid Lua source path '+file);
      const path=resolve(root,file);
      if(!path.startsWith(root+'/')&&!path.startsWith(root+'\\\\'))throw Error('Source escaped temp root');
      mkdirSync(dirname(path),{recursive:true});
      writeFileSync(path,source);
    }
    const r=spawnSync(tool.file,['src/lua','--formatter','plain','--codes','--ranges','--no-color',
      '--max-cyclomatic-complexity','0','--only','561'],
      {cwd:root,encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
    if(r.error||r.signal||![0,1].includes(r.status)||r.stderr?.trim())
      throw Error('Pinned Luacheck failed: '+(r.error?.message??r.stderr??r.status));
    const result=measureSources(changedSources,parseDiagnostics(r.stdout));
    if(result.errors.length)throw Error('Incomplete AST/CC measurement: '+JSON.stringify(result.errors.slice(0,4)));
    return result.modules;
  }finally{rmSync(root,{recursive:true,force:true});}
}
function graph(sources,policy){
  const {byModule,sourcePaths}=architectureSources(sources);
  const report=analyzeSources(byModule,policy,undefined,sourcePaths);
  if(report.errors.some(e=>/parse failed/i.test(e.message)))throw Error('Incomplete dependency graph');
  return {cycles:dependencyCycles(report.nodes,report.edges),errors:report.errors};
}
export function main(base=process.env.QUALITY_RATCHET_BASE){
  if(!sha(base))throw Error('Exact 40-digit QUALITY_RATCHET_BASE required; no implicit skip');
  const head=git(['rev-parse','HEAD']).trim();
  if(!sha(head))throw Error('Invalid HEAD');
  try{git(['cat-file','-e',base+'^{commit}']);}
  catch(error){
    if(process.env.CI!=='true')throw error;
    // A shallow hosted checkout may lack the exact PR/queue parent.
    git(['-c','credential.helper=','fetch','--depth=1','--no-tags','origin',base]);
    git(['cat-file','-e',base+'^{commit}']);
  }
  const changes=parseChangedLua(git(['diff','--name-status','--no-renames','-z',base,head,'--','src/lua']));
  const report={schemaVersion:1,base,head,changedLua:changes.map(c=>c.file),status:'pass',errors:[]};
  if(changes.length){
    const current=discoverSources(),previous={...current},oldFiles={},newFiles={};
    for(const {status,file} of changes){
      if(status==='A')delete previous[file];
      else{const source=git(['show',base+':'+file]);previous[file]=source;oldFiles[file]=source;}
      if(status!=='D'){
        if(!(file in current))throw Error('Changed Lua source missing: '+file);
        newFiles[file]=current[file];
      }else if(file in current)throw Error('Deleted Lua file still exists: '+file);
    }
    const tool=pinnedTool(),policy=JSON.parse(readFileSync('config/architecture.json','utf8'));
    const oldGraph=graph(previous,policy),newGraph=graph(current,policy);
    if(newGraph.errors.length)throw Error('Current architecture invalid: '+JSON.stringify(newGraph.errors.slice(0,5)));
    report.errors=evaluateQualityRatchet({
      beforeModules:measure(oldFiles,tool),afterModules:measure(newFiles,tool),
      beforeCycles:oldGraph.cycles,afterCycles:newGraph.cycles
    });
    report.status=report.errors.length?'blocked':'pass';
    report.sccBefore=oldGraph.cycles.map(c=>c.members.length);
    report.sccAfter=newGraph.cycles.map(c=>c.members.length);
  }
  mkdirSync('build',{recursive:true});
  writeFileSync('build/quality-ratchet.json',JSON.stringify(report,null,2)+'\\n');
  for(const e of report.errors)console.error(e.file+':'+e.line+': '+e.message);
  console.log('Quality ratchet '+report.status+': '+changes.length+' changed Lua; '+
    report.errors.length+' new violations; '+base.slice(0,8)+' -> '+head.slice(0,8));
  if(report.errors.length)process.exitCode=1;
  return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    const args=process.argv.slice(2);
    if(args.length&& (args.length!==2||args[0]!=='--base'))throw Error('Usage: check-quality-ratchet.mjs [--base <SHA>]');
    main(args.length?args[1]:undefined);
  }catch(error){console.error('Quality ratchet failed closed: '+error.message);process.exitCode=1;}
}
