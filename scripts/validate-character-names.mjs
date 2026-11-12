// Mechanical N-GATE checks for character candidates. Aesthetic/N4 approval stays with human reviewer.
// Used by tests/character-naming.test.mjs; this is not a source-validation crawler.
export const validateCharacterNames = function validateCharacterNames(model,registry){
 const errors=[],ids=new Set(),names=new Set();let blocked=0,pending=0,approved=0;
 if(!model||!Array.isArray(model.cards)||!model.cards.length)return {errors:["no candidate cards"],blocked,pending,approved,namingReady:false};
 for(const c of model.cards){
  if(ids.has(c.id))errors.push(`duplicate id ${c.id}`);ids.add(c.id);
  if(names.has(c.name))errors.push(`duplicate name ${c.name}`);names.add(c.name);
  if(!c.id || !c.name || !c.role || !c.source?.kind)errors.push(`missing basic data ${c.id}`);
  const r=c.naming_review;
  if(!r){errors.push(`missing naming review ${c.id}`);continue}
  if(!["blocked","pending","approved"].includes(r.status))errors.push(`invalid naming status ${c.id}`);
  if(r.source_kind!==c.source.kind)errors.push(`source classification drift ${c.id}`);
  if(!r.source_locator)errors.push(`missing source locator ${c.id}`);
  for(const key of ["N0","N1","N2","N3","N4","N5","N6"]){
    if(!["pass","pending","fail"].includes(r.checks?.[key]))errors.push(`missing ${key} check ${c.id}`);
  }
  const role=/^[A-Z]+/.exec(c.id)?.[0];
  for(const deny of registry.rejected||[]){if(deny.role===role && deny.name===c.name)errors.push(`known rejected name ${c.id}: ${c.name}`)}
  if((r.history||[]).some(h=>h.decision==="rejected_2026_11_12" && h.name===c.name))errors.push(`rejected historical name reused ${c.id}`);
  if(r.status==="blocked"){
    blocked++;
    if(c.name!==`待命名·${c.id}`)errors.push(`blocked candidate must be placeholder ${c.id}`);
    if(!r.reason || !(r.history||[]).some(h=>h.decision==="rejected_2026_11_12"))errors.push(`blocked candidate missing rejection audit ${c.id}`);
  } else if(r.status==="pending"){
    pending++;
    if(c.name.startsWith("待命名"))errors.push(`placeholder must be blocked ${c.id}`);
  } else if(r.status==="approved"){
    approved++;
    const h=r.human_review||{};
    if(!h.approved||!h.reviewer||!h.reviewed_at||!h.evidence_url)errors.push(`false human approval ${c.id}`);
    if(["N0","N1","N2","N3","N4","N5","N6"].some(k=>r.checks?.[k]!=="pass"))errors.push(`false N-GATE approval ${c.id}`);
    if(c.source.kind==="official_skill_adapted" && r.source_verified!==true)errors.push(`unverified official approval ${c.id}`);
  }
 }
 if((model.naming_clearance==="APPROVED" || model.status==="production_ready") && (blocked||pending))errors.push("false release clearance with unresolved names");
 return {errors,blocked,pending,approved,namingReady:errors.length===0&&blocked===0&&pending===0,total:model.cards.length};
};
