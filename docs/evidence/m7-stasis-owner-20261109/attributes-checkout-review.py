from pathlib import Path
import subprocess,os,tempfile,json,hashlib
root=Path.cwd();base='4a51905537fa223e5df4e5ee475152c8a6629af5';tmp=Path(tempfile.mkdtemp(prefix='stasis-crlf-'));idx=tmp/'index';env=os.environ|{'GIT_INDEX_FILE':str(idx)}
def git(*args,input=None):return subprocess.check_output(['git',*args],env=env,input=input)
git('read-tree',base);oldfiles=git('ls-files','-z');oldattrs=git('check-attr','--cached','--all','--stdin','-z',input=oldfiles)
git('read-tree','HEAD')
paths=sorted({str(p) for pattern in ['tests/helpers/stasis-*','tests/stasis-owner-*','docs/evidence/m7-stasis-owner-20261109/**/*'] for p in Path('.').glob(pattern)if p.is_file()}|{'.gitattributes','src/lua/abyss_actor.lua'})
git('add','-f','--',*paths);newattrs=git('check-attr','--cached','--all','--stdin','-z',input=oldfiles);assert oldattrs==newattrs,'existing path attributes unchanged'
checkout=tmp/'checkout';checkout.mkdir();git('-c','core.autocrlf=true','-c','core.eol=crlf','checkout-index','--prefix='+str(checkout)+'/', '--stdin','-z',input=('\0'.join(paths)+'\0').encode())
matched=[]
for p in paths:
 if p in ['.gitattributes','src/lua/abyss_actor.lua']:continue
 assert (checkout/p).read_bytes()==Path(p).read_bytes(),p
 matched.append({'path':p,'sha256':hashlib.sha256(Path(p).read_bytes()).hexdigest()})
raw=(checkout/'src/lua/abyss_actor.lua').read_bytes();assert b'\r\n'in raw and raw.replace(b'\r\n',b'\n')==Path('src/lua/abyss_actor.lua').read_bytes(),'control demonstrates actual autocrlf conversion'
out={'passed':True,'base':base,'checkedByteIdenticalPaths':matched,'oldTrackedPathCount':len(oldfiles.split(b'\0'))-1,'allOldPathAttributesUnchanged':True,'actualAutocrlfControl':'Unpinned current Actor was converted to CRLF by git checkout-index. New pinned source/helpers/evidence retained exact original bytes.','gitattributesSha256':hashlib.sha256(Path('.gitattributes').read_bytes()).hexdigest(),'checkoutPath':str(checkout),'limits':'Actual Git autocrlf conversion on Linux, not Windows runtime or Hosted Full. No gameplay rerun.'}
p=Path('docs/evidence/m7-stasis-owner-20261109/attributes-checkout-review.json');p.write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({k:v for k,v in out.items()if k!='checkedByteIdenticalPaths'}|{'newByteIdenticalCount':len(matched)},indent=2))
