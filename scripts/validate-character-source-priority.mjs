// Source-priority naming gate: mechanical evidence checks only, never aesthetic approval.
const TIERS=['SYS','P1','P2','P3','P4'];
const SOURCE_KINDS={
 SYS:['generic'],P1:['skill','talent','constellation','tcg','combat_voice','status','weapon_attack','skill_phrase'],
 P2:['daily_voice','story','quest','promo','title'],P3:['martial','cultural_term'],P4:['original']
};
const NONEMPTY=x=>typeof x==='string'&&x.trim().length>0;
const detail=x=>NONEMPTY(x)&&x.trim().length>=12;
const normalizeTitle=x=>NONEMPTY(x)?x.normalize('NFKC').replace(/[\p{P}\p{S}\s]/gu,''):'';
const hasLiteralException=r=>{
 const x=r?.literal_exception||{};
 // An independent, concrete player-facing justification; provenance cannot substitute for it.
 return detail(x.why_literal_name)&&detail(x.character_signature)&&detail(x.pool_distinction)&&NONEMPTY(x.reviewer)&&NONEMPTY(x.date)&&NONEMPTY(x.evidence);
};
function culturalDisplayReady(c,add){
 const src=c.source||{},method=src.name_method,term=src.cultural?.original_term||src.exact_text;
 const literal=normalizeTitle(c.name)===normalizeTitle(term);
 if(!['reference_only','cultural_adaptation','literal_exception'].includes(method)){
   add('P3 requires explicit name_method separate from technical provenance');return;
 }
 if(method==='reference_only'){
   if(c.review?.status==='APPROVED'||c.name!==('待命名·'+c.id)){
     add('P3 reference-only technique cannot be player-facing');
   }
   return;
 }
 if(literal&&method!=='literal_exception')add('raw martial term requires independent literal exception');
 if(method==='literal_exception'&&!hasLiteralException(c.review))add('P3 literal-title exception lacks independent evidence');
 if(method==='cultural_adaptation'&&c.review?.status==='APPROVED'){
   if(!detail(src.cultural?.display_derivation)||!detail(c.review?.character_signature)){
     add('P3 adaptation requires character-fit derivation and distinctiveness review');
   }
 }
}

