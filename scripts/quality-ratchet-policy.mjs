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
      if(f.kind==='function') {
        const identity=f.ratchetIdentity;
        if(!identity||typeof identity.owner!=='string'||!seen.has(identity.owner)||
          !/^[a-f0-9]{64}$/.test(identity.context)||!/^[a-f0-9]{64}$/.test(identity.fingerprint))
          throw Error('Invalid '+label+' function identity: '+m.file);
      }
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
// Committed generated Lua follows the same rules as hand-written Lua. Moves to
// another file, renamed declarations, and changed registration/table/block
// ownership create new identities; untracked build outputs are not inputs.
// Match only within the same file and an already matched lexical owner. Exact
// content wins before edited functions, and each old allowance is consumed once.
// An originally ambiguous context never becomes unique by consuming its peers.
function matchFunctions(before,after) {
  const matches=new Map(),queue=[['$','$']];
  const oldChunk=before.find(f=>f.kind==='chunk');
  if(oldChunk)matches.set('$',oldChunk);
  while(queue.length) {
    const [oldOwner,newOwner]=queue.shift();
    const oldChildren=before.filter(f=>f.ratchetIdentity?.owner===oldOwner);
    const newChildren=after.filter(f=>f.ratchetIdentity?.owner===newOwner);
    const contexts=new Set(newChildren.map(f=>f.ratchetIdentity.context));
    for(const context of contexts) {
      const old=oldChildren.filter(f=>f.ratchetIdentity.context===context);
      const now=newChildren.filter(f=>f.ratchetIdentity.context===context);
      const used=new Set();
      const bind=(a,b)=>{used.add(a);matches.set(b.id,a);queue.push([a.id,b.id]);};
      // Identical duplicates are interchangeable only for unchanged content;
      // multiplicity is bounded by the number of old instances, never an ordinal.
      for(const b of now) {
        const a=old.find(a=>!used.has(a)&&a.ratchetIdentity.fingerprint===b.ratchetIdentity.fingerprint);
        if(a)bind(a,b);
      }
      if(old.length===1&&now.length===1&&!matches.has(now[0].id))bind(old[0],now[0]);
    }
  }
  return matches;
}
export function evaluateQualityRatchet({beforeModules,afterModules,beforeCycles,afterCycles}) {
  const before=modules(beforeModules,'base'),after=modules(afterModules,'candidate'),errors=[];
  const fail=(file,line,message)=>errors.push({file,line,message});
  for(const [file,now] of after) {
    const old=before.get(file),limit=Math.max(NEW_MODULE_LINE_LIMIT,old?.lines??0);
    if(now.lines>limit)fail(file,1,'Module length '+(old?.lines??0)+' -> '+now.lines+
      ' exceeds '+limit+'; extract a cohesive owner');
    const prior=matchFunctions(old?.functions??[],now.functions);
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
