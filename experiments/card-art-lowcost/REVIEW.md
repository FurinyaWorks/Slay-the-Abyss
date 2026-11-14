# Independent review — cleave-a, 2026-11-14

## Decision
NO-GO for production, premium-quality approval, or performance qualification. This can be shown only as a clearly labelled **failed research probe**, alongside the exact reference and a concrete next hypothesis. It is not a visually approved direction yet. Final aesthetic approval remains with the owner.

## Evidence actually inspected
- `/tmp/card-art-ref/cleave.png`: detailed Geo construct reference.
- `experiments/card-art-lowcost/cleave-a.host.png`: current simulator screenshot, title 星陨剑, enlarged art, 144×64 copy and complete 148×208 card.
- Exact-size crop from the screenshot, not only enlarged source art.
- `build.py`, `cleave-a.geometry.json`, `cleave-a.native.json`, `counts.json`, simulator receipt.

## Visual assessment
- Preserved: central warm Geo object, flat cap, angular gold markings, cool/warm palette, two targets. Broad semantic identity is partly present.
- Lost: reference's segmented, rounded stone construction. The candidate reads as a faceted barrel or block; the cap looks like a lid rather than heavy overlapping stone.
- Targets have flat bases, pitched roof-like silhouettes and rectangular eyes; at actual size they resemble houses more readily than slimes.
- Impact lacks outward rising motion, foreshortened spray, layered debris and near/far target response. The horizontal gold bands read as a static floor or platform.
- Gold marks are flat stripes, not luminous crevices. Few broad value planes fail to establish stone thickness, occlusion and illumination. Enlarging exposes these deficits, while reducing does not recover motion or material.
- Therefore: native budget achieved, visual objective not achieved. Do not infer success from control count or card recognizability alone.

## Technical finding requiring correction
`Art.poly` claims all authored polygons are convex and fans from vertex zero. At least three successful sample polygons are concave:

| geometry index (zero based) | polygon area | sum of absolute fan triangle areas |
|---|---:|---:|
| 4 | 1834 | 2331 |
| 5 | 774 | 1035 |
| 12 | 171.5 | 312.5 |

The larger fan areas demonstrate overlapping/out-of-bound fill; native raster is not a faithful rendering of source polygons. Split these into validated convex pieces or use an established correct triangulator; do not claim source/native equivalence before checking.

## Budget check
Actual native tree: 68 images (57 native triangle 100003, 11 native rectangle 100001), one container, zero masks: **69 controls per illustration**. The comparison board has multiple copies and additional frame/text; 69 is not the board total. Simulator success is not official editor/device evidence. No runtime performance conclusion follows.

## Recommended next controlled probe
After fixing native geometry fidelity, retain the same composition and palette. Alter only (1) broad curved/segmented stone silhouette and occlusion, (2) rounded slime silhouettes, (3) outward impact direction. Preserve source, native screenshot, exact-size crop and change reasons. Do not spend on 0/1/5/10 load tests until the small sample passes independent visual screening. If this flat-shape premise again fails the reference comparison, change representation rather than extending the batch.
