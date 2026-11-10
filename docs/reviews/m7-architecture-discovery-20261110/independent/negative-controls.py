"""Run semantic mutants in an isolated disposable snapshot of a supplied repository."""
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

repo = Path(sys.argv[1] if len(sys.argv) > 1 else Path.cwd()).resolve()
probe = Path(__file__).resolve().with_name('probe.mjs')
assert probe.is_file(), f'Missing adjacent probe: {probe}'
assert (repo / 'node_modules').is_dir(), 'Install repository Node dependencies first'
controls = [
    ('path', 'scripts/check-architecture.mjs',
     'Object.hasOwn(sourcePaths,name)?sourcePaths[name]:`src/lua/${name}.lua`',
     '`src/lua/${name}.lua`', "e.file==='src/lua/nest/a.lua'"),
    ('collision', 'scripts/lua-quality-metrics.mjs',
     'if(name in byModule)throw new Error(`Ambiguous Lua module identity: ${name}`);',
     '', 'Missing expected exception'),
]
# TemporaryDirectory cleans the entire private snapshot even after assertion failure.
with tempfile.TemporaryDirectory(prefix='architecture-review-mutants-') as temporary:
    root = Path(temporary) / 'repo'
    shutil.copytree(repo, root, symlinks=True,
                    ignore=shutil.ignore_patterns('.git', 'node_modules', 'build', '.artifacts'))
    (root / 'node_modules').symlink_to(repo / 'node_modules', target_is_directory=True)
    # A green control rules out setup failures masquerading as rejected mutations.
    green = subprocess.run(['node', str(probe), str(root)], capture_output=True, text=True)
    print('=== isolated green control ===\n' + green.stdout + green.stderr, flush=True)
    assert green.returncode == 0, f'Green control failed: {green.returncode}'
    for name, file, before, after, expected in controls:
        path = root / file
        original = path.read_bytes()
        assert original.decode().count(before) == 1, f'Unexpected mutation target: {name}'
        try:
            path.write_text(original.decode().replace(before, after), encoding='utf8')
            result = subprocess.run(['node', str(probe), str(root)], capture_output=True, text=True)
            output = result.stdout + result.stderr
            print(f'=== {name} mutation: exit {result.returncode} ===\n{output}', flush=True)
            assert result.returncode != 0, f'{name} mutation survived'
            assert 'AssertionError' in output and expected in output, f'{name} failed for wrong reason'
            print(f'PASS {name}: rejected at intended assertion', flush=True)
        finally:
            path.write_bytes(original)
