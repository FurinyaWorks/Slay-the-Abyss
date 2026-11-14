"""Extract static centreline geometry from the exact LFS PNG alpha only.

Zhang-Suen thinning preserves branches/holes. RDP tolerance is measured at the
118px display size; no screenshot tracing, texture payload or runtime drawing.
"""
import argparse
import hashlib
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'docs/design/reference-ui-lab/constellation-exact.png'
SHA = '5780bc541d322b369b61f656908da59bdeee7f3ad83988edca8be23776720ecd'


def thin(mask):
    a = np.pad(mask.astype(np.uint8), 1)
    while True:
        removed = 0
        for phase in (0, 1):
            p = [a[:-2, 1:-1], a[:-2, 2:], a[1:-1, 2:], a[2:, 2:],
                 a[2:, 1:-1], a[2:, :-2], a[1:-1, :-2], a[:-2, :-2]]
            n = sum(p)
            changes = sum(((p[i] == 0) & (p[(i+1) % 8] == 1)).astype(np.uint8) for i in range(8))
            if phase == 0:
                gate = (p[0]*p[2]*p[4] == 0) & (p[2]*p[4]*p[6] == 0)
            else:
                gate = (p[0]*p[2]*p[6] == 0) & (p[0]*p[4]*p[6] == 0)
            kill = (a[1:-1, 1:-1] == 1) & (n >= 2) & (n <= 6) & (changes == 1) & gate
            removed += int(kill.sum())
            a[1:-1, 1:-1][kill] = 0
        if not removed:
            return a[1:-1, 1:-1]


