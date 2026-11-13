"""Validate coverage and frozen commits, not source or balance approval."""
import json, sys
from pathlib import Path
P = Path(__file__).resolve().parent
m = json.loads((P/'mechanical.json').read_text())
if len(sys.argv)>1:
    assert json.loads(Path(sys.argv[1]).read_text()) == m, 'recomputed evidence differs'
for role, inventory in m['inventory'].items():
    report = json.loads((P/(role+'.json')).read_text())
    rows = report.get('rows', report.get('cards'))
    ids = [r['id'] for r in rows]
    assert len(ids) == len(set(ids)) == inventory['implemented'], role
    assert set(ids) == {r['id'] for r in inventory['rows']}, role
    sha = report.get('commit', report.get('sha', report.get('reviewed_commit')))
    assert sha == inventory['commit'], (role, sha)
    print(role, len(ids), sha)
assert sum(i['implemented'] for i in m['inventory'].values()) == 122
print('122 unique per-character rows covered; source/naming/balance remain HOLD')
