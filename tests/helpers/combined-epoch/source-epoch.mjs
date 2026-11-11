// Preserve the full current UI and M7 chain before Golden Idol integration.
export * from './pre-golden-idol-source-epoch.mjs';
import {sourceEpoch as preGoldenIdolEpoch} from './pre-golden-idol-source-epoch.mjs';
import {extendGoldenIdolEpoch} from '../golden-idol-source-epoch.mjs';
export {preGoldenIdolEpoch};
export const sourceEpoch=extendGoldenIdolEpoch(preGoldenIdolEpoch);
