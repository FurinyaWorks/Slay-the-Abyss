"""Targeted artifact consistency checks, no runtime or whole-suite work."""
import json
from pathlib import Path
p=Path(__file__).with_name('round2')
def nodes(n):
 yield n
 for c in n.get('children',[]):yield from nodes(c)
rows=json.loads((p/'counts.json').read_text())
assert {x['id'] for x in rows} == {'cleave-a-corrected','cleave-reference-shape','cleave-reference-impact'}
assert json.loads((p/'failures.json').read_text())==[]
for row in rows:
 art=json.loads((p/(row['id']+'.native.json')).read_text());tree=list(nodes(art))
 assert len(tree)==row['total']
 assert sum(n['kind']=='image' for n in tree)==row['images']
 assert all(n['imageId'] in (100001,100002,100003) for n in tree if n['kind']=='image')
 assert row['total']<=150, (row['id'],row['total'])
 save=json.loads((p/(row['id']+'.save.json')).read_text());board=list(nodes(save['assets']['server']['root']))
 assert len({n['id'] for n in board})==len(board)
 assert len({n['guid'] for n in board})==len(board)
 assert not save['assets']['scripts']
 assert all(not n.get('scriptMappingIds') for n in board)
 print(row['id'],row['total'],'controls; unique board IDs; no scripts')
