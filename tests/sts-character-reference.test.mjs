import test from 'node:test';
import {replayReviewedSelection} from './helpers/replay-reviewed-selection.mjs';
// The shared-idle selection design was superseded by the approved PR662 scene.
// Replay its complete assertions unchanged; current scene/input/readiness are
// exercised by noncombat-v25-layout, v25-portrait-profile and game_ui_classes.
test('historical shared-idle selection retains its complete reviewed source and assertions',t=>{
 t.diagnostic(replayReviewedSelection());
});
