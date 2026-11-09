// Generic preparation for an explicitly pinned private PNG alpha mask.
// Source RGB is intentionally replaced by the approved CSS mask colour.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,dirname,relative,isAbsolute,join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {isDeepStrictEqual} from 'node:util';
import {inside,fileRecord,prepareOutputDirectory} from './evidence-files.mjs';
import {compileRgbaRectangles,decodeRgbaRectangles} from './v25-private-card-assets.mjs';
export const v25UiMaskTemplate='AbyssV25SelectionConstellation';
const hash=b=>createHash('sha256').update(b).digest('hex');
const digest=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const pngDecoder=`import io,struct,sys
from PIL import Image
with Image.open(io.BytesIO(sys.stdin.buffer.read())) as im:
 if im.format!='PNG': raise ValueError('Expected PNG')
 w,h=im.size
 if not 0<w<=4096 or not 0<h<=4096 or w*h>4194304: raise ValueError('Excessive dimensions')
 im.load()
 sys.stdout.buffer.write(struct.pack('>II',w,h)+im.convert('RGBA').tobytes())
`;
function pixels(bytes,python){
 const r=spawnSync(python,['-c',pngDecoder],{input:bytes,timeout:15000,maxBuffer:17*1024*1024});
 if(r.error||r.status!==0||r.stdout.length<8)throw Error('PNG decode failed: '+(r.error?.message??r.stderr?.toString()));
 const width=r.stdout.readUInt32BE(0),height=r.stdout.readUInt32BE(4),rgba=r.stdout.subarray(8);
 if(rgba.length!==width*height*4)throw Error('Incomplete RGBA');return {width,height,rgba};
}
const alpha=rgba=>Buffer.from(Array.from({length:rgba.length/4},(_,i)=>rgba[i*4+3]));
function tintPixels(rgba,tint){
 if(!/^#[0-9A-Fa-f]{6}$/.test(tint??''))throw Error('Expected explicit RGB CSS tint');
 const rgb=[1,3,5].map(i=>parseInt(tint.slice(i,i+2),16)),out=Buffer.from(rgba);
 for(let i=0;i<out.length;i+=4){out[i]=rgb[0];out[i+1]=rgb[1];out[i+2]=rgb[2];}return out;
}
function output(file,root){
 const absolute=resolve(root,file),rel=relative(root,absolute).replaceAll('\\','/');
 if(isAbsolute(rel)||! /^(build|\.artifacts)\//.test(rel))throw Error('Private mask output must stay inside build or .artifacts');
 if(existsSync(absolute))throw Error('Output already exists; never overwrite inputs or evidence');
 const parent=prepareOutputDirectory(root,dirname(absolute)),target=resolve(parent,relative(dirname(absolute),absolute));
 const physical=relative(inside(root,root),target).replaceAll('\\','/');
 if(! /^(build|\.artifacts)\//.test(physical))throw Error('Private mask output alias leaves build or .artifacts');
 return target;
}
function readSource(input,expected,width,height,root,python){
 if(!digest(expected))throw Error('Pinned source SHA256 required');
 const record=fileRecord(resolve(root,input),root);if(record.sha256!==expected)throw Error('Source hash differs');
 const decoded=pixels(readFileSync(record.path),python);
 if(decoded.width!==width||decoded.height!==height)throw Error('Source dimensions differ');
 return {record,...decoded};
}
export function compileUiMask({root=process.cwd(),input,sourceSha256,width,height,tint,outputFile,python=process.env.ABYSS_PYTHON??process.env.MILIASTRA_PYTHON??'python'}={}){
 root=resolve(root);const source=readSource(input,sourceSha256,width,height,root,python),rgba=tintPixels(source.rgba,tint);
 const asset=compileRgbaRectangles({width,height,rgba}),recovered=decodeRgbaRectangles(asset);
 if(!alpha(recovered).equals(alpha(source.rgba)))throw Error('Source alpha roundtrip differs');
 const fresh=readSource(input,sourceSha256,width,height,root,python);
 if(!fresh.rgba.equals(source.rgba))throw Error('Source changed during preparation');
 const pack={schemaVersion:1,profile:'css-source-alpha-tint-exact-v1',licenseScope:'private-local-only',
  source:{...source.record,width,height,sourceRgbaSha256:hash(source.rgba),alphaSha256:hash(alpha(source.rgba))},
  tint:tint.toUpperCase(),sourceRgbPreserved:false,cssMaskAlphaExact:true,fullBounds:true,sampling:'none',asset};
 const target=output(outputFile,root);writeFileSync(target,JSON.stringify(pack)+'\n',{flag:'wx'});
 return pack;
}
function level(nodes,prefix,size){
 const out=[];for(let i=0;i<nodes.length;i+=60)out.push({name:prefix+(out.length+1),kind:'container',position:[0,0],size:[...size],visible:true,focusable:false,children:nodes.slice(i,i+60)});return out;
}
// Validation/probe helper only; production returns an empty host and the exact
// CSS-derived RGBA rectangle data, not thousands of serialized image controls.
export function expandUiMaskTexture(name,data){
 if(!isDeepStrictEqual(data?.display?.position,[0,0])||!isDeepStrictEqual(data.display?.size,[data.width,data.height]))throw Error('Invalid complete mask display geometry');
 decodeRgbaRectangles({...data,encoding:'xywh-rgba-hex24'});
 const images=[];
 for(let i=0;i<data.count;i++){
  const row=data.blocks.slice(i*24,(i+1)*24),[x,y,w,h]=[0,4,8,12].map(p=>parseInt(row.slice(p,p+4),16)),a=parseInt(row.slice(22),16);
  if(!a)continue;
  images.push({name:'alpha'+i,kind:'image',image:100001,position:[-data.width/2+x+w/2,data.height/2-y-h/2],size:[w,h],colour:'#'+row.slice(16,22),opacity:a/255,visible:true,focusable:false});
 }
 if(images.length!==data.drawCount)throw Error('Visible mask rectangle count differs');
 const size=[data.width,data.height];let groups=level(images,'group',size),depth=0;
 while(groups.length>60)groups=level(groups,'page'+(++depth)+'_',size);
 return {name,kind:'container',position:[0,0],size,visible:false,focusable:false,children:groups};
}
export function prepareUiMask(file,{root=process.cwd(),expected,python=process.env.ABYSS_PYTHON??process.env.MILIASTRA_PYTHON??'python',name=v25UiMaskTemplate}={}){
 const record=fileRecord(resolve(root,file),root),pack=JSON.parse(readFileSync(record.path,'utf8'));
 if(pack.schemaVersion!==1||pack.profile!=='css-source-alpha-tint-exact-v1'||pack.licenseScope!=='private-local-only'||pack.sourceRgbPreserved!==false||pack.cssMaskAlphaExact!==true||pack.fullBounds!==true||pack.sampling!=='none')throw Error('Invalid CSS mask contract');
 if(!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(name))throw Error('Invalid template name');
 const s=pack.source;
 // The pack is data, not the authority for its own CSS colour/source identity.
 if(!expected||s.sha256!==expected.sourceSha256||s.width!==expected.width||s.height!==expected.height||pack.tint!==expected.tint?.toUpperCase())throw Error('Mask source/CSS tint differs from explicit caller contract');
 const source=readSource(s.path,s.sha256,s.width,s.height,root,python);
 if(source.record.bytes!==s.bytes||hash(source.rgba)!==s.sourceRgbaSha256||hash(alpha(source.rgba))!==s.alphaSha256)throw Error('Fresh source alpha/RGBA identity differs');
 const compiledExpected=compileRgbaRectangles({width:s.width,height:s.height,rgba:tintPixels(source.rgba,pack.tint)});
 const rgba=decodeRgbaRectangles(pack.asset);
 if(JSON.stringify(compiledExpected)!==JSON.stringify(pack.asset)||!alpha(rgba).equals(alpha(source.rgba)))throw Error('Compiled mask differs from fresh source alpha and CSS tint');
 const size=[s.width,s.height],template={name,kind:'container',position:[0,0],size,visible:false,focusable:false,children:[]};
 const textureData={[name]:{width:s.width,height:s.height,blocks:pack.asset.blocks,count:pack.asset.count,drawCount:pack.asset.drawCount,display:{position:[0,0],size:[...size]}}};
 return {template,textureData,pack,inputs:[record,source.record],verification:{sourceAlphaSha256:s.alphaSha256,tintedRgbaSha256:compiledExpected.rgbaSha256,sourceAlphaRoundtrip:true,visibleRectangles:pack.asset.drawCount,rectanglesIncludingTransparent:pack.asset.count}};
}

export function prepareV25UiMasks(file,{root=process.cwd()}={}){
 const contract=JSON.parse(readFileSync(join(root,'data/presentation/ui_theme.json'),'utf8')).v25Character?.constellation;
 if(!contract||contract.sourceSha256!=='5780bc541d322b369b61f656908da59bdeee7f3ad83988edca8be23776720ecd'
  ||!isDeepStrictEqual(contract.sourceSize,[512,512])||!isDeepStrictEqual(contract.displaySize,[118,118]))throw Error('Missing frozen V25 constellation contract');
 const prepared=prepareUiMask(file,{root,expected:{sourceSha256:contract.sourceSha256,width:512,height:512,tint:contract.colour}});
 return {...prepared,templates:[prepared.template],assetFile:prepared.inputs[0],contract};
}
export function v25UiMaskInputs(file,root=process.cwd()){
 const record=fileRecord(resolve(root,file),root),pack=JSON.parse(readFileSync(record.path,'utf8'));
 if(pack.profile!=='css-source-alpha-tint-exact-v1'||pack.licenseScope!=='private-local-only'||typeof pack.source?.path!=='string')throw Error('Invalid private V25 UI mask inputs');
 const source=fileRecord(resolve(root,pack.source.path),root);
 if(source.sha256!==pack.source.sha256||source.bytes!==pack.source.bytes)throw Error('Private V25 UI mask source changed');
 return [record,source];
}
export function assertV25UiMaskPreparation(prepared,inputs,templates){
 if(!prepared)return;
 for(const record of prepared.inputs)if(!inputs.some(input=>isDeepStrictEqual(input,record)))throw Error('Private V25 UI mask input snapshot differs from preparation');
 if(templates)for(const expected of prepared.templates){
  const found=templates.filter(template=>template.name===expected.name);
  if(found.length!==1||!isDeepStrictEqual(found[0],expected))throw Error('Private V25 UI mask template differs from preparation');
 }
}
export function attachV25UiMasks(layout,prepared){
 if(!prepared)return layout;
 const children=n=>n?.children??n?.controls??[];
 const child=(n,name)=>{const found=children(n).filter(node=>node.name===name);if(found.length!==1)throw Error('V25 UI mask requires one '+name);return found[0];};
 const stage=children(layout).some(node=>node.name==='stage')?child(layout,'stage'):layout;
 const selected=child(child(child(stage,'characterPanel'),'v25Roster'),'selected');
 const host=child(selected,'v25Constellation');
 const data=prepared.textureData?.[v25UiMaskTemplate];
 if(!data||data.width!==512||data.height!==512||!isDeepStrictEqual(data.display,{position:[0,0],size:[512,512]}))throw Error('V25 constellation requires complete 512 texture data');
 if(children(host).length||host.visible===true)throw Error('V25 constellation already bound');
 host.size=[...prepared.contract.displaySize];host.visible=true;
 // The runtime creates its 512-root at the first selection reveal. A static
 // reference to the deliberately empty template is not a ready texture.
 host.children=[];
 return layout;
}
