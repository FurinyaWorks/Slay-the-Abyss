"""Package reviewed artifacts only. No SDK, live save, or publisher bundled."""
from pathlib import Path
import shutil
import json
import hashlib
import zipfile

ROOT=Path(__file__).resolve().parents[2]
DEST=Path('F:/New folder/交付/荧原生待机-TASK-25.2.1-20261111')
DEST.mkdir(parents=True,exist_ok=True)
receipt=json.loads((ROOT/'build/lumine-accepted-review/210/candidate.json').read_text(encoding='utf-8'))
assert hashlib.sha256(Path(receipt['candidate']['path']).read_bytes()).hexdigest()==receipt['candidate']['sha256']
for source,name in [
    ('build/lumine-accepted-review/210/candidate.gil','lumine-idle-candidate.gil'),
    ('build/lumine-accepted-review/baseline/candidate.gil','comparison-baseline.gil'),
    ('build/lumine-accepted-review/210/candidate.json','candidate.json'),
    ('.artifacts/lumine-idle/reviewed-210/hud.save.json','lumine-pressure-fixture.save.json'),
    ('.artifacts/lumine-idle/reviewed-210/hud.save.json.receipt.json','lumine-pressure-fixture.save.json.receipt.json'),
    ('LICENSE','LICENSE'),
]:
    target=DEST/name
    if target.exists():
        assert target.read_bytes()==(ROOT/source).read_bytes(), 'Refuse to overwrite a different delivery'
    else:
        shutil.copyfile(ROOT/source,target)
shutil.copytree(ROOT/'docs/evidence/lumine-native-idle-20261111',DEST/'evidence',dirs_exist_ok=True)
(DEST/'reference').mkdir(exist_ok=True)
for name in ['lumine_static_approved.png','lumine_idle_approved.gif','README.md']:
    shutil.copyfile(ROOT/'art/characters/traveler-geo/idle-approved-v1'/name,DEST/'reference'/name)
service=json.loads((ROOT/'.artifacts/lumine-idle/live-210-one/service.json').read_text(encoding='utf-8'))
text=f'''# 荧原生待机技术候选 · TASK-25.2.1

结论：正式皮肤替换 NO-GO。提供真实可试玩候选，不替换现有正式皮肤，不发布。

本机试玩：{service['url']}/ 。进入十牌/双敌场景，可以正常拖牌、取消、连续攻击及查看牌堆。

实际画面和动静态对比见 evidence/battle-actual.png、evidence/idle-actual.gif、evidence/quality-comparison.png；完整数据见 evidence/README.md。

lumine-idle-candidate.gil 是本轮副本GIL，构建及读回通过，未官方导入/ready，不能当发布候选。comparison-baseline.gil 仅为同源旧小人比较副本，不是用户正式存档备份。

lumine-pressure-fixture.save.json 是Simulator压力夹具，只包装启动准备为十牌双敌三药水；实际GIL保留正常启动流程。此包不含Simulator SDK，服务停止后的复现入口为仓库 experiments/lumine-idle/README.md。

原图和已批准GIF在reference，字节保持不变。7303静态图片、18个运动父容器，2.2秒同周期横带近似，非GIF逐帧直接导入。旧输入→绘制中位39.1ms，新87.5ms；首次完整显示CPU准备约0.09–0.13秒→3.87秒。严格脚部像素不变量FAIL，官方PC/手机/容量UNVERIFIED。

GIL SHA256：{receipt['candidate']['sha256']}
Build ID：{receipt['buildId']}
'''
(DEST/'README.md').write_text(text,encoding='utf-8')
manifest=[]
for p in sorted(DEST.rglob('*')):
    if p.is_file() and p.name!='SHA256.json':
        manifest.append({'path':str(p.relative_to(DEST)).replace('\\','/'),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(DEST/'SHA256.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
archive=Path(str(DEST)+'.zip')
if archive.exists():
    with zipfile.ZipFile(archive) as old:
        assert receipt['buildId'] in old.read(DEST.name+'/README.md').decode('utf-8'), 'Refuse to overwrite another delivery archive'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=7) as bundle:
    for p in sorted(DEST.rglob('*')):
        if p.is_file():bundle.write(p,p.relative_to(DEST.parent))
with zipfile.ZipFile(archive) as bundle:
    assert bundle.testzip() is None
legacy=DEST.with_suffix('.zip')
if legacy!=archive and legacy.exists():
    with zipfile.ZipFile(legacy) as old:
        owned=receipt['buildId'] in old.read(DEST.name+'/README.md').decode('utf-8')
    if owned:legacy.unlink()
print(json.dumps({'directory':str(DEST),'zip':str(archive),'zipBytes':archive.stat().st_size,'files':len(manifest)+1}))
