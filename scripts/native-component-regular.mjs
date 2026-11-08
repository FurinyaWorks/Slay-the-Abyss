import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

// Source assets stay at the injected importer. This module contains only typed
// conversion rules; original regular61 and newly encoded client70 are distinct.
export function createRegularComponentAdapter({importer, wire, clientControlRecord}) {
 if (!importer || !wire || typeof clientControlRecord !== 'function') throw Error('Regular component adapter dependencies are required');
 const {fields, one, field, wrap, container, replace} = wire;
 const loadOriginalComponent = importer.loadOriginalComponent;
 const uiMetadata = importer.metadata ?? importer.uiMetadata;
 if (typeof loadOriginalComponent !== 'function' || typeof uiMetadata !== 'function') throw Error('Original component importer is required');
const sha=b=>createHash('sha256').update(b).digest('hex');
const scalar=(b,id,wire)=>{const matches=fields(b).filter(f=>f.id===id);assert(matches.length<=1,'Duplicate field '+id);if(matches.length)assert.equal(matches[0].wire,wire,'Wrong wire '+id);return matches[0];};
const n=(b,id,def=0)=>{const value=Number(scalar(b,id,0)?.value??def);assert(Number.isSafeInteger(value),'Unsafe scalar '+id);return value;};
const bytes=(b,id)=>scalar(b,id,2)?.data??Buffer.alloc(0);
const float=(b,id)=>{const value=scalar(b,id,5)?.data.readFloatLE()??0;assert(Number.isFinite(value),'Nonfinite float '+id);return value;};
const components=r=>fields(r.ui).filter(f=>f.id===505&&f.wire===2);
const component=(r,kind)=>{const found=components(r).filter(c=>n(c.data,502)===kind);assert.equal(found.length,1,'Expected one component '+kind);return found[0].data;};
const inside=(r,kind,id)=>bytes(bytes(component(r,kind),503),id);
const hue=c=>'#'+(c&0xffffff).toString(16).padStart(6,'0'),alpha=c=>(c>>>24)/255;
const vector=(b,first=501)=>({x:float(b,first),y:float(b,first+1)});
const platforms=['KEYBOARD','TOUCHSCREEN','CONTROLLER_CONSOLE','CONTROLLER_MOBILE'];
function legacyTextContract(t){
 const allowed=[502,503,504,505,507,510,511,512,514,515];
 assert(fields(t).every(f=>allowed.includes(f.id)),'Unverified legacy text flag');
 for(const id of [502,507,510,511,512,515])assert(scalar(t,id,0),'Required legacy text scalar '+id);
 assert(scalar(t,505,2),'Required legacy text content');
 assert.equal(n(t,512),260326,'Unverified source font asset');
 assert(n(t,502)>0&&n(t,502)<=200,'Unsupported source font size');assert.equal(n(t,507),12,'Unverified minimum font size');
 assert([0,1].includes(n(t,503))&&[0,1].includes(n(t,504)),'Unverified legacy text alignment');
 assert([0,1].includes(n(t,514)),'Unverified legacy outline flag');
 assert.equal(n(t,511),0xffffff,'Unverified legacy text background');assert.equal(n(t,515),0x33333333,'Unverified legacy outline colour');
 for(const id of [510,511,515])assert(n(t,id)>=0&&n(t,id)<=0xffffffff,'Invalid ARGB text colour');
 const text=one(t,505);assert.deepEqual(fields(text).map(f=>[f.id,f.wire]),[[501,2]],'Unverified legacy text content schema');
 const content=one(text,501);assert(Buffer.from(content.toString('utf8')).equals(content),'Invalid source UTF-8');
 return {sourceFontAssetId:260326,targetNativeDefault:12,targetClientTextField503:12,equivalence:'NOT_EQUIVALENT_UNTIL_OFFICIAL',
  policy:'Explicit compatibility mapping; original font identity is not preserved or certified.'};
}
function classifyOriginal56(raw,ownerId){
 const signature=b=>fields(b).map(f=>[f.id,f.wire]);
 assert.deepEqual(signature(raw),[[46,2],[501,0],[502,0],[503,2]]);assert.equal(bytes(raw,46).length,0);assert.equal(n(raw,501),38);assert.equal(n(raw,502),56);
 const inner=one(raw,503);assert.deepEqual(signature(inner),[[47,2],[501,0],[502,0],[503,0],[504,2]]);assert.equal(n(inner,501),40);assert.equal(n(inner,502),56);assert.equal(n(inner,503),1);
 const p=one(inner,47);assert.deepEqual(signature(p),[[1,2],[2,2],[3,0]]);assert.equal(bytes(p,1).length,0);assert.deepEqual(signature(one(p,2)),[[501,5],[502,5]]);assert.equal(float(one(p,2),501),50);assert.equal(float(one(p,2),502),50);assert([1,2].includes(n(p,3)));
 const owner=one(inner,504);assert.deepEqual(signature(owner),[[2,0],[3,0],[4,0]]);assert.equal(n(owner,2),1);assert.equal(n(owner,3),8);assert.equal(n(owner,4),ownerId);
 return {ownerReferencePath:'503/504/4',nonReferencePayload:'47: 1 empty, 2 float(50,50), 3 exact enum 1|2',sha256:sha(raw),visualBehavior:'UNRESOLVED; exact raw component retained'};
}
function originalRect(r){
 const config=bytes(bytes(bytes(component(r,12),503),13),12),ss=fields(config).filter(f=>f.id===501&&f.wire===2);
 assert.equal(ss.length,4,'All original device states required');
 const result={};for(const st of ss){const t=one(st.data,502),rot=bytes(t,508),s=bytes(t,501),p=vector(bytes(t,506));
  result[platforms[n(st.data,501)]]={scale:{...vector(s,1),z:float(s,3)},rotation:{...vector(rot,1),z:float(rot,3)},anchorMin:vector(bytes(t,502)),anchorMax:vector(bytes(t,503)),offset:vector(bytes(t,504)),size:vector(bytes(t,505)),pivot:p};
 }
 assert.equal(Object.keys(result).length,4);return {transformByPlatform:result,syncAllDevices:n(config,504)===1,config};
}
function prepareOriginalCardCharacter(sampleId,selector){
 const original=loadOriginalComponent(sampleId,selector);assert.equal(original.recordType,61);
 const ledger=[],texts=[],nodes=[];
 for(const r of original.records){
  assert(r.content.every(k=>[15,12,23,56,38,25].includes(k)),'Unmapped component kind '+r.id+' '+JSON.stringify(r.content));
  const rect=originalRect(r),shown=inside(r,23,14),c={id:'original'+r.id,guid:r.id,name:r.name,kind:r.content.includes(38)?'image':r.content.includes(25)?'textbox':'container',active:true,visible:n(shown,502)!==1,canControllerFocus:false,...rect,children:[],scriptMappingIds:[],giaRelatedGuids:[],sourceUiSha256:r.uiSha256};delete c.config;
  ledger.push({id:r.id,field:'12/13/12/platforms',status:'PRESERVED_ALL_FOUR_RAW_TRANSFORMS',sha256:sha(rect.config),xyz:true});
  if(r.children.length)ledger.push({id:r.id,field:'503/children',status:'EXPLICIT_LAYER_ORDER_TRANSLATION',sourceOrder:'front-to-back',clientOrder:'back-to-front',sourceChildren:[...r.children],clientChildren:[...r.children].reverse()});
  if(r.content.includes(56)){const raw=component(r,56),classification=classifyOriginal56(raw,r.id);ledger.push({id:r.id,field:'component56',status:'RETAINED_RAW_IN_CLIENT_ROOT_UNRESOLVED_BEHAVIOR',classification,sha256:sha(raw),rawHex:raw.toString('hex'),note:'No equivalence to client container91 is asserted. Source regular group metadata remains an extra component; official compatibility unverified.'});}
  if(c.kind==='image'){
   const image=inside(r,38,31),allowed=[2,3,4,5,6,10];assert(fields(image).every(f=>allowed.includes(f.id)),'Unknown image material field');
   assert.equal(bytes(image,6).length,0,'Nonempty regular material6 unsupported');assert.equal(bytes(image,10).length,0,'Nonempty regular material10 unsupported');
   const binding=bytes(image,3);assert.equal(fields(binding).length,1);assert.equal(one(binding,501,0),0xffffffffffffffffn,'Dynamic image binding unsupported');
   assert([0,1].includes(n(image,5)),'Unsupported image mode');
   Object.assign(c,{imageSource:'StaticReference',imageId:n(image,2),imageColor:n(image,4),enableMask:false,enableFill:false,enableSoftEdge:false,reverseMaskArea:false});
   // c.imageId is assigned above, so make the shape capability check explicitly.
   c.imageType=c.imageId<=100006?null:n(image,5)===1?'Stretch':'Basic';
   ledger.push({id:r.id,field:'38/31',status:'TYPED_IMAGE_TRANSLATION',imageId:c.imageId,argb:c.imageColor,modeRaw:n(image,5),sourceSha256:sha(image),mapping:{2:'96/84/503 assetId',4:'96/84/502 AARRGGBB',5:'96/84/501 image mode',3:'fixed -1 binding retained in provenance; static asset selected',6:'empty -> mask disabled',10:'empty -> no extra material'}});
  }
  if(c.kind==='textbox'){
   const t=inside(r,25,19),fontMapping=legacyTextContract(t),content=bytes(bytes(t,505),501).toString('utf8');
   Object.assign(c,{text:content,fontSize:n(t,502,20),minimumFontSize:n(t,507,12),adaptiveFontSize:n(t,506)===1,fontColor:n(t,510,0xffffffff),bgColor:n(t,511,0xffffff),enableOutline:n(t,514)!==1,outlineColor:n(t,515,0x33333333),horizontalAlignment:['Left','Middle','Right'][n(t,503)]??'Left',verticalAlignment:['Top','Middle','Bottom'][n(t,504)]??'Top'});
   texts.push({originalId:r.id,name:r.name,text:content,transformByPlatform:rect.transformByPlatform,fontSize:c.fontSize,fontAssetId:n(t,512),fontMapping,binding:'UNASSIGNED_SOURCE_SLOT'});
   ledger.push({id:r.id,field:'25/19',status:'EXPLICIT_FONT_COMPATIBILITY_MAPPING_NOT_IDENTITY_PRESERVATION',rawHex:t.toString('hex'),sourceSha256:sha(t),fontAssetId:n(t,512),fontMapping,note:'Only the observed legacy schema is allowed; unknown fonts/flags fail closed. Official font equivalence remains unverified.'});
  }
  nodes.push(c);
 }
 const byId=new Map(nodes.map(r=>[r.guid,r]));
 for(const r of original.records){const node=byId.get(r.id);node.children=r.children.map(id=>{assert(byId.has(id));return byId.get(id);});}
 const root=byId.get(original.rootId);assert(root);assert.equal(nodes.length,original.records.length);
 return {original,root,nodes,ledger,textAliases:texts,originalUiBytes:original.records.map(r=>({id:r.id,bytes:r.ui,sha256:r.uiSha256})),clientTemplateVerified:false,verificationBoundary:'Actual client serialization/readback and SDK preview can be produced; component56 and legacy text semantics require current official acceptance. Regular61 is not merely renamed70.'};
}

function typedClient(r,node,slot,isTemplate){
 const base=node.transformByPlatform.KEYBOARD,kind={textbox:'text',image:'image',container:'container'}[node.kind];
 let result=clientControlRecord({id:r.id,name:r.name,kind,parent:isTemplate?undefined:r.parent,children:[...r.children].reverse(),slot,isTemplate,rect:{position:[base.offset.x,base.offset.y],size:[base.size.x,base.size.y]},visible:node.visible,rootForm:false,image:node.imageId,colour:node.imageColor,text:node.kind==='textbox'?{content:node.text,fontSize:node.fontSize,minFontSize:node.minimumFontSize,autoSize:node.adaptiveFontSize,colour:node.fontColor,background:node.bgColor,outline:node.enableOutline,outlineColour:node.outlineColor,align:{Left:'left',Middle:'centre',Right:'right'}[node.horizontalAlignment],valign:{Top:'top',Middle:'middle',Bottom:'bottom'}[node.verticalAlignment]}:undefined});
 // Keep the source rect component byte-for-byte except its explicitly typed
 // rectangle kind tag. Original XY rotations, all devices and sync survive.
 const sourceRect=component(r,12),generatedRect=fields(result).find(f=>f.id===505&&n(f.data,502)===12).data;
 const srcConfig=bytes(bytes(bytes(sourceRect,503),13),12),dstConfig=bytes(bytes(bytes(generatedRect,503),13),12),kindField=fields(dstConfig).find(f=>f.id===502);
 const newConfig=Buffer.concat([...fields(srcConfig).filter(f=>f.id!==502).map(f=>f.raw),...(kindField?[kindField.raw]:[])]);
 const mappedRect=replace(sourceRect,503,2,replace(one(sourceRect,503),13,2,replace(one(one(sourceRect,503),13),12,2,newConfig)));
 result=Buffer.concat(fields(result).map(f=>f.id===505&&n(f.data,502)===12?field(505,2,mappedRect):f.raw));
 if(node.kind==='image'){
  const sourceMode=n(inside(r,38,31),5),c=fields(result).find(f=>f.id===505&&n(f.data,502)===96).data,payload=bytes(bytes(c,503),84);
  const adjusted=replace(c,503,2,replace(one(c,503),84,2,Buffer.concat([...(sourceMode?[field(501,0,sourceMode)]:[]),payload])));
  result=Buffer.concat(fields(result).map(f=>f.id===505&&n(f.data,502)===96?field(505,2,adjusted):f.raw));
 }
 if(r.content.includes(56))result=Buffer.concat([result,field(505,2,component(r,56))]);
 return result;
}
function preparedToNativeComponent(prepared,{slotStart=1}={}){
 assert(Number.isSafeInteger(slotStart)&&slotStart>0);let slot=slotStart;
 const records=prepared.original.records.map(r=>{
  assert.equal(sha(r.ui),r.uiSha256,'Original record changed after prepare');
  const ui=typedClient(r,prepared.nodes.find(n=>n.guid===r.id),slot++,r.id===prepared.original.rootId),meta=uiMetadata(ui),updated={ui};
  assert.deepEqual(meta.children,[...r.children].reverse(),'Source front-to-back must become client back-to-front');assert.equal(meta.name,r.name,'Original name changed');
  const before=originalRect(r),after=originalRect(updated);assert.deepEqual(after.transformByPlatform,before.transformByPlatform);assert.equal(after.syncAllDevices,before.syncAllDevices);
  const withoutKind=b=>Buffer.concat(fields(b).filter(f=>f.id!==502).map(f=>f.raw));assert(withoutKind(before.config).equals(withoutKind(after.config)),'Source rectangle data changed');
  if(r.content.includes(56))assert(component(updated,56).equals(component(r,56)),'Original component56 changed');
  if(r.content.includes(38)){const p=inside(updated,96,84),q=inside(r,38,31);assert.equal(n(p,503),n(q,2));assert.equal(n(p,502),n(q,4));assert.equal(n(p,501),n(q,5));}
  if(r.content.includes(25)){const p=inside(updated,84,75),q=inside(r,25,19);legacyTextContract(q);assert.equal(n(p,503),12,'Explicit native default font mapping changed');assert.equal(n(p,512),n(q,502,20));assert.equal(n(p,504),n(q,510,0xffffffff));assert(bytes(bytes(p,510),501).equals(bytes(bytes(q,505),501)),'Original text changed');}
  return {...r,entry:{...r.entry,recordType:r.id===prepared.original.rootId?70:15},sourceRecordType:r.entry.recordType,sourceUiSha256:r.uiSha256,ui,...meta,uiSha256:sha(ui)};
 });
 return {...prepared.original,recordType:70,sourceRecordType:61,records,conversion:{kind:'TYPED_REGULAR_TO_CLIENT',sourceSha256:prepared.original.sourceSha256,preservedOriginal56:true,allOriginalDevicesXYZ:true,layerOrder:'SOURCE_FRONT_TO_BACK_TO_CLIENT_BACK_TO_FRONT',fontEquivalence:'NOT_EQUIVALENT_UNTIL_OFFICIAL',visualSdkStatus:'SEE_CURRENT_PRODUCT_RECEIPT',official:'NOT_RUN'}};
}
function encodeOriginalAsClientTemplate(baseBytes,prepared){
 const payload=container(baseBytes),section=one(payload,9),existing=fields(section).filter(f=>f.id===502&&f.wire===2).map(f=>uiMetadata(f.data)),used=new Set(existing.map(r=>r.id));
 for(const r of prepared.original.records)assert(!used.has(r.id),'Original identity collision; explicit typed rebase required');
 const nativeComponent=preparedToNativeComponent(prepared,{slotStart:Math.max(0,...existing.map(r=>r.slot??0))+1});const slotMap={},mapped=nativeComponent.records.map(r=>{slotMap[r.id]=r.slot;return {id:r.id,bytes:r.ui};});
 const rootId=prepared.original.rootId;let roots=0;
 const next=Buffer.concat([...fields(section).map(f=>{if(f.id===501&&f.wire===2){roots++;return field(501,2,Buffer.concat([f.data,fields(mapped[0].bytes).find(v=>v.id===501).raw.subarray(2)]));}return f.raw;}),...mapped.map(r=>field(502,2,r.bytes))]);assert.equal(roots,1);
 const result=wrap(baseBytes,replace(payload,9,2,next)),round=fields(one(container(result),9)).filter(f=>f.id===502&&f.wire===2);
 for(const old of prepared.original.records){const now=round.find(f=>n(f.data,501)===old.id);assert(now);const meta=uiMetadata(now.data);assert.deepEqual(meta.children,[...old.children].reverse());assert.equal(meta.name,old.name);
  const updated={ui:now.data},a=originalRect(old),b=originalRect(updated);assert.deepEqual(b.transformByPlatform,a.transformByPlatform);assert.equal(b.syncAllDevices,a.syncAllDevices);
  if(old.content.includes(56)){assert(component(updated,56).equals(component(old,56)));}
  if(old.content.includes(38)){const p=inside(updated,96,84),q=inside(old,38,31);assert.equal(n(p,503),n(q,2));assert.equal(n(p,502),n(q,4));assert.equal(n(p,501),n(q,5));}
 }
 return {bytes:result,nativeComponent,templateIndex:rootId,idMapping:Object.fromEntries(prepared.original.records.map(r=>[r.id,r.id])),slotMap,sourceRecordType:61,typedClientKinds:mapped.map(r=>({id:r.id,kinds:uiMetadata(r.bytes).content})),rawReadbackVerified:true,official:'NOT_RUN',clientTemplateVerified:false};
}

 return {prepareOriginalCardCharacter, prepareOriginalRegularComponent:prepareOriginalCardCharacter, preparedToNativeComponent, encodeOriginalAsClientTemplate, classifyOriginal56, originalRect};
}
