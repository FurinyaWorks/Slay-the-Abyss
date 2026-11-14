// The installed encoder's rectangle reader/writer exposes only Z, while the
// native rectangle schema and existing artwork use XYZ. Adapt one isolated
// module URL; preserve all unrelated fields and never edit the installation.
export function withNativeXyzRotations(source){
 if(!source.includes('export function addClientUi('))return{source,enabled:false};
 const writer='field(508,2,s?.rotation?field(3,5,f32(s.rotation)):Buffer.alloc(0))';
 const reader='rotation:float(sub(st,508),3)';
 for(const anchor of [writer,reader])if(source.split(anchor).length-1!==1)throw Error('Native XYZ rectangle schema changed');
 const helpers=`
function $abyssRotationBytes(value){
 const xyz=Array.isArray(value)?value:[0,0,value??0];
 if(xyz.length!==3||!xyz.every(Number.isFinite))throw Error('Native rotation must be finite Z or [X,Y,Z]');
 return Buffer.concat(xyz.flatMap((v,i)=>v?[field(i+1,5,f32(v))]:[]));
}
function $abyssReadRotation(block,read){
 const xyz=[1,2,3].map(i=>read(block,i));
 if(!xyz.every(Number.isFinite))throw Error('Invalid native XYZ rotation');
 return xyz[0]||xyz[1]?xyz:xyz[2];
}
`;
 return{enabled:true,source:helpers+source.replace(writer,'field(508,2,$abyssRotationBytes(s?.rotation))').replace(reader,'rotation:$abyssReadRotation(sub(st,508),float)')};
}
