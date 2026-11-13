import { readFileSync } from 'node:fs';
const validate = function(plan){
 const errors=[]; const check=(v,m)=>{if(!v)errors.push(m);};let total=0,existing=0,reserved=0; const rows=[];
 check(plan.characters.length===4,"four characters required");
 for(const k of ["production_enabled","human_approved","balance_approved","g8_expansion_approved","g9_approved"])check(plan[k]===false,k+" must be false");
 const expected={ganyu:Array.from({length:8},(_,i)=>"ganyu-"+String(i+1).padStart(2,"0")),xiao:Array.from({length:8},(_,i)=>"x0"+(i+1)),zhongli:Array.from({length:8},(_,i)=>"zl0"+(i+1)),keqing:Array.from({length:5},(_,i)=>"KQ00"+(i+1))};
 for(const c of plan.characters){const ids=c.groups.flatMap(g=>g.existing_ids);const n=c.groups.reduce((s,g)=>s+g.budget,0); const r=c.groups.reduce((s,g)=>s+g.reserved,0);
 check(n===75,c.character+" budget");check(new Set(ids).size===ids.length,c.character+" duplicate IDs");check(JSON.stringify([...ids].sort())===JSON.stringify(expected[c.character]?.sort()),c.character+" snapshot ID mapping");
 check(/^[a-f0-9]{40}$/.test(c.snapshot.ref)&&/^[a-f0-9]{40}$/.test(c.snapshot.blob),c.character+" provenance");
 for(const g of c.groups){check(Number.isInteger(g.budget)&&g.budget>=0&&g.reserved===g.budget-g.existing_ids.length,c.character+"/"+g.id+" counts"); check(g.status==="HOLD"&&g.new_values===null,c.character+"/"+g.id+" HOLD");
 if(g.id==="reserve")check(g.cost_range===null&&g.rarities===null,c.character+" unassigned");
 else check(Array.isArray(g.cost_range)&&g.cost_range.length===2&&g.cost_range[0]<=g.cost_range[1]&&g.rarities.length>0,c.character+"/"+g.id+" ranges");
 for(const k of ["role","upgrade","dedup","source_gap"])check(typeof g[k]==="string"&&g[k].length>0,c.character+"/"+g.id+" "+k);
 }check(c.relic.new_values===null&&c.relic.status==="EXISTING_CANDIDATE_HOLD",c.character+" relic");
 for(const k of ["human_approved","balance_approved","g8_expansion_approved","g9_approved"])check(c[k]===false,c.character+" "+k);
 total+=n;existing+=ids.length;reserved+=r;rows.push({character:c.character,budget:n,existing_candidates:ids.length,reserved:r,unassigned:c.groups.find(g=>g.id==="reserve").budget});}
 check(total===300&&existing===29&&reserved===271,"global totals");check(plan.sources.every(s=>s.url&&s.authority&&s.readability&&s.version&&s.limits),"source metadata");
 return {scope:"规划结构校验；不验证来源真实性、角色机制、命名、平衡或G关口通过",ok:errors.length===0,errors,totals:{budget:total,existing_candidates:existing,reserved},characters:rows};
};
const plan = JSON.parse(readFileSync(new URL('./plan.json', import.meta.url), 'utf8'));
const result = validate(plan);
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
