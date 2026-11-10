import {spawnSync} from 'node:child_process';
import {readFileSync,readdirSync,statSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function inputManifest(){
 const files={};
 function add(path){const bytes=readFileSync(path);files[path]={bytes:bytes.length,sha256:hash(bytes)};if(/\.(?:mjs|js|json|lua|yaml|yml|txt)$/.test(path))files[path].lfSha256=hash(bytes.toString('utf8').replaceAll('\r\n','\n'));}
 function walk(dir,filter){if(!existsSync(dir))return;for(const row of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const path=join(dir,row.name);if(row.isDirectory())walk(path,filter);else if(row.isFile()&&filter(path))add(path);}}
 for(const dir of ['src','scripts','config','tests','data','build/lua','.github'])walk(dir,()=>true);
 walk('docs/evidence',p=>!p.endsWith('.md')&&!p.startsWith('docs/evidence/m7-ending-terminal-20261110/'));
 walk('docs/evidence/m7-ending-terminal-20261110',p=>p.endsWith('.mjs'));
 for(const dir of ['build/tools','node_modules'])walk(dir,()=>true);
 for(const path of ['package.json','package-lock.json','.luacheckrc','.gitattributes',process.execPath])if(existsSync(path))add(path);
 const tool=spawnSync('build/tools/luacheck/luacheck',['--version'],{encoding:'utf8'});if(tool.status!==0)throw Error('Luacheck version collection failed');
 const packageVersions=Object.fromEntries(readdirSync('node_modules').filter(name=>existsSync(join('node_modules',name,'package.json'))).map(name=>[name,JSON.parse(readFileSync(join('node_modules',name,'package.json'))).version]));
 return {luacheckVersion:tool.stdout.trim(),packageVersions,collectedAt:new Date().toISOString(),nodeVersion:process.version,scope:'Superset of executable source, helpers/oracles, Lua fixtures/generated Lua, data/config text, runner scripts, Lua tool and interpreter dependencies. Includes historical evidence and workflow inputs; excludes Markdown and mutable build reports. Directory superset capture is not an OS-wide dynamic dependency trace.',files};
}
