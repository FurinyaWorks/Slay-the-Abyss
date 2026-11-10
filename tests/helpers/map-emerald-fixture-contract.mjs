import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {emeraldFixturePath,emeraldFixtureBeforeSource,emeraldFixtureAfterSha256,preEmeraldFixtureSource} from './map-emerald-fixture-source-inverse.mjs';
const require=createRequire(import.meta.url);
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
const hash=value=>createHash('sha256').update(value).digest('hex');
export function registerEmeraldFixtureContracts({test,assert,readFileSync}){
 const read=file=>readFileSync(file,'utf8').replaceAll('\r\n','\n');
 test('fixed seed setup reuses only construction and gives every scenario independent nested state',()=>{
  const source=read(emeraldFixturePath),marker='local function invoke(';
  assert.equal(source.split(marker).length,2,'one exact fixture setup boundary');
  const setup=source.slice(0,source.indexOf(marker));
  const probe=`
local first=base();local second=base()
assert(first~=second and first.mapRng~=second.mapRng,'FIXTURE_RNG_ALIAS')
assert(first.mapRng~=initialMapRng and first.mapRng.words~=initialMapRng.words,'FIXTURE_TEMPLATE_ALIAS')
assert(first.mapRng.words~=second.mapRng.words,'FIXTURE_WORDS_ALIAS')
local expected=R.snapshot(R.fromSeed('42'))
local function pristine(rng)
 assert(rng.counter==expected.counter and #rng.words==#expected.words,'FIXTURE_MUTATION_LEAK')
 for i,value in ipairs(expected.words)do assert(rng.words[i]==value,'FIXTURE_MUTATION_LEAK')end
end
pristine(first.mapRng);pristine(second.mapRng)
first.mapRng.words[1]='mutated';first.mapRng.words[2]='mutated';first.mapRng.counter=99
pristine(second.mapRng);pristine(initialMapRng);pristine(base().mapRng)
`;
  const run=text=>{
   const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
   try{const status=lauxlib.luaL_dostring(L,to_luastring("package.path='src/lua/?.lua;'..package.path\n"+text+probe));return {status,error:status===lua.LUA_OK?null:to_jsstring(lua.lua_tostring(L,-1))};}
   finally{lua.lua_close(L);}
  };
  assert.deepEqual(run(setup),{status:lua.LUA_OK,error:null});
  for(const [replacement,message]of [
   ['initialMapRng','FIXTURE_RNG_ALIAS'],
   ['{words=initialMapRng.words,counter=initialMapRng.counter}','FIXTURE_TEMPLATE_ALIAS'],
   ["{words={'bad','bad'},counter=0}",'FIXTURE_MUTATION_LEAK'],
  ]){
   assert.equal(setup.split('mapRng=copy(initialMapRng)').length,2);
   const result=run(setup.replace('mapRng=copy(initialMapRng)','mapRng='+replacement));
   assert.notEqual(result.status,lua.LUA_OK);assert.match(result.error,new RegExp(message));
  }
 });
 test('fixture inverse preserves original complete input and refuses every foreign or changed candidate',()=>{
  const current=read(emeraldFixturePath);assert.equal(hash(current),emeraldFixtureAfterSha256);
  const expected=emeraldFixtureBeforeSource.replace('local trace={}',"-- Only immutable seed setup is shared inside this VM; each scenario gets fresh tables.\nlocal initialMapRng=R.snapshot(R.fromSeed('42'))\nlocal trace={}")
   .replace("mapRng=R.snapshot(R.fromSeed('42')),floor=first+y-1,path={}","mapRng=copy(initialMapRng),floor=first+y-1,path={}");
  assert.equal(current,expected,'complete original case matrix and observations stay intact');
  for(const text of [current,current.replaceAll('\n','\r\n')])assert.equal(preEmeraldFixtureSource(emeraldFixturePath,text),emeraldFixtureBeforeSource);
  for(const text of [null,undefined,{},0,emeraldFixtureBeforeSource,current+'\n',current.slice(1),current.replace('copy(initialMapRng)','initialMapRng')])assert.equal(preEmeraldFixtureSource(emeraldFixturePath,text),text);
  for(const path of ['unknown','__proto__','src/lua/abyss_map.lua'])assert.equal(preEmeraldFixtureSource(path,current),current);
 });
}
