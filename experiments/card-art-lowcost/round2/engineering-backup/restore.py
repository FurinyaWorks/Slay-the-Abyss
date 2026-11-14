"""Verify repository engineering evidence; optionally restore six large JSON files.
Uses only Python stdlib. Never executes saved scripts or overwrites different data.
"""
import argparse, gzip, hashlib, io, json, re
from pathlib import Path


def verify(root, restore=False):
    manifest=json.loads((root/'engineering-backup/manifest.json').read_text())
    verified=[]
    for row in manifest['files']:
        name=row['file']
        if not re.fullmatch(r'(cleave-[a-z-]+\.(geometry\.json|host\.png|native\.json|receipt\.json|save\.json|source\.svg)|counts\.json|failures\.json)',name):
            raise ValueError('unexpected evidence filename')
        expected=name if row['storage']=='raw' else 'engineering-backup/'+name+'.gz'
        if row['stored']!=expected or row['storage'] not in ('raw','gzip'):
            raise ValueError('unexpected storage path')
        source=root/expected
        if source.is_symlink() or source.resolve().parent not in (root.resolve(),(root/'engineering-backup').resolve()):
            raise ValueError('evidence path must not be a symlink')
        data=source.read_bytes()
        if row['storage']=='gzip':
            if len(data)!=row['storedBytes'] or hashlib.sha256(data).hexdigest()!=row['storedSha256']:
                raise ValueError('compressed evidence bytes differ: '+name)
            if not 0 < row['bytes'] < 2_000_000:
                raise ValueError('unexpected decompressed size')
            with gzip.GzipFile(fileobj=io.BytesIO(data)) as stream:
                data=stream.read(row['bytes']+1)
        if len(data)!=row['bytes'] or hashlib.sha256(data).hexdigest()!=row['sha256']:
            raise ValueError('original evidence bytes differ: '+name)
        if hashlib.sha1(f'blob {len(data)}\0'.encode()+data).hexdigest()!=row['gitBlob']:
            raise ValueError('original Git blob differs: '+name)
        if restore and row['storage']=='gzip':
            target=root/name
            if target.is_symlink():
                raise ValueError('restore destination is a symlink')
            if target.exists():
                if target.read_bytes()!=data:raise ValueError('refusing to overwrite different file: '+name)
            else:
                with target.open('xb') as f:f.write(data)
        verified.append((name,len(data),row['sha256']))
    return verified


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--restore',action='store_true',help='restore verified large JSONs beside the images; never overwrite different bytes')
    args=parser.parse_args()
    results=verify(Path(__file__).resolve().parent.parent,args.restore)
    print(f'Verified {len(results)} evidence files, {sum(x[1] for x in results)} original bytes')
    for name,size,sha in results:print(name,size,sha)
