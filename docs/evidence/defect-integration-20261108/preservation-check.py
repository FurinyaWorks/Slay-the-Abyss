import subprocess,pathlib,json,hashlib,re
r=pathlib.Path('/workspace/scratch/c1a4970a76e0/m7-defect-refactor-integration-20261108')
refs=['d8a57cae2a867200ca8e588abc0d368e6cdb3799','12950b1ca474e7c0a57ff68e1de1780090194c71','27b2ccc969795001581a32a2900b9e0474712876']
def tree(ref):
 d={}
 for row in subprocess.check_output(['git','ls-tree','-r','-z',ref],cwd=r).split(b'\0'):
  if not row:continue
  meta,path=row.split(b'\t',1);mode,kind,sha=meta.decode().split();d[path.decode()]=(mode,sha)
 return d
def text(ref,p):return subprocess.check_output(['git','show',ref+':'+p],cwd=r).decode()
base,a,b=[tree(ref) for ref in refs]; managed=['backlog/tasks/task-74.20 - 治理阻碍角色扩展的高风险复杂度.md','scripts/ci-test-timings.json','tests/ci-complete-calibration.test.mjs','tests/ci-runtime.test.mjs','tests/class-potion-orb-source-inverse.test.mjs','tests/watcher-actor-source-inverse.test.mjs','tests/helpers/ci-complete-calibration-source-inverse.mjs','tests/helpers/m7-core-final-source-inverse.mjs']; rows=[]
for p in sorted(set(a)|set(b)):
 if p in managed:continue
 av,bv,old=a.get(p),b.get(p),base.get(p)
 assert av==bv or av==old or bv==old or av is None or bv is None,('unexpected conflict',p)
 expected=av if bv==old or bv is None else bv
 assert expected
 actual=subprocess.check_output(['git','hash-object','--',p],cwd=r).decode().strip() if (r/p).exists() else subprocess.check_output(['git','rev-parse',':'+p],cwd=r).decode().strip()
 assert actual==expected[1],(p,expected,actual)
 rows.append({'path':p,'gitBlob':actual})
p=managed[0];current=(r/p).read_text()
for ref in refs[1:]:
 old=text(ref,p)
 for section in ['PLAN','NOTES']:
  pattern='<!-- SECTION:'+section+':BEGIN -->(.*?)<!-- SECTION:'+section+':END -->'
  original=re.search(pattern,old,re.S).group(1).strip();new=re.search(pattern,current,re.S).group(1)
  for paragraph in original.split('\n\n'):assert paragraph in new,(ref,section,paragraph)
 for value in re.findall(r'^    - docs/.*|^  - docs/.*',old,re.M):assert value in current,value
 for label,pattern in [('status',r'^status:.*$'),('owner',r'assignee:\n(?: +.*\n)+'),('acceptance',r'<!-- AC:BEGIN -->(.*?)<!-- AC:END -->')]:
  original=re.search(pattern,old,re.M|re.S if label=='acceptance' else re.M);new=re.search(pattern,current,re.M|re.S if label=='acceptance' else re.M);assert original and new and original.group()==new.group(),label
out={'inputs':refs,'preservedCount':len(rows),'productionCount':sum(x['path'].startswith('src/lua/') and x['path'].endswith('.lua') for x in rows),'managedFiles':managed,'allInputBacklogPlansNotesDocsPreserved':True,'ownerStatusAcPreserved':True,'files':rows}
(r.parent/'defect-integration-preservation.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in out.items() if k!='files'},ensure_ascii=False,indent=2))
