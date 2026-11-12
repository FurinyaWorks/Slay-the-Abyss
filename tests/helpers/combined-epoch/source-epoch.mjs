import {extendCursesEpoch} from '../curses-source-epoch.mjs';
import {extendBattleQueueEpoch} from '../battle-queue-source-epoch.mjs';
import {extendDefectActorEpoch} from '../defect-actor-source-epoch.mjs';
import {extendJoustEpoch} from '../joust-source-epoch.mjs';
import {extendOfficialUiRepairEpoch} from '../official-ui-repair-source-epoch.mjs';
import {extendJointUiEpoch} from '../joint-ui-source-epoch.mjs';
import {extendNoncombatEpoch} from '../noncombat-source-epoch.mjs';
import {extendNoncombatDemandEpoch} from '../noncombat-demand-source-epoch.mjs';
import {extendComponentUiEpoch} from '../component-ui-source-epoch.mjs';
import {extendRoomUiEpoch} from '../room-ui-source-epoch.mjs';
// Preserve the complete Defect predecessor as an independently importable epoch.
export * from './pre-formation-source-epoch.mjs';
import {sourceEpoch as preEncounterFormationEpoch} from './pre-formation-source-epoch.mjs';
import {extendEncounterFormationEpoch} from '../encounter-formation-source-epoch.mjs';
export {preEncounterFormationEpoch};
// Retain the current M7 chain before the exact component UI source layer.
export const preComponentUiEpoch=extendEncounterFormationEpoch(preEncounterFormationEpoch);
export const preRoomUiEpoch=extendComponentUiEpoch(preComponentUiEpoch);
export const preJointUiEpoch=extendRoomUiEpoch(preRoomUiEpoch);
export const preJoustEpoch=extendJointUiEpoch(preJointUiEpoch);
export const preDefectActorEpoch=extendJointUiEpoch(preJointUiEpoch);
export const preBattleQueueEpoch=extendJointUiEpoch(preJointUiEpoch);
export const preNoncombatDemandEpoch=extendNoncombatEpoch(extendBattleQueueEpoch(preBattleQueueEpoch));
export const preCursesEpoch=extendNoncombatDemandEpoch(preNoncombatDemandEpoch);
export const cursesIntegratedEpoch=extendCursesEpoch(preCursesEpoch);
export {sourceEpoch} from '../closeout-source-epoch.mjs';
import {sourceEpoch as preGoldenIdolEpoch} from './pre-golden-idol-source-epoch.mjs';
import {extendGoldenIdolEpoch} from '../golden-idol-source-epoch.mjs';
export {preGoldenIdolEpoch};
export const goldenIdolIntegratedEpoch=extendGoldenIdolEpoch(preGoldenIdolEpoch);

export const joustIntegratedEpoch=extendJoustEpoch(preJoustEpoch);

export const preOfficialUiRepairEpoch=extendBattleQueueEpoch(preBattleQueueEpoch);
export const officialUiRepairIntegratedEpoch=extendOfficialUiRepairEpoch(preOfficialUiRepairEpoch);
