import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {discoverJs}=await import(pathToFileURL(resolve('scripts/ci-shards.mjs')));
const mode=process.argv[2]??'--check';assert(['--check','--write'].includes(mode),'Use --check or --write');
function output(path,value){if(mode==='--write')writeFileSync(path,value);else assert.deepEqual(readFileSync(path),Buffer.isBuffer(value)?value:Buffer.from(value),'stale integrated source: '+path);}
const sources={native:'97af2fed6db0d8c77ea29165ec6395bfb55e2161',closeout:'fdb91c7e30688f593728bde26db0e4d6f614d933',sts:'afd8834b1e7f613b7d68c7a4b6d68ca196f37064',menu:'ec0d0b990bb4baa7d45413101599ef3030f33892'};
const hash=s=>createHash('sha256').update(s).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');
const bind=source=>({source,sha256:hash(source),gitBlob:createHash('sha1').update(`blob ${Buffer.byteLength(source)}\0`).update(source).digest('hex')});
const git=args=>execFileSync('git',args,{encoding:'utf8',maxBuffer:32*1024*1024});
const packed=p=>JSON.parse(gunzipSync(readFileSync(p)));
const style=packed('tests/helpers/sts-style-ci-source.json.gz'),feedback=packed('tests/helpers/sts-feedback-ci.json.gz'),menu=packed('tests/helpers/menu-red-ci-source.json.gz');
const all=new Set([...Object.keys(style.files),...Object.keys(style.helperSources),...Object.keys(feedback.files),...Object.keys(menu.files)]);
for(const revision of [...Object.values(sources),'HEAD'])for(const p of git(['diff','--name-only','e805a87dc4df1a048ba5995931d98a4e4899b5e9',revision]).trim().split('\n'))all.add(p);
for(const p of [...git(['diff','--name-only']).trim().split('\n'),...git(['ls-files','--others','--exclude-standard','tests']).trim().split('\n')])all.add(p);
const production=['src/lua/abyss_game_ui_menu_view.lua','src/lua/abyss_game_ui_view.lua','src/lua/abyss_v25_menu_view.lua'];
production.forEach(p=>all.add(p));
const paths=[...all].filter(p=>p&&existsSync(p)&&p!=='tests/helpers/integrated-ci-binding.mjs'&&(
 production.includes(p)||p==='.gitattributes'||p==='package.json'||p==='package-lock.json'||p==='docs/legal/assets.json'||/^(scripts|tests|data|config|tools|\.github)\//.test(p))&&(/\.(mjs|json|lua|yml|yaml)$/.test(p)||p==='.gitattributes')).sort();
const files={};for(const p of paths){const views={};for(const [name,revision]of Object.entries(sources)){
 try{views[name]=bind(norm(execFileSync('git',['show',revision+':'+p],{encoding:'utf8',maxBuffer:16*1024*1024,stdio:['ignore','pipe','ignore']})));}catch{views[name]=null;}}
 files[p]={current:bind(norm(readFileSync(p,'utf8'))),views};}
const closure={};for(const p of ['tests/helpers/closeout-source-epoch.mjs','tests/helpers/menu-presentation-source.json.gz','tests/helpers/menu-red-production-source.json.gz','tests/helpers/menu-red-source-epoch.mjs'])
 closure[p]={before:feedback.helperClosure[p]?.after??null,after:hash(p.endsWith('.gz')?readFileSync(p):norm(readFileSync(p,'utf8')))};
const binaryViews={'tests/helpers/menu-red-production-source.json.gz':{current:closure['tests/helpers/menu-red-production-source.json.gz'].after,
 views:{menu:{path:'tests/helpers/menu-red-before-integration-production-source.json.gz',sha256:'ee888fd1686beaeffc2e439164619ecedee9ac00d2ca00a2711bd74c63e28cae'}}}};
const bytes=gzipSync(JSON.stringify({schemaVersion:1,sources,production,files,closure,binaryViews,inventory:discoverJs()})),sha=hash(bytes);
output('tests/helpers/integrated-ci-source.json.gz',bytes);
output('tests/helpers/integrated-ci-binding.mjs',`// Fixed trust leaf; excluded from its own archive.\nimport assert from 'node:assert/strict';\nimport {readFileSync} from 'node:fs';\nimport {createHash} from 'node:crypto';\nexport const integratedCiBytes=readFileSync(new URL('./integrated-ci-source.json.gz',import.meta.url));\nassert.equal(createHash('sha256').update(integratedCiBytes).digest('hex'),${JSON.stringify(sha)},'complete reviewed integration CI sources');\n`);
console.log(JSON.stringify({paths:paths.length,bytes:bytes.length,sha256:sha}));
