import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {draw,page} from '../scripts/official-assets-preview.mjs';
test('official diagnostic visibly disclaims native and texture acceptance',()=>{
 const html=page({name:'sample',provenance:'component only',tree:{name:'root',kind:'image',size:[1280,720],image:107253,colour:'#FFFFFF'}});
 assert.match(html,/离线诊断，非官方客户端/);assert.match(html,/SDK 107253/);assert.match(html,/未知 SDK 纹理/);assert.doesNotMatch(html,/<svg|<img/);
});
test('diagnostic preserves position, tint, text and hides inactive controls without invented glyphs',()=>{
 assert.equal(draw({visible:false}),'');
 const text=draw({name:'name',kind:'text',size:[100,20],position:[10,-5],text:{content:'<b>正文</b>',fontSize:20,minFontSize:14,colour:'#432112'}});
 assert.match(text,/left:600px;top:355px/);assert.match(text,/&lt;b>正文/);assert.match(text,/data-min="14"/);assert.doesNotMatch(text,/<b>/);
 const image=draw({name:'face',kind:'image',size:[100,80],image:107253,colour:'#123456'});
 assert.match(image,/data-tint="#123456"/);assert.doesNotMatch(image,/background:#123456/);
});
test('visual driver does not fake completion or mutate health and labels component stress',()=>{
 const lua=readFileSync('scripts/official-assets-preview-driver.lua','utf8');
 assert.doesNotMatch(lua,/F\.win|\.hp\s*=(?!=)|\.phase\s*=(?!=)/);assert.match(lua,/NOT natural/);assert.match(lua,/Combat\.draw/);
});

test('dynamic actor diagnostics retain the real power template and reject unknown actors',()=>{
 const source=`
package.preload.abyss_ui_layout=function()return {{name='battlePanel',kind='container',size={1280,720}}}end
package.preload.abyss_ui_templates=function()return {
 AbyssMonsterActor={name='enemy',kind='container',size={100,100},children={{name='name',kind='text',size={80,20},text={fontSize=20}}}},
 AbyssMonsterPower={name='power',kind='container',size={40,20},children={{name='amount',kind='text',size={30,20},text={fontSize=14}}}}
}end
local function control(name,children,text)
 return {name=name,kind='container',children=children or {},visible=true,text=text,GetChild=function(self,key)return self.children[key]end}
end
local actor=control('enemy',{name=control('name',nil,'Real enemy')})
local power=control('power',{amount=control('amount',nil,'7')})
local page=control('actorPage',{nativeActor2=actor,nativeActor3=power})
local battle=control('battlePanel',{nativeActor1=page})
local root=control('root',{battlePanel=battle})
local preview=dofile('scripts/official-assets-preview.lua')
preview.capture('actors',{mode='battle'},root,{kind='isolated-exporter-contract'})
local children=preview.scenes[1].tree.children[1].children[1].children
local seen={};for _,c in ipairs(children)do seen[c.name]=c end
assert(seen.enemy.children[1].text.content=='Real enemy')
assert(seen.power.children[1].name=='amount' and seen.power.children[1].text.content=='7')
assert(seen.power.size[1]==40 and seen.enemy.size[1]==100)
page.children.nativeActor4=control('unknown')
local ok,why=pcall(preview.capture,'bad',{mode='battle'},root,{})
assert(not ok and tostring(why):find('Unsupported native actor template unknown',1,true))
print('OFFICIAL_EXPORTER_POWER_PASS')
`;
 const cli=createRequire(import.meta.url).resolve('fengari-node-cli/src/lua-cli.js');
 const result=spawnSync(process.execPath,[cli,'-e',source],{encoding:'utf8',timeout:3000,env:{...process.env,LUA_INIT:'',LUA_INIT_5_3:''}});
 assert.equal(result.status,0,result.stdout+result.stderr+String(result.error??''));
 assert.match(result.stdout,/OFFICIAL_EXPORTER_POWER_PASS/);
});
