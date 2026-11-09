import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {requireLuaTool} from '../../scripts/setup-lua-static.mjs';
import {parseDiagnostics,reviewResponsibilityComplexity} from '../../scripts/check-lua-static.mjs';

const file='src/lua/abyss_map.lua';
const names=['emeraldNode','emeraldSelectionShape','emeraldSelectionOwner','markedEmeraldNode'];
const errors=(source,rows)=>reviewResponsibilityComplexity(rows,{[file]:source}).errors.filter(e=>e.file===file);

test('Map emerald owner and all extracted/nested responsibilities enforce complete pinned CC15 measurements',t=>{
  const tool=requireLuaTool(),dir=mkdtempSync(join(tmpdir(),'map-emerald-cc-'));
  const source=readFileSync(file,'utf8').replaceAll('\r\n','\n');
  const before=readFileSync('tests/fixtures/map-emerald-before.lua','utf8').replaceAll('\r\n','\n');
  const measure=text=>{
    const input=join(dir,'map.lua');writeFileSync(input,text);
    const result=spawnSync(tool.file,[input,'--formatter','plain','--codes','--ranges','--no-color',
      '--max-cyclomatic-complexity','0','--only','561'],{encoding:'utf8',timeout:10000});
    assert([0,1].includes(result.status),result.stdout+result.stderr);assert.equal(result.stderr,'');
    return parseDiagnostics(result.stdout).map(r=>({...r,file}));
  };
  try{
    const current=measure(source);assert.deepEqual(errors(source,current),[]);
    const old=measure(before);
    assert(old.some(r=>r.message.includes("function 'emeraldNode'")&&r.message.includes('(38 > 0)')));
    assert(errors(before,old).some(e=>e.message.includes('38 exceeds 15')));
    const branches=Array.from({length:16},(_,i)=>`if _G.emeraldProbe==${i} then _G.emeraldProbe=${i+1} end`).join('\n');
    for(const name of names){
      const measured=current.find(r=>r.message.includes(`function '${name}'`));assert(measured,name);
      assert(errors(source,current.filter(r=>r!==measured)).some(e=>e.message.includes('missing')),name+' missing');
      assert(errors(source,[...current,measured]).some(e=>e.message.includes('Duplicate')),name+' duplicate');
      assert(errors(source,current.map(r=>r===measured?{...r,column:r.column+1}:r)).some(e=>e.message.includes('AST')),name+' coordinate');
      const signature=new RegExp(`(local function ${name}\\([^\\n]*\\)\\n)`);
      const match=source.match(signature);assert(match,name);
      const mutant=source.replace(signature,match[0]+branches+'\n');
      assert(errors(mutant,measure(mutant)).some(e=>e.message.includes(`function '${name}'`)&&e.message.includes('exceeds 15')),name);
      const nested=source.replace(signature,match[0]+' local probe=function()\n'+branches+'\n end\n probe()\n');
      assert(errors(nested,measure(nested)).some(e=>e.message.includes('17 exceeds 15')),name+' nested');
    }
    t.diagnostic(current.filter(r=>names.some(name=>r.message.includes(`function '${name}'`))).map(r=>r.message).join('; '));
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('Map governance changes only emerald owner span and explicitly governs every new helper',()=>{
  const source=readFileSync(file,'utf8').replaceAll('\r\n','\n');
  const before=readFileSync('tests/fixtures/map-emerald-before.lua','utf8').replaceAll('\r\n','\n');
  assert.equal(source.slice(0,source.indexOf('-- Selection shape is independent')),before.slice(0,before.indexOf('local function emeraldNode')));
  assert.equal(source.slice(source.indexOf('\nlocal function prepareEmerald')),before.slice(before.indexOf('\nlocal function prepareEmerald')));
  const span=source.slice(source.indexOf('local function emeraldSelectionShape'),source.indexOf('\nlocal function prepareEmerald'));
  assert.deepEqual([...span.matchAll(/local function (\w+)\(/g)].map(m=>m[1]).sort(),names.toSorted());
});