const officialChecked=x=>x&&x.completed===true&&Array.isArray(x.categories)&&x.categories.length>0&&Array.isArray(x.lookups)&&x.lookups.length>0&&x.lookups.every(y=>NONEMPTY(y.query)&&NONEMPTY(y.locator)&&NONEMPTY(y.url)&&/^https:\/\//.test(y.url)&&NONEMPTY(y.entry));
const documentedReject=x=>Array.isArray(x.rejected_candidates)&&x.rejected_candidates.length>0&&x.rejected_candidates.every(z=>NONEMPTY(z.text)&&NONEMPTY(z.source_url)&&NONEMPTY(z.source_entry)&&detail(z.rejection_reason));
const decisionEvidence=x=>officialChecked(x)&&detail(x.reason)&&((x.result==='no_suitable'&&documentedReject(x))||(x.result==='no_match'&&detail(x.no_match_scope)));
function sourceReady(card,why){
 const kind=card.source?.kind,tier=card.source?.tier;
 if(card.source?.verified!==true){why.push('source not verified');return}
 if(tier==='SYS')return;
 if(tier==='P4'){
   if(kind!=='original'||card.source.name_original!==true)why.push('P4 must be explicitly original');
 }else if(!NONEMPTY(card.source?.exact_text)||!NONEMPTY(card.source?.url)||!NONEMPTY(card.source?.section)||!NONEMPTY(card.source?.version)){
   why.push('missing exact source text, link, entry or version');
 }
 if(tier==='P3'){
   const p=card.source?.cultural;
   if(!p||!NONEMPTY(p.original_term)||!NONEMPTY(p.source_url)||!NONEMPTY(p.source_entry)||!detail(p.real_action_meaning)||!detail(p.mechanic_mapping))why.push('P3 must cite a real technique and explain action fit');
 }
}
function lowerTierReady(card,why){
 const t=card.source?.tier,s=card.search||{};
 if(t==='SYS'||t==='P1')return;
 if(!decisionEvidence(s.P1))why.push('missing actual P1 searches and rejection evidence');
 if(t==='P2')return;
 if(!decisionEvidence(s.P2))why.push('missing actual P2 searches and rejection evidence');
 if(t==='P3')return;
 const p3=s.P3;
 const physicalAction=new Set(['weapon_attack','weapon_defense','weapon_combo']);
 const nonWeapon=new Set(['card_management','non_weapon_guard','health_restore','status_magic','narrative_ability']);
 const context=card.action_context;
 if(!physicalAction.has(context)&&!nonWeapon.has(context)){
   why.push('P4 requires explicit recognized action_context (weapon or nonweapon)');
 }
 if(!p3||!['searched','not_applicable'].includes(p3.status)||!detail(p3.reason)){
   why.push('P4 needs explicit P3 lower-priority applicability decision');
   return;
 }
 if(physicalAction.has(context)&&p3.status!=='searched')why.push('P4 weapon action must search P3 before original fallback');
 if(p3.status==='searched'){
   const checkedTerms=Array.isArray(p3.lookups)&&p3.lookups.length>0&&p3.lookups.every(x=>NONEMPTY(x.original_term)&&NONEMPTY(x.url)&&/^https:\/\//.test(x.url)&&NONEMPTY(x.entry)&&detail(x.real_action_meaning));
   const rejectedTerms=Array.isArray(p3.rejected_candidates)&&p3.rejected_candidates.length>0&&p3.rejected_candidates.every(x=>NONEMPTY(x.original_term)&&NONEMPTY(x.source_url)&&NONEMPTY(x.source_entry)&&detail(x.rejection_reason));
   if(!checkedTerms||!rejectedTerms)why.push('P4 P3 search lacks concrete real terms and explicit rejection evidence');
 }
}
export function validateNamingManifest(m,denialRegistry={}){
 const errors=[],blocked=[],seenIds=new Set(),seenNames=new Set();
 const knownDenied=new Set(denialRegistry[m?.role]||[]);
 const add=(id,msg)=>errors.push((id||'manifest')+': '+msg);
 if(!m||!Array.isArray(m.cards)||!m.cards.length)return {errors:['manifest: missing card records'],blockers:[],ready:false};
 if(!NONEMPTY(m.role)||!NONEMPTY(m.artifact)||!['HOLD','APPROVED'].includes(m.status))add('', 'missing role/artifact/status');
 if(!m.official_inventory||!m.official_inventory.P1||!m.official_inventory.P2)add('', 'missing P1/P2 coverage inventory');
 let approvedCount=0;
 for(const c of m.cards){
   const id=NONEMPTY(c?.id)?c.id:'unknown';
   if(seenIds.has(id))add(id,'duplicate id');seenIds.add(id);
   if(!NONEMPTY(c?.name)||seenNames.has(c.name))add(id,'empty/duplicate name');seenNames.add(c.name);
   if(knownDenied.has(c.name))add(id,'known rejected name used without approved registry change');
   if(!NONEMPTY(c?.decision_role)||!NONEMPTY(c?.effect_ref))add(id,'missing decision role or effect reference');
   const t=c?.source?.tier,k=c?.source?.kind;
   if(!TIERS.includes(t)||!SOURCE_KINDS[t]?.includes(k))add(id,'invalid tier or source kind');
   if(t==='SYS'&&!['normal','guard','heavy'].includes(id))add(id,'SYS only allowed for agreed generic basic card IDs');
   if(t==='P3')culturalDisplayReady(c,message=>add(id,message));
   if(!['PENDING','BLOCKED','APPROVED'].includes(c?.review?.status))add(id,'missing review state');
   if(c?.review?.status!=='APPROVED'){blocked.push({id,reason:c?.review?.reason||'not approved'});continue}
   approvedCount++;
   const reasons=[];
   if(c?.review?.history?.some(h=>h.decision==='rejected'&&h.name===c.name))reasons.push('previously rejected name reused');
   for(const n of ['N2','N3','N4','N5','N6'])if(c.review?.checks?.[n]!=='pass')reasons.push(n+' not independently approved');
   const human=c.review?.human||{};
   if(!human.approved||!NONEMPTY(human.reviewer)||!NONEMPTY(human.date)||!NONEMPTY(human.evidence))reasons.push('missing human reviewer/date/evidence');
   sourceReady(c,reasons);lowerTierReady(c,reasons);
   if(t!=='SYS'&&(!m.official_inventory?.P1?.complete||!m.official_inventory?.P2?.complete))reasons.push('P1/P2 official inventory incomplete');
   for(const issue of reasons)add(id,issue);
 }
 if(m.expected_cards!==undefined&&m.expected_cards!==m.cards.length)add('', 'expected_cards count differs from actual');
 if(m.status==='APPROVED'&&(blocked.length||approvedCount!==m.cards.length))add('', 'false APPROVED while names remain unresolved');
 return {errors,blockers:blocked,ready:errors.length===0&&blocked.length===0&&approvedCount===m.cards.length&&m.status==='APPROVED',total:m.cards.length,approved:approvedCount};
}
export function extractEmbeddedCardNames(html){
 const map=new Map(),errors=[];
 const defs=/^\s*\['([a-z][0-9]{2})','([^']+)'/gm;
 const base=/^\s*[a-z][a-z0-9_]*:C\('([^']+)','([^']+)'/gm;
 for(const re of [defs,base])for(const hit of html.matchAll(re)){
   if(map.has(hit[1]))errors.push('duplicate HTML card '+hit[1]);
   map.set(hit[1],hit[2]);
 }
 return {map,errors};
}
export function validateArtifactParity(manifest,html){
 const {map,errors}=extractEmbeddedCardNames(html);
 const found=new Set();
 for(const c of manifest.cards||[]){
   found.add(c.id);
   if(map.get(c.id)!==c.name)errors.push(c.id+': name differs between HTML and review manifest');
 }
 for(const id of map.keys())if(!found.has(id))errors.push(id+': HTML card missing from manifest');
 if(manifest.cards?.length!==map.size)errors.push('card count differs between HTML and manifest');
 if(manifest.expected_cards===75&&map.size!==75)errors.push('full75 has '+map.size+' cards, expected 75');
 return {errors,htmlCount:map.size};
}
