import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,readdirSync,existsSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {validateCharacterNames} from "../scripts/validate-character-names.mjs";

const root=fileURLToPath(new URL("../",import.meta.url));
const denials=JSON.parse(readFileSync(join(root,"tests/fixtures/character-naming-rejections.json"),"utf8"));
const candidateDir=join(root,"experiments/characters");
const files=[];
if(existsSync(candidateDir))for(const dir of readdirSync(candidateDir,{withFileTypes:true})){
  if(!dir.isDirectory())continue;
  for(const name of readdirSync(join(candidateDir,dir.name))){
    if(/^v[0-9]+-/.test(name)&&name.endsWith(".json"))files.push(join(candidateDir,dir.name,name));
  }
}
const hutao=JSON.parse(readFileSync(join(candidateDir,"hutao/v5-alpha.json"),"utf8"));
const mutation=(edit)=>{const m=structuredClone(hutao);edit(m);return validateCharacterNames(m,denials).errors.join("; ");};

test("all candidate cards have provenance and explicit N-GATE review status",()=>{
 assert.ok(files.length>0,"at least one candidate required");
 for(const path of files){
   const m=JSON.parse(readFileSync(path,"utf8"));
   const report=validateCharacterNames(m,denials);
   assert.deepEqual(report.errors,[],path+": "+report.errors.join(" / "));
   if(report.blocked+report.pending>0)assert.equal(report.namingReady,false);
 }
});
test("Hu Tao is blocked rather than falsely presented as naming-approved",()=>{
 const report=validateCharacterNames(hutao,denials);
 assert.equal(report.blocked,4);
 assert.equal(report.pending,7);
 assert.equal(report.approved,0);
 assert.equal(report.namingReady,false);
});
test("rejected legacy name cannot return as a display name",()=>{
 assert.match(mutation(m=>{m.cards.find(c=>c.id==="HT5-006").name="灯还亮着";}),/known rejected name/);
 assert.match(mutation(m=>{m.cards.find(c=>c.id==="HT5-010").name="落梅收灯";}),/known rejected name/);
});
test("arbitrary replacement of blocked name does not bypass review",()=>{
 assert.match(mutation(m=>{m.cards.find(c=>c.id==="HT5-006").name="随便守灯";}),/blocked candidate must be placeholder/);
});
test("missing review, provenance drift and duplicate card labels reject",()=>{
 assert.match(mutation(m=>{delete m.cards[0].naming_review;}),/missing naming review/);
 assert.match(mutation(m=>{m.cards.find(c=>c.id==="HT5-007").source.kind="official_skill_adapted";}),/source classification drift/);
 assert.match(mutation(m=>{m.cards[1].name=m.cards[0].name;}),/duplicate name/);
});
test("false human approval and release claims reject",()=>{
 assert.match(mutation(m=>{m.cards[0].naming_review.status="approved";}),/false human approval/);
 assert.match(mutation(m=>{m.naming_clearance="APPROVED";}),/false release clearance/);
});
