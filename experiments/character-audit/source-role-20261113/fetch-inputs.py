"""Materialize only frozen public inputs; validate Git blobs before writing."""
import hashlib, json, sys, urllib.request
from pathlib import Path
manifest = json.loads(Path(__file__).with_name('input-manifest.json').read_text())
root = Path(sys.argv[1] if len(sys.argv)>1 else 'inputs')
for relative, record in manifest.items():
    target = root / relative
    url = 'https://raw.githubusercontent.com/FurinyaWorks/Slay-the-Abyss/' + record['sha'] + '/experiments/characters/' + relative
    data = urllib.request.urlopen(url, timeout=30).read()
    actual = hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
    if actual != record['blob']: raise ValueError('blob mismatch: '+relative)
    target.parent.mkdir(parents=True, exist_ok=True)
    # Exclusive creation protects existing work. Reuse only identical regular files.
    if target.is_symlink(): raise ValueError('symlink refused: '+relative)
    if target.exists():
        if target.read_bytes()!=data: raise ValueError('existing file differs: '+relative)
    else:
        with target.open('xb') as f: f.write(data)
    print(relative, actual)
