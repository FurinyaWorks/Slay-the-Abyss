// Preserve the complete Defect predecessor as an independently importable epoch.
export * from './pre-formation-source-epoch.mjs';
import {sourceEpoch as preEncounterFormationEpoch} from './pre-formation-source-epoch.mjs';
import {extendEncounterFormationEpoch} from '../encounter-formation-source-epoch.mjs';
export {preEncounterFormationEpoch};
// The frozen pre-Warrior facade authenticates its 51 raw owners on every call.
export const preWarriorStatusEpoch=extendEncounterFormationEpoch(preEncounterFormationEpoch);
import {extendWarriorStatusEpoch} from '../warrior-status-source-epoch.mjs';
// Current public consumers authenticate all 52 raw owners on every call.
export const sourceEpoch=extendWarriorStatusEpoch(preWarriorStatusEpoch);
