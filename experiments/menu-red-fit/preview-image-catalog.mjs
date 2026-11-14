// Explicit preview compatibility registration for IDs already declared by this
// project's native image catalog. SDK files and gameplay IDs stay unchanged.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from'node:path';import{pathToFileURL}from'node:url';import{createHash}from'node:crypto';
import{imageRanges}from'../../scripts/build-ui-theme.mjs';
export const registrations=Object.freeze([106048,107279,112046,112050,112065]);
export const missingPreviewFallbacks=Object.freeze({112046:112027,112050:112031,112065:112039});
export async function previewImages(cacheDir,reportPath){
 assert(path.isAbsolute(cacheDir),'explicit absolute workspace cache required');
 const relative=path.relative(process.cwd(),cacheDir);
 assert(relative&&!path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep),'cache must stay inside this workspace');
 process.env.QXQY_IMAGE_CACHE_DIR=cacheDir;
 const {Gc}=await import(pathToFileURL('F:/New folder/.artifacts/simulator-runtime/sdk/actual-renderer.mjs'));
 const assets=Gc({cacheDir}),known=assets.accepts.bind(assets),extra=new Set(registrations);
 for(const id of extra){assert(imageRanges.some(([a,b])=>id>=a&&id<=b),'registration must be native-catalog valid');assert(!known(id),'SDK no longer needs this compatibility registration');}
 const accepts=id=>known(id)||Number.isSafeInteger(id)&&extra.has(id);
 assets.accepts=accepts;
 // Initialize the existing bounded metadata store before extending its exact
 // declared set; both stores retain the SDK fetcher/PNG/size/cache validation.
 await assets.metadata(105045,{imageSource:'StaticReference'});
 assert(assets.metadataStore&&typeof assets.metadataStore.accepts==='function');
 for(const store of [assets,assets.metadataStore])assert(path.resolve(store.directory).startsWith(path.resolve(cacheDir)+path.sep),'SDK singleton uses another cache');
 const metadataKnown=assets.metadataStore.accepts.bind(assets.metadataStore);
 assets.metadataStore.accepts=id=>metadataKnown(id)||Number.isSafeInteger(id)&&extra.has(id);
 assert(!assets.accepts(999999)&&!assets.metadataStore.accepts(999999));
 const get=assets.get.bind(assets),metadata=assets.metadata.bind(assets),fallbacks=new Map();
 const hash=data=>createHash('sha256').update(data).digest('hex');
 const report={kind:'loopback-preview-image-compatibility',nativeIdsUnchanged:true,sdkUnmodified:true,registrations,images:[],boundary:'Three known native creature IDs may use existing native sprites in this local SDK preview only, and only when their original source returns HTTP 404. Official client parity is unverified.'};
 for(const [sourceText,fallback]of Object.entries(missingPreviewFallbacks)){
  const id=Number(sourceText);let actual=id,sourceStatus=200;
  try{await get(id,{imageSource:'StaticReference'});await metadata(id,{imageSource:'StaticReference'});}
  catch(error){
   if(error.message!=='Asset source returned HTTP 404')throw error;
   sourceStatus=404;actual=fallback;assert(known(actual));fallbacks.set(id,actual);
  }
  const png=await get(actual,{imageSource:'StaticReference'}),meta=await metadata(actual,{imageSource:'StaticReference'});
  assert.equal(png.data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');JSON.parse(meta.data);
  report.images.push({id,sourceStatus,servedId:actual,bytes:png.data.length,sha256:hash(png.data),metadataSha256:hash(meta.data)});
 }
 assets.get=(id,options)=>get(fallbacks.get(id)??id,options);
 assets.metadata=(id,options)=>metadata(fallbacks.get(id)??id,options);
 if(reportPath)fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 Object.defineProperty(assets,'previewCompatibility',{value:report});
 return assets;
}
