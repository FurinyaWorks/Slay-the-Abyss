import {extendComponentUiEpoch} from '../component-ui-source-epoch.mjs';
// Preserve the complete Defect predecessor as an independently importable epoch.
export * from './pre-formation-source-epoch.mjs';
import {sourceEpoch as preEncounterFormationEpoch} from './pre-formation-source-epoch.mjs';
import {extendEncounterFormationEpoch} from '../encounter-formation-source-epoch.mjs';
export {preEncounterFormationEpoch};
// Current public consumers authenticate all 51 changed raw owners on every call.
export const sourceEpoch=extendComponentUiEpoch(extendEncounterFormationEpoch(preEncounterFormationEpoch));
