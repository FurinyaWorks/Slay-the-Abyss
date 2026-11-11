// The user's supplied PNG remains the authority. This is a bounded display-size
// alpha derivative, not a replacement icon or a lossless 512px texture claim.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {compileRgbaRectangles,decodeRgbaRectangles} from './v25-private-card-assets.mjs';
import {expandUiMaskTexture} from './v25-ui-mask-assets.mjs';
const sourceUrl=new URL('../docs/design/reference-ui-lab/constellation-exact.png',import.meta.url);
const dataUrl=new URL('../data/presentation/v25-constellation-118.json',import.meta.url);
export const constellationDisplayInputs=Object.freeze([
 'data/presentation/v25-constellation-118.json',
 'docs/design/reference-ui-lab/constellation-exact.png',
]);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export const constellationDisplayContract=Object.freeze({
 sourcePath:'docs/design/reference-ui-lab/constellation-exact.png',
 sourceSha256:'5780bc541d322b369b61f656908da59bdeee7f3ad83988edca8be23776720ecd',
 displaySize:118,alphaLevels:32,tint:'#FFE0A2',drawCount:1777,
 displayRgbaSha256:'5a096f52c7825aef82a87bfa4b067177c631b0d8f46703a9507ff16228bc84b1',
});
const sample=`import io,json,sys
from PIL import Image
source=Image.open(io.BytesIO(sys.stdin.buffer.read())).convert('RGBA')
assert source.size==(512,512)
reference=source.getchannel('A').resize((118,118),Image.Resampling.LANCZOS)
alpha=[int(round(round(v/255*31)*255/31)) for v in reference.tobytes()]
errors=[abs(a-b) for a,b in zip(reference.tobytes(),alpha)]
json.dump({'reference':list(reference.tobytes()),'alpha':alpha,'error':{'maxAbsAlpha':max(errors),'meanAbsAlpha':sum(errors)/len(errors),'changedPixels':sum(v>0 for v in errors)}},sys.stdout)
`;
export function compileConstellationDisplay({python=process.env.ABYSS_PYTHON??process.env.MILIASTRA_PYTHON??'python'}={}){
 const bytes=readFileSync(sourceUrl),c=constellationDisplayContract;
 if(sha(bytes)!==c.sourceSha256)throw Error('Original constellation PNG identity changed');
 const result=spawnSync(python,['-c',sample],{input:bytes,timeout:15000,maxBuffer:1024*1024});
 if(result.error||result.status!==0)throw Error('Constellation display sampling failed: '+(result.error?.message??result.stderr?.toString()));
 const sampled=JSON.parse(result.stdout),alpha=Buffer.from(sampled.alpha),reference=Buffer.from(sampled.reference);
 const rgba=Buffer.alloc(118*118*4);for(let i=0;i<alpha.length;i++){rgba[i*4]=255;rgba[i*4+1]=224;rgba[i*4+2]=162;rgba[i*4+3]=alpha[i];}
 const full=compileRgbaRectangles({width:118,height:118,rgba});
 const {width,height,count,drawCount,encoding,blocks,rgbaSha256,blocksSha256}=full;
 return {schemaVersion:1,profile:'source-alpha-display118-32levels-v1',
  source:{path:c.sourcePath,sha256:c.sourceSha256,size:[512,512],bytes:bytes.length},
  rights:'Inherits the original PNG rights and unresolved source attribution; derivation grants no new license.',
  displaySize:[118,118],tint:c.tint,originalSourceLossless:false,cssRasterExact:false,
  sampling:{filter:'Pillow-LANCZOS',alphaLevels:32,crop:'none',fullSourceBounds:true},
  referenceAlphaSha256:sha(reference),displayAlphaSha256:sha(alpha),error:sampled.error,
  asset:{width,height,count,drawCount,encoding,blocks,rgbaSha256,blocksSha256}};
}
export function readConstellationDisplay(){
 const c=constellationDisplayContract,data=JSON.parse(readFileSync(dataUrl,'utf8'));
 if(sha(readFileSync(sourceUrl))!==c.sourceSha256||data.source?.sha256!==c.sourceSha256
  ||data.profile!=='source-alpha-display118-32levels-v1'||JSON.stringify(data.source?.size)!=='[512,512]'
  ||JSON.stringify(data.displaySize)!=='[118,118]'||data.tint!==c.tint
  ||data.originalSourceLossless!==false||data.cssRasterExact!==false
  ||data.sampling?.filter!=='Pillow-LANCZOS'||data.sampling?.alphaLevels!==32||data.sampling?.crop!=='none'
  ||data.sampling?.fullSourceBounds!==true||data.asset?.width!==118||data.asset?.height!==118
  ||!Number.isInteger(data.asset?.drawCount)||data.asset.drawCount<1||data.asset.drawCount>1900)
  throw Error('Constellation display/source contract differs');
 const rgba=decodeRgbaRectangles(data.asset),alpha=Buffer.from(Array.from({length:118*118},(_,i)=>rgba[i*4+3]));
 if(sha(rgba)!==c.displayRgbaSha256||sha(alpha)!==data.displayAlphaSha256)throw Error('Constellation derived RGBA differs from pinned display sample');
 return data;
}
export function constellationDisplayNode(){
 const data=readConstellationDisplay();
 const node=expandUiMaskTexture('v25Constellation',{...data.asset,display:{position:[0,0],size:[118,118]}});
 node.visible=true;return node;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const data=compileConstellationDisplay();writeFileSync(dataUrl,JSON.stringify(data)+'\n');
 console.log(JSON.stringify({source:data.source,displaySize:data.displaySize,error:data.error,drawCount:data.asset.drawCount,blocksSha256:data.asset.blocksSha256}));
}
