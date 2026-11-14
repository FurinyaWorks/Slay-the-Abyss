"""Trace only the supplied title lettering, never the menu background."""
import hashlib
import json
import sys
import cv2
import numpy as np
from shapely import Polygon, constrained_delaunay_triangles

source, destination = sys.argv[1:]
raw = open(source, 'rb').read()
image = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
assert image.shape[:2] == (941, 1672), 'Revalidate changed reference coordinates'
shapes = []
# Tight regions exclude the badge edges and all character/background pixels.
for name, box, colour, mode in [
    ('wordmark', (85, 158, 475, 255), '#FFF0D9', 'cream'),
    ('number', (465, 153, 556, 254), '#FF292E', 'red'),
    ('subtitle', (110, 277, 390, 306), '#481D24', 'dark'),
]:
    x, y, right, bottom = box
    crop = image[y:bottom, x:right]
    b, g, r = cv2.split(crop)
    mask = ((r > 200) & (g > 175) & (b > 140) if mode == 'cream' else
            (r > 190) & (g < 95) & (b < 100) if mode == 'red' else
            (r < 145) & (g < 115) & (b < 115))
    contours, hierarchy = cv2.findContours(mask.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    for i, contour in enumerate(contours):
        if hierarchy[0][i][3] != -1 or cv2.contourArea(contour) < 4:
            continue
        points = lambda c: cv2.approxPolyDP(c, 1.6, True).reshape(-1, 2).tolist()
        shell, holes = points(contour), []
        child = hierarchy[0][i][2]
        while child != -1:
            hole = points(contours[child])
            if len(hole) >= 3:
                holes.append(hole)
            child = hierarchy[0][child][0]
        if len(shell) < 3:
            continue
        polygon = Polygon(shell, holes)
        assert polygon.is_valid
        for triangle in constrained_delaunay_triangles(polygon).geoms:
            coords = [[round((px+x)*1280/1672, 3), round((py+y)*720/941, 3)]
                      for px, py in list(triangle.exterior.coords)[:3]]
            shapes.append({'part': name, 'colour': colour, 'points': coords})
assert len(shapes) <= 600, 'Static title budget exceeded'
with open(destination, 'w', encoding='utf8') as out:
    json.dump({'referenceSha256': hashlib.sha256(raw).hexdigest(), 'shapes': shapes}, out, separators=(',', ':'))
print('Static title triangles:', len(shapes))

