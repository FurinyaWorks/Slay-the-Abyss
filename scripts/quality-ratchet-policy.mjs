// Pure policy over the existing AST/Luacheck metrics and SCC graph.
export const NEW_FUNCTION_CC_LIMIT = 15;
export const NEW_MODULE_LINE_LIMIT = 1000;
function modules(rows,label) {
  if(!Array.isArray(rows)) throw Error('Invalid '+label+' modules');
  const out=new Map();
  for(const m of rows) {
    if(typeof m?.file!=='string'||!m.file.startsWith('src/lua/')||!Number.isSafeInteger(m.lines)||
      m.lines<0||!Array.isArray(m.functions)||out.has(m.file)) throw Error('Invalid/duplicate '+label+' module');
    const seen=new Set();
    for(const f of m.functions) {
      if(typeof f.id!=='string'||seen.has(f.id)||!['chunk','function'].includes(f.kind)||
        !Number.isSafeInteger(f.complexity)||f.complexity<1||!Number.isSafeInteger(f.line)||f.line<1)
        throw Error('Invalid '+label+' function metrics: '+m.file);
      seen.add(f.id);
    }
    out.set(m.file,m);
  }
  return out;
}
function groups(rows,label) {
  if(!Array.isArray(rows))throw Error('Invalid '+label+' SCC collection');
  return rows.map(c=>{
    if(!Array.isArray(c?.members)||!c.members.length||new Set(c.members).size!==c.members.length||
      !Array.isArray(c.edges))throw Error('Invalid '+label+' SCC');
    const members=new Set(c.members),edges=new Set();
    for(const e of c.edges){
      if(typeof e?.from!=='string'||typeof e?.to!=='string'||!members.has(e.from)||!members.has(e.to))
        throw Error('Invalid '+label+' SCC edge');
      edges.add(e.from+'\0'+e.to);
    }
    return {members,edges};
  });
}
export function evaluateQualityRatchet({beforeModules,afterModules,beforeCycles,afterCycles}) {
  const before=modules(beforeModules,'base'),after=modules(afterModules,'candidate'),errors=[];
  const fail=(file,line,message)=>errors.push({file,line,message});
  for(const [file,now] of after) {
    const old=before.get(file),limit=Math.max(NEW_MODULE_LINE_LIMIT,old?.lines??0);
    if(now.lines>limit)fail(file,1,'Module length '+(old?.lines??0)+' -> '+now.lines+
      ' exceeds '+limit+'; extract a cohesive owner');
    const prior=new Map((old?.functions??[]).map(f=>[f.id,f]));
    for(const fn of now.functions) {
      const oldFn=prior.get(fn.id);
      const maximum=oldFn?Math.max(NEW_FUNCTION_CC_LIMIT,oldFn.complexity):NEW_FUNCTION_CC_LIMIT;
      if(fn.complexity>maximum)fail(file,fn.line,(fn.name??fn.id)+': CC '+
        (oldFn?.complexity??'new')+' -> '+fn.complexity+' exceeds '+maximum);
    }
  }
  const oldCycles=groups(beforeCycles,'base'),nowCycles=groups(afterCycles,'candidate'),counts=new Map();
  for(const c of nowCycles) {
    const index=oldCycles.findIndex(old=>[...c.members].every(x=>old.members.has(x)));
    if(index<0) {
      const names=[...c.members].sort();
      fail('src/lua/'+names[0]+'.lua',1,'New or expanded SCC: '+names.join(', '));
    } else counts.set(index,(counts.get(index)??0)+c.edges.size);
  }
  for(const [i,count] of counts){
    if(count>oldCycles[i].edges.size){
      const first=[...oldCycles[i].members].sort()[0];
      fail('src/lua/'+first+'.lua',1,'Existing SCC internal dependency pairs: '+
        oldCycles[i].edges.size+' -> '+count);
    }
  }
  return errors.sort((a,b)=>a.file.localeCompare(b.file)||a.line-b.line||a.message.localeCompare(b.message));
}
