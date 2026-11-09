// Preserve the complete Encounter formation predecessor as an importable epoch.
export * from './pre-golden-idol-source-epoch.mjs';
import {sourceEpoch as preGoldenIdolEpoch} from './pre-golden-idol-source-epoch.mjs';
import {extendGoldenIdolEpoch} from '../golden-idol-source-epoch.mjs';
export {preGoldenIdolEpoch};
// Current public consumers authenticate all 52 changed raw owners on every call.
export const sourceEpoch=extendGoldenIdolEpoch(preGoldenIdolEpoch);
