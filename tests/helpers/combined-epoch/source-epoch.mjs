import {extendBattleQueueEpoch} from '../battle-queue-source-epoch.mjs';
import {extendOfficialUiRepairEpoch} from '../official-ui-repair-source-epoch.mjs';
import {extendJointUiEpoch} from '../joint-ui-source-epoch.mjs';
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
export const preBattleQueueEpoch=extendJointUiEpoch(preJointUiEpoch);
export const preOfficialUiRepairEpoch=extendBattleQueueEpoch(preBattleQueueEpoch);
export const sourceEpoch=extendOfficialUiRepairEpoch(preOfficialUiRepairEpoch);
