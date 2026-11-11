"""Deliver measured GIL copies, fixture, actual evidence and original references."""
import sys
import json
import shutil
import hashlib
import zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
name,baseline,service_path=sys.argv[1:4]
alternate=sys.argv[4] if len(sys.argv)>4 else None
CASE=ROOT/'.artifacts/lumine-convergence-20261111'/name
OLD=ROOT/'.artifacts/lumine-convergence-20261111'/baseline
receipt=json.loads((CASE/'gil/candidate.json').read_text(encoding='utf-8'))
service=json.loads(Path(service_path).read_text(encoding='utf-8'))
assert service['buildId']==receipt['buildId']
assert hashlib.sha256((CASE/'gil/candidate.gil').read_bytes()).hexdigest()==receipt['candidate']['sha256']
DEST=Path('F:/New folder/交付')/f'荧原生收敛-TASK-25.2.1-20261111-{name}'
assert not DEST.exists(),'Use a fresh delivery name; never overwrite historical evidence'
DEST.mkdir(parents=True)
for source,target in [(CASE/'gil/candidate.gil','lumine-candidate.gil'),
                      (CASE/'gil/candidate.json','candidate.json'),
                      (OLD/'gil/candidate.gil','old-skin-comparison.gil'),
                      (CASE/'preview/hud.save.json','lumine-pressure-fixture.save.json'),
                      (CASE/'preview/hud.save.json.receipt.json','lumine-pressure-fixture.save.json.receipt.json'),
                      (ROOT/'LICENSE','LICENSE')]:
    shutil.copyfile(source,DEST/target)
shutil.copytree(ROOT/'docs/evidence/lumine-convergence-20261111',DEST/'evidence')
(DEST/'final-frames').mkdir()
for file in (CASE/'visual').iterdir():
    if file.is_file() and (file.suffix=='.png' or file.name.endswith('.json.gz') or file.name=='receipt.json'):
        shutil.copyfile(file,DEST/'final-frames'/file.name)
if alternate:
    other=ROOT/'.artifacts/lumine-convergence-20261111'/alternate
    target=DEST/'quality-alternative';target.mkdir()
    for source,file in [(other/'gil/candidate.gil','candidate.gil'),
                        (other/'gil/candidate.json','candidate.json'),
                        (other/'preview/hud.save.json','pressure-fixture.save.json'),
                        (other/'preview/hud.save.json.receipt.json','pressure-fixture.save.json.receipt.json'),
                        (other/'visual/idle-00.png','battle.png')]:
        shutil.copyfile(source,target/file)
(DEST/'reference').mkdir()
for file in ['lumine_static_approved.png','lumine_idle_approved.gif','README.md']:
    shutil.copyfile(ROOT/'art/characters/traveler-geo/idle-approved-v1'/file,DEST/'reference'/file)
text=f'''# 荧原生收敛候选 · TASK-25.2.1 / PR626 Draft

本机试玩：{service['url']}/ 。可实际拖牌、取消、攻击和查看牌堆。未部署或发布。

候选：{name}。真实画面、配对测量、取舍与 GO/NO-GO 结论见 evidence/README.md。
正式旧皮肤保留。最终验收前不合并发布；本包不提供发布工具。

lumine-candidate.gil 保留正常游戏入口；pressure-fixture 仅包装 Simulator 的十牌双敌三药水准备，不改玩法规则。
old-skin-comparison.gil 是同源旧皮肤比较副本，不是用户正式存档备份。
quality-alternative（如有）保留2739图元画质对照副本；主试玩只运行成本优先档。
官方导入、当前候选官方 ready、官方PC/手机/容量均未验证；Simulator 不代表官方客户端性能。
源图与批准GIF在 reference，字节未改。运行时为静态图元缓存和同周期横带近似，非 GIF 直接导入或逐帧精确复播。
包内不包含第三方SDK；服务停止后的重建入口为仓库 experiments/lumine-idle/README.md。

Build ID：{receipt['buildId']}
GIL SHA256：{receipt['candidate']['sha256']}
'''
(DEST/'README.md').write_text(text,encoding='utf-8',newline='\n')
manifest=[{'path':str(p.relative_to(DEST)).replace('\\','/'),'bytes':p.stat().st_size,
           'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(DEST.rglob('*')) if p.is_file()]
(DEST/'SHA256.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
archive=Path(str(DEST)+'.zip');assert not archive.exists()
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=7) as bundle:
    for p in sorted(DEST.rglob('*')):
        if p.is_file():bundle.write(p,p.relative_to(DEST.parent))
with zipfile.ZipFile(archive) as bundle:
    assert bundle.testzip() is None
    for row in manifest:
        assert hashlib.sha256(bundle.read(DEST.name+'/'+row['path'])).hexdigest()==row['sha256']
print(json.dumps({'directory':str(DEST),'zip':str(archive),'bytes':archive.stat().st_size,'files':len(manifest)+1},ensure_ascii=True))
