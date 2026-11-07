// Uses the installed tool's measured editorCount; never substitutes raw nodes.
export const officialGraphLimit=3000;
export function assertGraphBudget(graphs){
 if(!Array.isArray(graphs)||graphs.length===0)throw Error('Missing graph budget inventory');
 const rows=graphs.map(graph=>{
  for(const key of ['nodeCount','editorCount'])if(!Number.isSafeInteger(graph[key])||graph[key]<0)
   throw Error(`Missing or invalid ${key}: ${graph.name??graph.id}`);
  if(graph.nodeCount>officialGraphLimit||graph.editorCount>officialGraphLimit)
   throw Error(`Official graph budget exceeded: ${graph.name??graph.id} raw=${graph.nodeCount} editor=${graph.editorCount} limit=${officialGraphLimit}`);
  return {id:graph.id??graph.graphId,name:graph.name,nodeCount:graph.nodeCount,editorCount:graph.editorCount,headroom:officialGraphLimit-Math.max(graph.nodeCount,graph.editorCount)};
 });
 return {limit:officialGraphLimit,graphs:rows,scope:'offline GIL editor-weight count; official validation and runtime load remain separate'};
}
export function assertCompiledBudget(written){
 if(!Array.isArray(written))throw Error('Missing compiled graph budgets');
 return assertGraphBudget(written.map(graph=>({id:graph.graphId,...graph.limits})));
}
