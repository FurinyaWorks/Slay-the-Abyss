# Lumine · battle idle v1 (owner-approved visual preview)

**Status:** visual animation accepted by Owner on 2026-11-10; **not** a native GIL, Spine rig, or verified 57-primitive asset. This is a source-locked, replayable *visual reference* for the Miliastra character implementation.

## Approved source and deliverables

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `lumine_static_approved.png` | 1,092,164 | `32830a9ab3f0b181202205bba59447efe660ce3225ab26f32943c54753a105de` |
| `lumine_idle_approved.gif` | 1,852,035 | `0449a8b3094f0a628f493b27157ae2d8b27d646ceb9541f6f5e9ce98a9ebeff1` |
| `lumine_idle_compare.gif` | 1,419,306 | `638be8b90eb33da4846b261b9565424fd8339d32c89413b47e9296472d0885b1` |
| `lumine_idle_133px_spritesheet.png` | 376,473 | `8a9e8dda24e5678c1e279a3a1c42da357e4e5c87d61137da95c4fa18a89a5090` |

- Frozen pose: original Lumine right-facing sword stance, pose, costume, identity and foot baseline preserved.
- Approved result: **20 frames × 110 ms = 2.2 s loop**, smooth low-amplitude whole-body sway + a little streamer lag; feet remain pixel-identical in the locked 95px region.
- This approved animated artwork is not the same as the low-cost native geometry proposal. **57 is an experiment target only**, not a demonstrated same-quality count or safe FPS threshold.
- Earlier v1 was nearly static and v2 warped/disconnected anatomy; both were rejected.
- **Attack / hit remain existing whole-character translation & effects**; no dedicated character clips in this task.

## Deterministic regeneration

From this directory:

```sh
python -m pip install Pillow numpy opencv-python
python build_idle.py
```

Output is in `rendered/`. The generator was rewritten to use paths relative to itself (original experiment used an ephemeral `/mnt/data`). Its generated GIF, side-by-side comparison, and 133px PNG sprite sheet were **byte-for-byte identical** to the files above when re-run in the current runtime. `evidence.json` records frame counts and anchoring.

The rendered full-size 20-frame sprite sheet and individual frames are *derivable* and are deliberately not committed to avoid duplicating ~10MB of unneeded outputs. It produces `review.html` too.

## Strict handoff for native engine

Treat GIF as visual benchmark only; **do not claim it can be imported as texture into Miliastra**. Reuse existing low-resource character shape technique and parent transforms. Count actual instantiated primitives/controls in the native candidate, compare 1x visual fidelity and same-scene responsiveness, then obtain PC/mobile native evidence independently. Retain approved source SHA as the identity anchor.

Source and decisions: TASK-25.2.1 / PR #593 and `docs/art/CARD_ILLUSTRATION_STANDARD.md`. This noncommercial fan-art experiment is not permission to distribute unrelated third-party assets.