def paths(skeleton):
    points = set(map(tuple, np.argwhere(skeleton)))
    def neighbours(p):
        y, x = p
        return sorted(q for q in points.intersection({(y+dy, x+dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dx or dy})
                      if q[0] == y or q[1] == x or ((y, q[1]) not in points and (q[0], x) not in points))
    graph = {p: neighbours(p) for p in points}
    visited, result = set(), []
    for start in sorted(points, key=lambda p: (len(graph[p]) == 2, p)):
        for nxt in graph[start]:
            edge = tuple(sorted((start, nxt)))
            if edge in visited:
                continue
            chain = [start, nxt]
            visited.add(edge)
            while len(graph[nxt]) == 2 and nxt != start:
                other = next(p for p in graph[nxt] if p != chain[-2])
                edge = tuple(sorted((nxt, other)))
                if edge in visited:
                    break
                visited.add(edge)
                chain.append(other)
                nxt = other
            if len(chain) >= 3:
                result.append(chain)
    return result


def fit_strokes(points, tolerance):
    """Fit either a straight stroke or a circular arc, measured against alpha's skeleton."""
    if len(points) < 2:
        return []
    a, b = points[0], points[-1]
    delta = b-a
    length = np.linalg.norm(delta)
    if length > 0:
        relative = points-a
        error = np.abs(delta[0]*relative[:, 1]-delta[1]*relative[:, 0])/length
        if error.max() <= tolerance:
            return [('line', a.tolist()+b.tolist())]
    else:
        error = np.linalg.norm(points-a, axis=1)
    if len(points) >= 6:
        matrix = np.column_stack((2*points[:, 0], 2*points[:, 1], np.ones(len(points))))
        cx, cy, c = np.linalg.lstsq(matrix, np.sum(points*points, axis=1), rcond=None)[0]
        radius = np.sqrt(max(0, c+cx*cx+cy*cy))
        angles = np.unwrap(np.arctan2(points[:, 1]-cy, points[:, 0]-cx))
        radial = np.abs(np.linalg.norm(points-[cx, cy], axis=1)-radius)
        sweep = angles[-1]-angles[0]
        if 4 < radius < 280 and radial.max() <= tolerance and .08 < abs(sweep) < np.pi*1.99:
            # Monotonic angle: no arc may take a shortcut across a loop or branch.
            if np.sum(np.abs(np.diff(angles))) < abs(sweep)+.15:
                return [('arc', [float(cx), float(cy), float(radius), float(angles[0]), float(sweep)])]
    if len(points) <= 3:
        return [('line', a.tolist()+b.tolist())]
    split = max(1, min(len(points)-2, int(np.argmax(error))))
    return fit_strokes(points[:split+1], tolerance)+fit_strokes(points[split:], tolerance)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--tolerance', type=float, default=.7)
    parser.add_argument('--arcs', action='store_true', default=True)
    parser.add_argument('--lines-only', action='store_false', dest='arcs')
    args = parser.parse_args()
    assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == SHA
    alpha = np.array(Image.open(SOURCE).getchannel('A'))
    mask = (alpha >= 64).astype(np.uint8)
    distance = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    segments, arcs = [], []
    for path in paths(thin(mask)):
        xy = np.array([[x, y] for y, x in path], dtype=np.float32)
        if args.arcs:
            for kind, values in fit_strokes(xy, args.tolerance*512/118):
                if kind == 'line':
                    a, b = np.array(values[:2]), np.array(values[2:])
                    centre = (a+b)/2
                else:
                    cx, cy, radius, start, sweep = values
                    centre = np.array([cx+radius*np.cos(start+sweep/2), cy+radius*np.sin(start+sweep/2)])
                middle = np.argmin(np.sum((xy-centre)**2, axis=1))
                y, x = path[middle]
                width = max(1.5, float(distance[y, x])*2-1)
                (segments if kind == 'line' else arcs).append([*[round(float(v), 5) for v in values], round(width, 3)])
            continue
        simple = cv2.approxPolyDP(xy, args.tolerance*512/118, False).reshape(-1, 2)
        for a, b in zip(simple, simple[1:]):
            middle = np.argmin(np.sum((xy-(a+b)/2)**2, axis=1))
            y, x = path[middle]
            width = max(1.5, float(distance[y, x])*2-1)
            segments.append([*[round(float(v), 3) for v in a], *[round(float(v), 3) for v in b], round(width, 3)])
    output = ROOT / 'data/presentation/constellation-geometry.json'
    output.write_text(json.dumps(dict(sourceSha256=SHA, sourceSize=[512, 512], displaySize=118,
                                     tolerance=args.tolerance, opacity=167/255, segments=segments, arcs=arcs), indent=2)+'\n')
    scale = 4
    fitted = Image.new('RGBA', (512*scale, 512*scale))
    draw = ImageDraw.Draw(fitted)
    for x1, y1, x2, y2, width in segments:
        draw.line((x1*scale, y1*scale, x2*scale, y2*scale), fill=(255, 224, 162, 167), width=round(width*scale))
    for cx, cy, radius, start, sweep, width in arcs:
        angles = np.linspace(start, start+sweep, max(10, int(abs(sweep)*radius*scale)))
        draw.line([(float(cx+radius*np.cos(t))*scale, float(cy+radius*np.sin(t))*scale) for t in angles], fill=(255,224,162,167), width=round(width*scale))
    fitted = fitted.resize((512, 512), Image.Resampling.LANCZOS)
    original = Image.new('RGBA', (512, 512), (255, 224, 162))
    original.putalpha(Image.fromarray(alpha))
    evidence = ROOT / 'docs/evidence/constellation-gold'
    evidence.mkdir(parents=True, exist_ok=True)
    fitted.save(evidence / 'simplified.png')
    comparison = Image.new('RGB', (1024, 690), '#303341')
    for i, img in enumerate((original, fitted)):
        comparison.paste(img, (i*512, 25), img)
        small = img.resize((118, 118), Image.Resampling.LANCZOS)
        comparison.paste(small, (i*512+197, 560), small)
    ImageDraw.Draw(comparison).text((12, 8), 'Exact alpha / gold CSS tint', fill='white')
    ImageDraw.Draw(comparison).text((524, 8), f'Native shapes: {len(segments)+len(arcs)} ({len(arcs)} arcs) / 118px below', fill='white')
    comparison.save(evidence / 'comparison.png')
    print(json.dumps(dict(primitives=len(segments)+len(arcs), arcs=len(arcs), tolerance=args.tolerance, output=str(output))))


if __name__ == '__main__':
    main()
