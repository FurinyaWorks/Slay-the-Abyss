"""Measure actual SDK interior colour continuity, independent of binary masks.

Usage: python measure-uniform.py private/rarity_banner_common.png screenshot.png
The fixture is prepare.mjs banner-mask[-partitioned], 4x, PC1600x900.
No source pixels are written into a production asset or public evidence file.
"""
import hashlib
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt

source, screenshot = map(Path, sys.argv[1:3])
alpha = np.asarray(Image.open(source).convert('RGBA'))[:, :, 3] >= 128
mask = np.zeros((900, 1600), dtype=bool)
# Native banner begins at x475.5; the 0.5px registration uncertainty cannot
# influence this interior measurement because the mask is eroded by 8px.
mask[60:213, 476:1125] = alpha
core = distance_transform_edt(mask) > 8
rgb = np.asarray(Image.open(screenshot).convert('RGB')).astype(int)
error = np.abs(rgb - 158).max(axis=2)[core]
print(json.dumps({
    'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'sdkSha256': hashlib.sha256(screenshot.read_bytes()).hexdigest(),
    'registrationSourcePx': [475.5, 60], 'erosionSourcePx': 8,
    'expectedRGB': [158, 158, 158], 'corePixels': int(core.sum()),
    'meanRgbError': float(error.mean()), 'p95RgbError': float(np.percentile(error, 95)),
    'maxRgbError': int(error.max()), 'pixelsErrorOver2': int((error > 2).sum()),
    'pixelsErrorOver8': int((error > 8).sum()),
    'scope': 'actual software SDK uniform diagnostic; not texture/whole-card fidelity'
}, indent=2))
