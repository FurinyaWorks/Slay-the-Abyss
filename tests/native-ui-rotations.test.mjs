import test from'node:test';import assert from'node:assert/strict';import{withNativeXyzRotations}from'../scripts/native-ui-rotations.mjs';
import{preserveSimulatorRotations}from'../scripts/native-simulator-importer.mjs';
const fixture=`const field=(id,wire,data)=>Buffer.from(JSON.stringify({id,wire,data:Array.from(data)}));
const f32=v=>{const b=Buffer.alloc(4);b.writeFloatLE(v);return b};
export function addClientUi(s){return field(508,2,s?.rotation?field(3,5,f32(s.rotation)):Buffer.alloc(0))}
export function get(st){const sub=(s,id)=>s[id],float=(b,id)=>b?.[id]??0;return {rotation:float(sub(st,508),3)}}`;
test('XYZ encoder adaptation preserves scalar Z bytes and reads native axes without a holder',async()=>{
 const adapted=withNativeXyzRotations(fixture);assert(adapted.enabled);
 const original=await import('data:text/javascript;base64,'+Buffer.from(fixture).toString('base64'));
 const native=await import('data:text/javascript;base64,'+Buffer.from(adapted.source).toString('base64'));
 for(const z of [undefined,0,45,-27.25])assert.deepEqual(native.addClientUi({rotation:z}),original.addClientUi({rotation:z}));
 assert.deepEqual(native.get({508:{1:20,2:0,3:31}}),{rotation:[20,0,31]});
 assert.deepEqual(native.get({508:{3:45}}),{rotation:45});
 assert.deepEqual(native.get({508:{}}),{rotation:0});
 const encoded=native.addClientUi({rotation:[20,0,31]});
 const stream=Buffer.from(JSON.parse(encoded).data).toString(),fields=[...stream.matchAll(/\{[^}]+\}/g)].map(m=>JSON.parse(m[0]));
 assert.deepEqual(fields.map(f=>[f.id,Buffer.from(f.data).readFloatLE()]),[[1,20],[3,31]],'Native X/Z float fields survive encoding, with default Y omitted');
 for(const rotation of [[1,2],[1,2,NaN],Infinity])assert.throws(()=>native.addClientUi({rotation}),/finite/);
 assert.throws(()=>withNativeXyzRotations(fixture.replace('rotation:float(sub(st,508),3)','rotation:0')),/schema changed/);
});
test('independent simulator import retains X/Y while preserving the original scalar Z contract',async()=>{
 const source='export function read(t){const out={},turn=Number(t.rotation?.z??0);if(turn)out.rotation=turn;return out}';
 const original=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const adapted=await import('data:text/javascript;base64,'+Buffer.from(preserveSimulatorRotations(source)).toString('base64'));
 for(const z of [undefined,0,31,-17])assert.deepEqual(adapted.read({rotation:{z}}),original.read({rotation:{z}}));
 assert.deepEqual(adapted.read({rotation:{x:20,y:0,z:31}}),{rotation:[20,0,31]});
 assert.throws(()=>adapted.read({rotation:{x:NaN}}),/Invalid/);
 assert.throws(()=>preserveSimulatorRotations(source.replace('if(turn)out.rotation=turn;','')),/schema changed/);
});
