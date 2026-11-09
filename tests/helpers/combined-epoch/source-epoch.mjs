// Preserve the complete Encounter formation predecessor as an independently importable epoch.
export * from './pre-emerald-source-epoch.mjs';
import {sourceEpoch as preEmeraldNodeEpoch} from './pre-emerald-source-epoch.mjs';
import {extendEmeraldNodeEpoch} from '../emerald-node-source-epoch.mjs';
export {preEmeraldNodeEpoch};
// Current public consumers authenticate all 52 changed raw owners on every call.
export const sourceEpoch=extendEmeraldNodeEpoch(preEmeraldNodeEpoch);
