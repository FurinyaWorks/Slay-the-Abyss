// Preserve the complete Encounter formation predecessor as an importable epoch.
export * from './pre-ending-terminal-source-epoch.mjs';
import {sourceEpoch as preEndingTerminalEpoch} from './pre-ending-terminal-source-epoch.mjs';
import {extendEndingTerminalEpoch} from '../ending-terminal-source-epoch.mjs';
export {preEndingTerminalEpoch};
// Current public consumers authenticate all 52 changed raw owners on every call.
export const sourceEpoch=extendEndingTerminalEpoch(preEndingTerminalEpoch);
