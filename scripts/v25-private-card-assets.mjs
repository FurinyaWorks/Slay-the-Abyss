// Generic lossless preparation for explicitly supplied, pinned private PNGs.
// No source artwork or private sample code lives here. Output remains local.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,dirname,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {inside,prepareOutputDirectory} from './evidence-files.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const encoding='xywh-rgba-hex24';
const maxPixels=4*1024*1024;
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
function dimensions(width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>65535||height>65535||width*height>maxPixels)
  throw Error('Invalid or excessive source dimensions');
}
const hex=(value,width)=>value.toString(16).padStart(width,'0');
function encoded(row){return row.slice(0,4).map(value=>hex(value,4)).join('')+row.slice(4).map(value=>hex(value,2)).join('');}

export function compileRgbaRectangles({width,height,rgba}){
 dimensions(width,height);
 if(!(rgba instanceof Uint8Array)||rgba.length!==width*height*4)throw Error('RGBA buffer dimensions differ');
 const bytes=Buffer.from(rgba),rows=[];let previous=new Map();
 for(let y=0;y<height;y++){
  const current=new Map();let x=0;
  while(x<width){
   const start=x,offset=(y*width+x)*4,colour=[...bytes.subarray(offset,offset+4)];x++;
   while(x<width){const at=(y*width+x)*4;if(colour.some((v,i)=>bytes[at+i]!==v))break;x++;}
   const w=x-start,key=`${start}:${w}:${colour.join(',')}`,prior=previous.get(key);
   const index=prior??rows.length;
   if(prior===undefined)rows.push([start,y,w,1,...colour]);else rows[prior][3]++;
   current.set(key,index);
  }
  previous=current;
 }
 const blocks=rows.map(encoded).join('');
 const result={width,height,sampleSize:[width,height],count:rows.length,drawCount:rows.filter(row=>row[7]>0).length,encoding,blocks,
  rgbaSha256:hash(bytes),blocksSha256:hash(blocks),lossless:true,alphaExact:true,coverageExact:true,
  sampling:{scale:1,method:'none'},transparentRgbPreserved:true};
 if(!decodeRgbaRectangles(result).equals(bytes))throw Error('Lossless rectangle reconstruction failed');
 return result;
}

export function decodeRgbaRectangles(asset){
 const {width,height,count,blocks}=asset;dimensions(width,height);
 if(asset.encoding!==encoding||!Number.isInteger(count)||count<1||typeof blocks!=='string'||blocks.length!==count*24||!/^[0-9a-f]+$/i.test(blocks))
  throw Error('Invalid native rectangle encoding');
 const result=Buffer.alloc(width*height*4),coverage=new Uint8Array(width*height);
 for(let i=0;i<count;i++){
  const row=blocks.slice(i*24,(i+1)*24),[x,y,w,h]=[0,4,8,12].map(at=>parseInt(row.slice(at,at+4),16));
  const colour=[16,18,20,22].map(at=>parseInt(row.slice(at,at+2),16));
  if(!w||!h||x+w>width||y+h>height)throw Error('Rectangle outside source bounds');
  for(let py=y;py<y+h;py++)for(let px=x;px<x+w;px++){
   const pixel=py*width+px;if(coverage[pixel])throw Error('Rectangle overlap');coverage[pixel]=1;
   for(let c=0;c<4;c++)result[pixel*4+c]=colour[c];
  }
 }
 if(coverage.some(value=>value!==1))throw Error('Rectangles do not cover the complete source');
 if(asset.blocksSha256!==undefined&&(!digest(asset.blocksSha256)||hash(blocks)!==asset.blocksSha256))throw Error('Rectangle block hash differs');
 if(asset.rgbaSha256!==undefined&&(!digest(asset.rgbaSha256)||hash(result)!==asset.rgbaSha256))throw Error('Reconstructed RGBA hash differs');
 return result;
}

