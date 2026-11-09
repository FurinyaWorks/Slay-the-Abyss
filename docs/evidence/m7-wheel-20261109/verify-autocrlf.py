from pathlib import Path
import subprocess,os,tempfile,json,hashlib
base='ef6b62a23aa85b41e32fb6e5c4e95b697b41d66c';root=Path.cwd();tmp=Path(tempfile.mkdtemp(prefix='wheel-crlf-'));env=os.environ|{'GIT_INDEX_FILE':str(tmp/'index')}
def git(*args,input=None):return subprocess.check_output(['git',*args],env=env,input=input)
git('read-tree',base);oldfiles=git('ls-files','-z');oldattrs=git('check-attr','--cached','--all','--stdin','-z',input=oldfiles)
git('read-tree','HEAD')
report='docs/evidence/m7-wheel-20261109/autocrlf-report.json'
patterns=['tests/fixtures/wheel-event-before.lua','tests/wheel-event-*.test.mjs','tests/helpers/wheel-event-*','tests/helpers/wheel-ci-*','tests/helpers/combined-epoch/pre-wheel-source-epoch.mjs','docs/evidence/m7-wheel-20261109/**/*']
paths=sorted({str(p) for pattern in patterns for p in root.glob(pattern) if p.is_file() for p in [p.relative_to(root)] if str(p) not in [report,'docs/evidence/m7-wheel-20261109/autocrlf.log','docs/evidence/m7-wheel-20261109/index.json','docs/evidence/m7-wheel-20261109/independent-review.json']}|{'.gitattributes','src/lua/abyss_wheel_event.lua'})
git('add','-f','--',*paths);newattrs=git('check-attr','--cached','--all','--stdin','-z',input=oldfiles);assert oldattrs==newattrs,'All prior tracked path attributes must stay unchanged'
checkout=tmp/'checkout';checkout.mkdir();git('-c','core.autocrlf=true','-c','core.eol=crlf','checkout-index','--prefix='+str(checkout)+'/', '--stdin','-z',input=('\0'.join(paths)+'\0').encode())
matched=[]
for p in paths:
 if p in ['.gitattributes','src/lua/abyss_wheel_event.lua']:continue
 a=(checkout/p).read_bytes();b=(root/p).read_bytes();assert a==b,p
 matched.append({'path':p,'sha256':hashlib.sha256(b).hexdigest()})
raw=(checkout/'src/lua/abyss_wheel_event.lua').read_bytes();assert b'\r\n'in raw and raw.replace(b'\r\n',b'\n')==(root/'src/lua/abyss_wheel_event.lua').read_bytes()
out={'passed':True,'base':base,'checkedByteIdenticalPaths':matched,'oldTrackedPathCount':len(oldfiles.split(b'\0'))-1,'allOldPathAttributesUnchanged':True,'actualAutocrlfControl':'Unpinned production Wheel converted to CRLF; new frozen inputs/helpers/evidence kept exact Git bytes.','gitattributesSha256':hashlib.sha256((root/'.gitattributes').read_bytes()).hexdigest(),'limits':'Actual Git autocrlf conversion on Linux, not Windows runtime or Hosted Full. Report/log/index/independent final review excluded to avoid self-reference. No gameplay rerun.'}
(root/report).write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({k:v for k,v in out.items()if k!='checkedByteIdenticalPaths'}|{'checkedPathCount':len(matched)},indent=2))
