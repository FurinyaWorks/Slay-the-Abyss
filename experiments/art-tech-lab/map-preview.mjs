// Source-generated subsystem save, not a GIL readback or official device test.
// Reuses the PR588 native->Simulator transform mapping for the map's four kinds.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {mapLayout,mapGeometry} from '../../scripts/map-ui-layout.mjs';
import {applyV25MapLayout} from '../../scripts/v25-map-layout.mjs';
import {v25Theme} from '../../scripts/v25-layout.mjs';
import {buildUiTheme} from '../../scripts/build-ui-theme.mjs';
import {buildLuaData,toLua} from '../../scripts/build-lua-data.mjs';
const out=path.resolve(process.argv[2]??'.artifacts/map-before');
if(fs.existsSync(out))throw Error('Use a new evidence directory');
fs.mkdirSync(out,{recursive:true});
const theme=v25Theme(JSON.parse(fs.readFileSync('data/presentation/ui_theme.json')));
const layout=mapLayout(theme);applyV25MapLayout(layout,theme);
fs.writeFileSync(path.join(out,'theme.json'),JSON.stringify(theme));
buildUiTheme(path.join(out,'theme.json'),'data',path.join(out,'abyss_theme.lua'));
buildLuaData('data',path.join(out,'abyss_data.lua'));
fs.writeFileSync(path.join(out,'abyss_map_layout.lua'),'return '+toLua(mapGeometry(theme)));
const save=JSON.parse(fs.readFileSync('experiments/art-tech-lab/seed.save.json'));
let seq=1900000000;const platforms=['KEYBOARD','TOUCHSCREEN','CONTROLLER_CONSOLE','CONTROLLER_MOBILE'];
const vector=(a,def)=>({x:a?.[0]??def[0],y:a?.[1]??def[1]});
const argb=(hex='#FFFFFF',alpha=1)=>((Math.round(alpha*255)<<24)|parseInt(hex.slice(1),16))>>>0;
const align={centre:'Middle',center:'Middle',middle:'Middle',left:'Left',right:'Right',top:'Top',bottom:'Bottom'};
function convert(s){
 const kind={container:'container',image:'image',text:'textbox',cursorArea:'cursor'}[s.kind];
 if(!kind)throw Error('Unsupported map kind '+s.kind);
 const n={id:'n'+(++seq),guid:seq,kind,name:s.name,active:s.active!==false,visible:s.visible!==false,canControllerFocus:s.focusable===true,scriptMappingIds:[],giaRelatedGuids:[],transformByPlatform:{}};
 for(const platform of platforms)n.transformByPlatform[platform]={scale:{x:1,y:1,z:1},rotation:{x:0,y:0,z:s.rotation??0},anchorMin:vector(s.anchor?.min,[.5,.5]),anchorMax:vector(s.anchor?.max,[.5,.5]),offset:vector(s.position,[0,0]),size:vector(s.size,[1280,720]),pivot:{x:.5,y:.5}};
 if(kind==='image')Object.assign(n,{imageId:s.image,imageSource:'StaticReference',imageType:'Basic',imageColor:argb(s.colour,s.opacity??1)});
 if(kind==='textbox'){const t=s.text;Object.assign(n,{text:t.content,fontSize:t.fontSize,minimumFontSize:t.minFontSize,adaptiveFontSize:t.autoSize===true,fontColor:argb(t.colour),bgColor:0,enableOutline:t.outline!==false,outlineColor:argb(t.outlineColour??'#333333',t.outlineOpacity??.2),horizontalAlignment:align[t.align]??'Middle',verticalAlignment:align[t.valign]??'Middle'});}
 if(kind==='cursor')n.raycastTarget=true;
 if(kind==='container')Object.assign(n,{showCursor:true,disableKeyEventPassthrough:true,disableCursorEventPassthrough:true});
 n.children=(s.children??s.controls??[]).map(convert).reverse();return n;
}
const root=convert({name:'MapPreview',kind:'container',size:[1280,720],children:layout.controls});
save.assets.server.root.children=[root];save.assets.server.selectedId=root.id;save.assets.client.root.children=[];
const hashes={};save.assets.scripts=[];
const sources=new Map(fs.readdirSync('src/lua').filter(f=>f.endsWith('.lua')).map(f=>[f,path.join('src/lua',f)]));
for(const f of ['abyss_theme.lua','abyss_data.lua','abyss_map_layout.lua'])sources.set(f,path.join(out,f));
sources.set('map-preview.lua','experiments/art-tech-lab/map-preview.lua');
for(const [name,file]of sources){const source=fs.readFileSync(file,'utf8'),guid=++seq;hashes[file]=createHash('sha256').update(source).digest('hex');save.assets.scripts.push({id:'s'+guid,guid,path:name,source,controlAsset:name==='map-preview.lua'?'server-control-template':null,controlId:name==='map-preview.lua'?root.id:null});if(name==='map-preview.lua')root.scriptMappingIds=[guid];}
save.meta.name='V25 map production subsystem';
fs.writeFileSync(path.join(out,'map.save.json'),JSON.stringify(save));
fs.writeFileSync(path.join(out,'layout.json'),JSON.stringify(layout));
fs.writeFileSync(path.join(out,'sources.json'),JSON.stringify({scope:'source-generated map subsystem; room completion simulated',hashes},null,2));
console.log(path.join(out,'map.save.json'));