// Decode pinned bytes through Pillow, without evaluating code or loading paths
// named by the image. Limits are checked before materializing image pixels.
const decodePng=`import io,struct,sys
from PIL import Image
b=sys.stdin.buffer.read()
with Image.open(io.BytesIO(b)) as im:
 if im.format!='PNG': raise ValueError('Expected PNG source')
 w,h=im.size
 if w<1 or h<1 or w>65535 or h>65535 or w*h>${maxPixels}: raise ValueError('Invalid source dimensions')
 im.load()
 sys.stdout.buffer.write(struct.pack('>II',w,h)+im.convert('RGBA').tobytes())
`;
function pngPixels(bytes,python){
 const result=spawnSync(python,['-c',decodePng],{input:bytes,encoding:null,timeout:15000,maxBuffer:maxPixels*4+1024});
 if(result.error||result.status!==0)throw Error(`PNG decoding failed: ${result.error?.message??result.stderr?.toString('utf8')??'no result'}`);
 if(result.stdout.length<8)throw Error('PNG decoder returned no dimensions');
 const width=result.stdout.readUInt32BE(0),height=result.stdout.readUInt32BE(4);dimensions(width,height);
 const rgba=result.stdout.subarray(8);
 if(rgba.length!==width*height*4)throw Error('PNG decoder returned incomplete RGBA');
 return {width,height,rgba};
}
function sourcePath(root,path){
 if(typeof path!=='string'||!path||isAbsolute(path)||/^[a-z]:/i.test(path)||path.split(/[\\/]/).some(part=>part==='..'||part===''))
  throw Error('Invalid relative private source path');
 return inside(root,resolve(root,path));
}
function pinned(root,path,expected,inputs){
 if(!digest(expected))throw Error('Private input requires an exact SHA256 hash');
 const absolute=sourcePath(root,path),bytes=readFileSync(absolute),sha256=hash(bytes);
 if(sha256!==expected)throw Error(`Private input hash differs: ${path}`);
 const existing=inputs.get(absolute);
 if(existing&&existing.sha256!==sha256)throw Error('Conflicting hashes for one private input');
 inputs.set(absolute,{path:absolute,sha256,bytes:bytes.length});
 return bytes;
}
function geometry(asset){
 const pair=(value,positive=false)=>Array.isArray(value)&&value.length===2&&value.every(n=>Number.isFinite(n)&&(!positive||n>0));
 if(!pair(asset.logicalCardSize,true)||!pair(asset.logicalCardSourceTopLeft)||!pair(asset.display?.position)||!pair(asset.display?.size,true))
  throw Error('Invalid source card geometry');
 return {logicalCardSize:[...asset.logicalCardSize],logicalCardSourceTopLeft:[...asset.logicalCardSourceTopLeft],
  display:{position:[...asset.display.position],size:[...asset.display.size]}};
}
function outputPath(root,path,inputs){
 const absolute=resolve(root,path),rel=relative(resolve(root),absolute).replaceAll('\\','/');
 if(existsSync(absolute))throw Error('Output already exists; inputs and prior evidence are never overwritten');
 if(isAbsolute(rel)||! /^(build|\.artifacts)\//.test(rel))throw Error('Private output must stay inside project build or .artifacts root');
 const parent=prepareOutputDirectory(root,dirname(absolute));
 const physical=resolve(parent,relative(dirname(absolute),absolute));
 if(inputs.has(physical))throw Error('Output cannot replace a private input');
 return absolute;
}

export function compilePrivateCardAssets({inputRoot,manifest,manifestSha256,keys,outputFile,projectRoot=process.cwd(),
 python=process.env.ABYSS_PYTHON||process.env.MILIASTRA_PYTHON||'python'}={}){
 if(typeof inputRoot!=='string'||typeof manifest!=='string')throw Error('Explicit private input root and manifest are required');
 const root=inside(inputRoot,inputRoot),inputs=new Map(),manifestBytes=pinned(root,manifest,manifestSha256,inputs);
 const source=JSON.parse(manifestBytes.toString('utf8'));
 if(source.schemaVersion!==1||source.sourceSiteVersion!==25||! /^[a-f0-9]{40}$/.test(source.privateSourceCommit??'')
  ||!source.assets||Array.isArray(source.assets)||!Array.isArray(source.sourceInputs))throw Error('Invalid V25 private source manifest');
 if(source.cardShells?.costBakedIntoShell!==false)throw Error('Private card shells must keep live cost text outside the image');
 for(const row of source.sourceInputs)pinned(root,row.path??row.source,row.sha256??row.sourceSha256,inputs);
 const selected=keys??Object.keys(source.assets);
 if(!Array.isArray(selected)||!selected.length||new Set(selected).size!==selected.length||selected.some(key=>typeof key!=='string'||! /^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(key)||!Object.hasOwn(source.assets,key)))
  throw Error('Invalid or duplicate selected private asset keys');
 const assets={};
 for(const key of selected){
  const asset=source.assets[key],bytes=pinned(root,asset.source,asset.sourceSha256,inputs),frame=geometry(asset),decoded=pngPixels(bytes,python);
  if(decoded.width!==asset.width||decoded.height!==asset.height)throw Error(`Source dimensions differ: ${key}`);
  assets[key]={...compileRgbaRectangles(decoded),...frame,source:asset.source,sourceSha256:asset.sourceSha256};
 }
 for(const input of inputs.values())if(hash(readFileSync(input.path))!==input.sha256)throw Error('Private input hash changed during compilation');
 const cardShells={...structuredClone(source.cardShells),sourcePreparationProfile:source.cardShells.fixedProfile??null,
  fixedProfile:'source-rgba-lossless-v1; scale1; no quantization; no baked text, numerals or illustration'};
 const pack={schemaVersion:1,profile:'v25-source-rgba-lossless-v1',licenseScope:'private-local-only',sourceSiteVersion:25,
  privateSourceCommit:source.privateSourceCommit,encoding,inputs:[...inputs.values()],assets,
  cardShells,verification:{rgbaRoundtrip:'byte-exact',nativeImport:'not_run',devicePerformance:'not_run'}};
 if(outputFile){const file=outputPath(projectRoot,outputFile,inputs);writeFileSync(file,JSON.stringify(pack)+'\n',{flag:'wx'});}
 return pack;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const options={},names={'--input-root':'inputRoot','--manifest':'manifest','--manifest-sha256':'manifestSha256','--output':'outputFile','--python':'python'};
  for(let i=2;i<process.argv.length;i++){
   const arg=process.argv[i];
   if(arg==='--key'){(options.keys??=[]).push(process.argv[++i]);continue;}
   const key=names[arg];if(!key||options[key]!==undefined||!process.argv[i+1])throw Error('Use --input-root <directory> --manifest <relative-file> --manifest-sha256 <hash> --output <build-or-artifacts-file> [--key <asset>]');
   options[key]=process.argv[++i];
  }
  if(!options.outputFile)throw Error('Explicit private output file is required');
  const pack=compilePrivateCardAssets(options);
  console.log(JSON.stringify({profile:pack.profile,assets:Object.fromEntries(Object.entries(pack.assets).map(([key,a])=>[key,{size:[a.width,a.height],rectangles:a.count,visibleRectangles:a.drawCount,rgbaSha256:a.rgbaSha256}])),nativeImport:'not_run',devicePerformance:'not_run'}));
 }catch(error){console.error(error.message);process.exitCode=1;}
}
