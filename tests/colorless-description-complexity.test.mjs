import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {requireLuaTool} from '../scripts/setup-lua-static.mjs';
const file='src/lua/abyss_colorless_cards.lua';
const names=['M.describe','describeCardEnhancement','describeCardMovement','describeCardGeneration','describeCombatEffect','describeColorlessEffect','describeEffect'];
test('pinned Colorless description and all extracted functions remain below CC30 with real regression controls',t=>{
 const tool=requireLuaTool(),dir=mkdtempSync(join(tmpdir(),'colorless-description-cc-'));
 const source=readFileSync(file,'utf8').replaceAll('\r\n','\n');
 const measure=text=>{const input=join(dir,'source.lua');writeFileSync(input,text);const result=spawnSync(tool.file,[input,'--formatter','plain','--codes','--ranges','--no-color','--max-cyclomatic-complexity','0','--only','561'],{encoding:'utf8',timeout:10000});assert([0,1].includes(result.status),result.stdout+result.stderr);assert.equal(result.stderr,'');const rows=[...result.stdout.matchAll(/cyclomatic complexity of (.+?) is too high \((\d+) > 0\)/g)].map(m=>({subject:m[1],cc:Number(m[2])}));assert(rows.length>0,'formal W561 output required');return rows;};
 try{
  const rows=measure(source);for(const name of names){const matches=rows.filter(r=>r.subject===`function '${name}'`);assert.equal(matches.length,1,name+' complete unique measurement');assert(matches[0].cc<=30,name);}
  assert(rows.every(r=>r.cc<=30),'all functions including anonymous callbacks governed');
  const before=measure(readFileSync('tests/fixtures/colorless-description-before.lua','utf8'));assert(before.some(r=>r.subject==="function 'M.describe'"&&r.cc===56));
  const branches=Array.from({length:31},(_,i)=>`if _G.colorlessComplexityProbe==${i} then _G.colorlessComplexityProbe=${i+1} end`).join('\n');
  for(const name of names){const signature=new RegExp(`(function ${name.replaceAll('.','\\.')}\\([^\\n]*\\)\\n)`);const m=source.match(signature);assert(m,name);assert(measure(source.replace(signature,m[0]+branches+'\n')).some(r=>r.subject===`function '${name}'`&&r.cc>30),name+' reject regression');}
  const nested=source.replace('function M.describe(d,dynamic)\n','function M.describe(d,dynamic)\n (function()\n'+branches+'\n end)()\n');assert.notEqual(nested,source);assert(measure(nested).some(r=>r.subject==='function'&&r.cc>30),'anonymous regression rejected');
  t.diagnostic(JSON.stringify(rows.filter(r=>names.some(n=>r.subject===`function '${n}'`))));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
