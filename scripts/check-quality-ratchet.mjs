import {writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {requireLuaTool} from './setup-lua-static.mjs';
import {parseDiagnostics} from './check-lua-static.mjs';
import {analyzeSources} from './check-architecture.mjs';
import {architectureSources,measureSources,dependencyCycles} from './lua-quality-metrics.mjs';
import {evaluateQualityRatchet} from './quality-ratchet-policy.mjs';

const sha=v=>/^[a-f0-9]{40}$/.test(v??'');
const lua=file=>file.startsWith('src/lua/')&&file.endsWith('.lua')&&!file.split('/').some(p=>p==='..'||p==='.'||!p)&&!file.includes(String.fromCharCode(92))&&!file.includes(String.fromCharCode(0));
const git=(args,options={})=>{
  const r=spawnSync('git',args,{encoding:'utf8',timeout:30000,maxBuffer:8*1024*1024,...options});
  if(r.error||r.status!==0)throw Error('git '+args[0]+': '+(r.error?.message??r.stderr??r.status));
  return r.stdout;
};
export function parseChangedLua(output){
  const words=output.split(String.fromCharCode(0));
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
// The receipt names commits, so both source graphs must come from Git objects,
// not from mutable checkout bytes (including ignored or untracked Lua files).
export function committedSources(revision){
  if(!sha(revision))throw Error('Exact source revision required');
  const entries=git(['ls-tree','-r','-z','--full-tree',revision,'--','src/lua'])
    .split(String.fromCharCode(0)).filter(Boolean).map(row=>{
      const match=/^(100644|100755) blob ([a-f0-9]{40})\t([\s\S]+)$/.exec(row);
      if(!match)throw Error('Unsupported committed source entry: '+row);
      return {oid:match[2],file:match[3]};
    }).filter(row=>row.file.endsWith('.lua'));
  if(!entries.length)throw Error('No committed Lua sources discovered');
  for(const {file} of entries)if(!lua(file))throw Error('Invalid committed Lua source path '+file);
  const output=git(['cat-file','--batch'],{
    input:entries.map(row=>row.oid).join('\n')+'\n',encoding:null
  });
  const sources={};let offset=0;
  for(const {oid,file} of entries){
    const end=output.indexOf(10,offset);
    if(end<0)throw Error('Missing Git source object header');
    const match=/^([a-f0-9]{40}) blob (0|[1-9]\d*)$/.exec(output.subarray(offset,end).toString('ascii'));
    const size=Number(match?.[2]);
    if(match?.[1]!==oid||!Number.isSafeInteger(size))throw Error('Invalid Git source object header');
    offset=end+1;
    if(output[offset+size]!==10)throw Error('Incomplete Git source object');
    sources[file]=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(output.subarray(offset,offset+size));
    offset+=size+1;
  }
  if(offset!==output.length)throw Error('Unexpected Git source object bytes');
  return sources;
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
function measure(changedSources,tool,luacheckConfig){
  if(!Object.keys(changedSources).length)return [];
  const root=mkdtempSync(join(tmpdir(),'abyss-quality-ratchet-'));
  try{
    writeFileSync(join(root,'.luacheckrc'),luacheckConfig);
    for(const [file,source] of Object.entries(changedSources)){
      if(!lua(file))throw Error('Invalid Lua source path '+file);
      const path=resolve(root,file);
      if(!path.startsWith(root+'/')&&!path.startsWith(root+String.fromCharCode(92)))throw Error('Source escaped temp root');
      mkdirSync(dirname(path),{recursive:true});
      writeFileSync(path,source);
    }
    const r=spawnSync(tool.file,['src/lua','--formatter','plain','--codes','--ranges','--no-color',
      '--max-cyclomatic-complexity','0','--only','561'],
      {cwd:root,encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
    if(r.error||r.signal||![0,1].includes(r.status)||r.stderr?.trim())
      throw Error('Pinned Luacheck failed: '+(r.error?.message??r.stderr??r.status));
    const result=measureSources(changedSources,parseDiagnostics(r.stdout),{ratchetIdentity:true});
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
  const changes=parseChangedLua(git(['diff','--name-status','--no-renames','-z',base,head,'--',':(top,glob)src/lua/**/*.lua']));
  const report={schemaVersion:1,base,head,changedLua:changes.map(c=>c.file),status:'pass',errors:[]};
  if(changes.length){
    const current=committedSources(head),previous=committedSources(base),oldFiles={},newFiles={};
    for(const {status,file} of changes){
      if(status!=='A'){
        if(!(file in previous))throw Error('Base Lua source missing: '+file);
        oldFiles[file]=previous[file];
      }
      if(status!=='D'){
        if(!(file in current))throw Error('Changed Lua source missing: '+file);
        newFiles[file]=current[file];
      }else if(file in current)throw Error('Deleted Lua file still exists: '+file);
    }
    const tool=pinnedTool(),policy=JSON.parse(git(['show',head+':config/architecture.json']));
    const luacheckConfig=git(['show',head+':.luacheckrc']);
    const oldGraph=graph(previous,policy),newGraph=graph(current,policy);
    if(newGraph.errors.length)throw Error('Current architecture invalid: '+JSON.stringify(newGraph.errors.slice(0,5)));
    report.errors=evaluateQualityRatchet({
      beforeModules:measure(oldFiles,tool,luacheckConfig),afterModules:measure(newFiles,tool,luacheckConfig),
      beforeCycles:oldGraph.cycles,afterCycles:newGraph.cycles
    });
    report.status=report.errors.length?'blocked':'pass';
    report.sccBefore=oldGraph.cycles.map(c=>c.members.length);
    report.sccAfter=newGraph.cycles.map(c=>c.members.length);
  }
  mkdirSync('build',{recursive:true});
  writeFileSync('build/quality-ratchet.json',JSON.stringify(report,null,2)+String.fromCharCode(10));
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
