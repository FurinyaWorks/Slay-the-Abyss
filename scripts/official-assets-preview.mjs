// Diagnostic geometry only. Never substitutes invented art for unknown SDK textures.
import {mkdirSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {nativeInlinePreview} from './native-inline-preview.mjs';
import {buildUI} from './build-ui.mjs';
import {buildLuaData,luaString,toLua} from './build-lua-data.mjs';
const require=createRequire(import.meta.url);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function draw(c,parent=[1280,720],path=''){
 if(c.visible===false)return '';
 path+='/'+c.name;const [w,h]=c.size??parent,[x,y]=c.position??[0,0];
 const style=`left:${parent[0]/2+x-w/2}px;top:${parent[1]/2-y-h/2}px;width:${w}px;height:${h}px;opacity:${c.opacity??1};transform:rotate(${-(c.rotation??0)}deg) scale(${c.scale?.[0]??1},${c.scale?.[1]??1})`;
 const attrs=`data-path="${esc(path)}" data-kind="${c.kind}" style="${style}"`;
 if(c.kind==='cursorArea')return `<div class="hit" ${attrs}></div>`;
 if(c.kind==='image')return `<div class="unknown" ${attrs} data-image="${c.image}" data-tint="${esc(c.colour)}" title="UNKNOWN SDK ${c.image}; tint ${esc(c.colour)}">${w>80&&h>35?`<small>SDK ${esc(c.image)} ?</small>`:''}</div>`;
 if(c.kind==='text')return `<div class="text" data-min="${c.text.minFontSize??c.text.fontSize}" data-path="${esc(path)}" style="${style};color:${c.text.colour};font-size:${c.text.fontSize}px;text-align:${c.text.align==='left'?'left':'center'}"><span>${nativeInlinePreview(c.text.content)}</span></div>`;
 return `<div ${attrs}>${(Array.isArray(c.children)?c.children:[]).map(x=>draw(x,[w,h],path)).join('')}</div>`;
}
export function page(scene){return `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#151820;color:#fff;font-family:'Noto Sans CJK SC',sans-serif}header{height:64px;padding:8px;box-sizing:border-box;font-size:14px;background:#352440}#c{position:relative;width:1280px;height:720px;overflow:hidden}#c div{position:absolute;box-sizing:border-box}.text{display:flex;align-items:center;justify-content:center;white-space:pre-wrap;line-height:1.3;overflow:hidden}.text span{max-width:100%;overflow-wrap:normal}.unknown{border:1px dashed #5f697455;background:#25314008;overflow:hidden;color:#789;font:10px monospace}.unknown small{opacity:.55}.hit{outline:1px dotted #65c5ff33;pointer-events:none}.clip{outline:2px solid #ff5577}</style><header><b>离线诊断，非官方客户端 | ${esc(scene.name)}</b><br>未知 SDK 纹理仅标 ID，非真实美术；浏览器字体/自动缩字/按钮 normal 静态面，不代表原生渲染。${esc(scene.provenance)}</header><div id="c">${draw(scene.tree)}</div><script>for(const e of document.querySelectorAll('.text')){let s=parseFloat(e.style.fontSize),min=+e.dataset.min;while((e.firstChild.scrollHeight>e.clientHeight||e.firstChild.scrollWidth>e.clientWidth)&&s>min)e.style.fontSize=(--s)+'px';if(e.firstChild.scrollHeight>e.clientHeight+1||e.firstChild.scrollWidth>e.clientWidth+1)e.classList.add('clip');}</script>`;}
export function generate(out){
 mkdirSync(out,{recursive:true});const generated=join(out,'generated');mkdirSync(generated,{recursive:true});
 buildLuaData('data',join(generated,'abyss_data.lua'));buildUI(generated,undefined,{officialAssets:true,nativePageLifecycle:true});
 const modules=readdirSync(generated).filter(x=>x.endsWith('.lua')).map(x=>x.slice(0,-4));
 const prelude=`local generated=${luaString(generated)}\npackage.path=generated..'/?.lua;src/lua/?.lua'\nfor _,n in ipairs(${toLua(modules)})do package.preload[n]=assert(loadfile(generated..'/'..n..'.lua'))end\nlocal GameUI=require('abyss_game_ui');local create=GameUI.new;local F\nGameUI.new=function(root,data,presentation,event,platform)\n platform.nativePageLifecycle=true;platform.campaign=true\n for _,n in ipairs({'nodePanel','choicePanel'})do local p=root:GetChild(n);local prior=getmetatable(p);local active=true;setmetatable(p,{__index=function(c,k)if k=='active'then return active end;return prior.__index(c,k)end,__newindex=function(c,k,v)assert(k~='active');return prior.__newindex(c,k,v)end});p.SetActive=function(c,v)active=v;F.setEngineActive(c,v)end end\n return create(root,data,presentation,event,platform)end\nF=dofile('tests/lua/support/game_ui_fixture.lua')\ndofile('scripts/official-assets-preview-driver.lua')`;
 writeFileSync(join(out,'prelude.lua'),prelude);
 const r=spawnSync(process.execPath,[require.resolve('fengari-node-cli/src/lua-cli.js'),join(out,'prelude.lua')],{encoding:'utf8',timeout:180000,maxBuffer:64*1024*1024,env:{...process.env,LUA_INIT:'',LUA_INIT_5_3:''}});
 writeFileSync(join(out,'capture.log'),r.stdout+r.stderr);if(r.status!==0||!r.stdout.includes('OFFICIAL_VISUAL_SCENES '))throw Error(r.stderr||r.stdout||String(r.error));
 const scenes=JSON.parse(r.stdout.split('\n').find(x=>x.startsWith('OFFICIAL_VISUAL_SCENES ')).slice(23));
 writeFileSync(join(out,'scenes.json'),JSON.stringify(scenes));return scenes;
}
export function render(out,scenes){for(const s of scenes)writeFileSync(join(out,s.name+'.html'),page(s));
 const py=`import json,sys\nfrom pathlib import Path\nfrom playwright.sync_api import sync_playwright\nout=Path(sys.argv[1]); names=json.loads(sys.argv[2]); report=[]\nwith sync_playwright() as p:\n b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])\n page=b.new_page(viewport={'width':1280,'height':784})\n for name in names:\n  page.goto((out/(name+'.html')).as_uri()); page.screenshot(path=str(out/(name+'.png')))\n  report.append({'scene':name,'clippedText':page.locator('.clip').evaluate_all('(es)=>es.map(e=>({path:e.dataset.path,text:e.innerText}))'),'outside':page.locator('.text,.hit').evaluate_all('(es)=>es.filter(e=>{const r=e.getBoundingClientRect();return r.x<-.5||r.right>1280.5||r.y<63.5||r.bottom>784.5}).map(e=>({path:e.dataset.path,text:e.innerText}))')})\n b.close()\n(out/'diagnostics.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))`;
 const r=spawnSync(process.env.ABYSS_PYTHON||'python',['-c',py,out,JSON.stringify(scenes.map(s=>s.name))],{encoding:'utf8',timeout:120000});if(r.status!==0)throw Error(r.stderr);}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const out=resolve(process.argv[2]||'.artifacts/pr588/visual');mkdirSync(out,{recursive:true});
 const files=spawnSync('git',['ls-files','scripts','src/lua','data','tests/lua/support'],{encoding:'utf8'}).stdout.trim().split('\n');const hashes={};for(const f of files){try{hashes[f]=createHash('sha256').update(readFileSync(f)).digest('hex');}catch{}}
 for(const f of ['scripts/official-assets-preview.mjs','scripts/official-assets-preview.lua','scripts/official-assets-preview-driver.lua','scripts/official-assets-preview-raster.py','tests/official-assets-visual.test.mjs'])hashes[f]=createHash('sha256').update(readFileSync(f)).digest('hex');
 writeFileSync(join(out,'source-hashes.json'),JSON.stringify(hashes,null,2));
 const scenes=process.argv[3]&&!process.argv[3].startsWith('--')?JSON.parse(readFileSync(process.argv[3],'utf8')):generate(out);writeFileSync(join(out,'scenes.json'),JSON.stringify(scenes));if(process.argv.includes('--raster')){for(const s of scenes)writeFileSync(join(out,s.name+'.html'),page(s));const r=spawnSync(process.env.ABYSS_PYTHON||'python',['scripts/official-assets-preview-raster.py',out],{encoding:'utf8',timeout:120000});if(r.status!==0)throw Error(r.stderr);}else render(out,scenes);const changed=Object.entries(hashes).filter(([f,h])=>{try{return createHash('sha256').update(readFileSync(f)).digest('hex')!==h;}catch{return true;}}).map(([f])=>f);writeFileSync(join(out,'source-integrity.json'),JSON.stringify({unchanged:changed.length===0,changed,scope:process.argv[3]&&!process.argv[3].startsWith('--')?'render only; source provenance belongs to capture runner':'capture and render'},null,2));console.log('Offline diagnostics: '+out);
}
