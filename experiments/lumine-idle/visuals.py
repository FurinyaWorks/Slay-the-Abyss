"""Review actual browser PNGs; never redraw or substitute the native character."""
from pathlib import Path
from PIL import Image, ImageDraw
import hashlib
import json
import gzip
import shutil

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/evidence/lumine-native-idle-20261111'
OUT.mkdir(parents=True, exist_ok=True)
frames_dir = ROOT / '.artifacts/lumine-idle/visual-210-final-r2'
frames = [Image.open(frames_dir / f'idle-{i:02d}.png').convert('RGB') for i in range(21)]
assert all(im.size == (1280, 720) for im in frames)
crop = (205, 225, 430, 445)
images = [im.crop(crop) for im in frames]
motion = [sum(a != b for a, b in zip(images[0].tobytes(), im.tobytes())) for im in images]
feet = [(246, 412, 286, 442), (350, 412, 390, 442)]
foot_changes = [[sum(a != b for a, b in zip(frames[0].crop(box).tobytes(), im.crop(box).tobytes())) for im in frames] for box in feet]
assert max(motion) > 500, 'No visible native motion captured'
max_foot_changes = max(max(values) for values in foot_changes)
gif = []
for im in images[:20]:
    canvas = Image.new('RGB', (474, 250), '#18202b')
    draw = ImageDraw.Draw(canvas)
    draw.text((10, 8), 'STATIC NATIVE FRAME', fill='white')
    draw.text((247, 8), 'ACTUAL NATIVE IDLE', fill='white')
    canvas.paste(images[0], (6, 28))
    canvas.paste(im, (243, 28))
    gif.append(canvas)
gif[0].save(OUT / 'idle-actual.gif', save_all=True, append_images=gif[1:], duration=110, loop=0, disposal=2, optimize=False)
baseline = Image.open(ROOT / '.artifacts/lumine-idle/visual-baseline-final/idle-00.png').convert('RGB')
source = Image.open(ROOT / 'art/characters/traveler-geo/idle-approved-v1/lumine_static_approved.png').convert('RGBA').resize((210,192), Image.Resampling.LANCZOS)
comparison = Image.new('RGB', (711, 270), '#18202b')
draw = ImageDraw.Draw(comparison)
for x, text in [(8, 'APPROVED SOURCE / 210px'), (245, 'CURRENT / 57 IMAGES'), (482, 'NATIVE / 7303 IMAGES')]:
    draw.text((x, 10), text, fill='white')
comparison.paste(source, (12, 46), source)
comparison.paste(baseline.crop(crop), (243, 28))
comparison.paste(images[0], (480, 28))
draw.text((8, 254), 'Source: scaled reference. Middle/right: crops of actual 1280x720 browser PNGs.', fill='#bbc9d6')
comparison.save(OUT / 'quality-comparison.png')
poses = Image.new('RGB', (225*5, 245), '#18202b')
for column, index in enumerate([0,5,10,15,20]):
    poses.paste(images[index], (225*column,25))
    ImageDraw.Draw(poses).text((225*column+8,8), f't={index*.11:.2f}s', fill='white')
poses.save(OUT/'native-keyposes.png')
shutil.copyfile(frames_dir / 'idle-00.png', OUT / 'battle-actual.png')
shutil.copyfile(ROOT / '.artifacts/lumine-idle/visual-baseline-final/idle-00.png', OUT / 'battle-baseline.png')
before = json.loads(gzip.decompress((frames_dir / 'initial.state.json.gz').read_bytes()))
after = json.loads(gzip.decompress((frames_dir / 'final.state.json.gz').read_bytes()))
report = {'scope': 'actual browser pixels, no substituted artwork; screenshot capture is not performance',
          'size': [1280,720], 'characterCrop': crop, 'motionChangedChannelValues': motion,
          'footRegions': feet, 'footChangedChannelValues': foot_changes,
          'strictFootPixelCheck': 'pass' if max_foot_changes == 0 else 'fail',
          'observedSimulationTimeBefore': before.get('time'), 'observedSimulationTimeAfter': after.get('time'),
          'intendedSampleStepSeconds': .11, 'gifFrames': 20, 'gifDurationMs': 2200,
          'loopClosingChangedChannels': motion[-1],
          'rawPngSha256': [hashlib.sha256((frames_dir / f'idle-{i:02d}.png').read_bytes()).hexdigest() for i in range(21)]}
(OUT / 'visual-measurements.json').write_text(json.dumps(report, indent=2), encoding='utf-8', newline='\n')
print(json.dumps({'maxMotionChanges': max(motion), 'maxFootChanges': max(max(v) for v in foot_changes), 'loopClosingChanges': motion[-1], 'simulationTime': [before.get('time'),after.get('time')]}))
assert max_foot_changes == 0, 'Actual foot pixels changed; artifacts retained as FAIL evidence'
