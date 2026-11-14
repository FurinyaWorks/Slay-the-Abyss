# Independent visual review: round 2

Reviewed 2026-11-14. Scope: isolated research examples, not production or official-device acceptance.

## Decision

**Yes: show the shape → impact comparison to the owner as a materially improved research direction, with the reference and exact-size views. No: do not label it premium-quality, production-approved, or a successful low-cost replacement yet.**

The corrected old design remains a failed visual baseline. The reference-shape study repairs the most obvious identity defects; the reference-impact study improves action clarity at 30 additional controls. This is sufficient to ask the owner which direction is worth further art work, not sufficient to begin asset rollout or performance qualification.

## Evidence inspected

Actually opened the three new `*.host.png` simulator screenshots, then inspected unscaled 144×64 crops side by side with the reference reduced to 144×64. Also inspected `counts.json`, `build.py`, `reference_study.py`, `triangulate.py` and `test_triangulate.py`. I did not rerun rendering or tests, preserving the release test window.

The reference is the existing detailed cleave artwork (`/tmp/card-art-ref/cleave.png` during this review). The source and simulator are not official editor/device evidence. Full-card screenshots use a diagnostic frame, not an approved production card frame.

## Stage comparison

| Stage | Controls / illustration | Visual result |
|---|---:|---|
| Old design, geometry corrected | 71 | Still reads as a faceted barrel with house-like targets and a static platform. Correct geometry does not solve the art problem. Do not present this as a candidate. |
| Reference-shape study | 92 | Rounded stone silhouette, segmented blocks, deeper joints and recognizable rounded targets are a clear improvement. At 144×64 the Geo-object-plus-slimes identity survives. Without ground contact/action cues, the construct and targets float; this is a shape study, not a finished attack illustration. |
| Same shape + impact | 122 | Outward diagonals and debris reconnect the scene to an area attack. At actual size, the yellow burst distinguishes it from the quiet study. The shape/target layer remains the same, so the change is interpretable. Best sample to show as work in progress. |

Counts include the single illustration container, not the entire diagnostic comparison board or production UI. 122 exceeds the ideal 100-control target but fits the experimental 150-control ceiling; that is a budget tradeoff, not a quality pass.

## Remaining visual gaps

1. **Mass and contact:** the oval cap appears slightly detached above the body, like a lid. The body retains a rounded pot impression. The reference has a broad heavy stone cap, angular overlapping blocks and a grounded eruption.
2. **Lighting/material:** gold veins now have a brighter core and darker surround, but they remain diagrammatic stripes. They do not light adjacent stone planes. The reference establishes stone through directional light, occlusion, broad cracks and chips. Adding tiny texture is not the first remedy at 144×64.
3. **Action:** the impact version has useful outward direction but still resembles flat ribbons along a floor. The reference has a strong foreground burst, rising spray and an elliptical shockwave wrapping the base. Foreground/background layering should carry this before extra fragments are added.
4. **Targets:** rounded silhouettes now read as slimes instead of buildings. Their repeated gray highlight bars can read as eyelids or hats, and they have little contact/trajectory evidence. Do not solve this by adding more targets; improve the existing three.
5. **Composition/style:** both new studies are clean, cartoon-like vector illustrations. They are not yet a faithful restoration of the richer, weightier reference. Owner acceptance of that stylistic simplification cannot be presumed.

## Technical review

The original fan-triangulation defect has been addressed directly: simple-polygon validation, ear clipping, area/winding checks, and exact native placement with expansion disabled. Altitude splitting preserves a failed triangle instead of nudging it. Static review found no new blocker in this fix.

The updated test code now covers round-2 polygon records as well as the archived failure fixtures; ellipse rows are correctly excluded from polygon triangulation. The reported eight-test pass is the implementer's run, not an independent rerun. Shape projection and ellipse/line transforms still require real rendering inspection; the screenshots inspected here provide simulator-only visual evidence. Thin triangulation seams remain visible at the enlarged diagnostic scale and should not be misreported as stone detailing.

## Next step / stopping boundary

Show only the precise reference plus shape/impact pair, clearly labelled as research, and retain the old baseline in the archive. If the owner wants another iteration, keep composition fixed and test **grounded mass + elliptical base burst** as the next controlled change, while reducing the cap gap and replacing the flat highlight bars. Do not expand this into other cards or a runtime rollout on the strength of the control counts. No production enablement, performance pass or final aesthetic approval is granted by this review.
