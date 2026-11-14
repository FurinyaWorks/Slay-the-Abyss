"""Collect only exact committed production sources; never repair historical proofs."""
import gzip, hashlib, io, json, pathlib, subprocess, sys
BASE = 'd4ed094e882f433650dfb4d0cbe2686388e4b684'
CURRENT = 'e6245114f5ca25818551d1cdbade30dd5ed42848'
OUT = pathlib.Path('tests/helpers/release-660-source-epoch.json.gz')
def git(*args):
    return subprocess.check_output(['git', *args])
def norm(raw):
    return raw.decode('utf-8').replace('\r\n', '\n')
def inventory(revision):
    return sorted(p for p in git('ls-tree','-r','--name-only',revision,'--','config/architecture.json','src/lua').decode().splitlines() if p == 'config/architecture.json' or p.endswith('.lua'))
def bind(source):
    raw=source.encode('utf-8')
    return dict(source=source,sha256=hashlib.sha256(raw).hexdigest(),gitBlob=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest())
def collect():
    before_paths, after_paths = inventory(BASE), inventory(CURRENT)
    live_paths=sorted(['config/architecture.json']+[str(p) for p in pathlib.Path('src/lua').glob('*.lua')])
    assert live_paths == after_paths, 'complete frozen production inventory'
    assert set(before_paths) <= set(after_paths), 'no unregistered source removal'
    before, current = {}, {}
    for path in after_paths:
        raw=norm(pathlib.Path(path).read_bytes())
        assert raw == norm(git('show',CURRENT+':'+path)), 'exact frozen release source: '+path
        old=bind(norm(git('show',BASE+':'+path))) if path in before_paths else None
        new=bind(raw)
        if old != new:
            before[path],current[path]=old,new
    return dict(schemaVersion=1,normalization='LF',baseCommit=BASE,currentCommit=CURRENT,inventoryBefore=before_paths,inventoryAfter=after_paths,before=before,current=current)
def main():
    mode=sys.argv[1] if len(sys.argv)>1 else '--check'
    assert mode in ('--check','--write')
    proof=collect();raw=json.dumps(proof,ensure_ascii=False,separators=(',',':')).encode()
    buffer=io.BytesIO()
    with gzip.GzipFile(filename='',mode='wb',fileobj=buffer,mtime=0,compresslevel=9) as stream: stream.write(raw)
    data=buffer.getvalue()
    if mode=='--write': OUT.write_bytes(data)
    else: assert OUT.read_bytes()==data, 'stale release660 source archive'
    print(json.dumps(dict(owners=len(proof['current']),paths=len(proof['inventoryAfter']),sha256=hashlib.sha256(data).hexdigest())))
if __name__=='__main__': main()
