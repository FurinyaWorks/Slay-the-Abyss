import { readFileSync } from 'node:fs';import { createHash } from 'node:crypto';
export function replayInputs(driver) {
 const files=['cards.json','relic.json','engine.mjs','deck.mjs','battle.mjs','accessibility.mjs','replay-inputs.mjs',driver];
 return {candidate:JSON.parse(readFileSync(new URL('./cards.json',import.meta.url))).version,sha256:Object.fromEntries([...new Set(files)].map(file=>[file,createHash('sha256').update(readFileSync(new URL(file,import.meta.url))).digest('hex')]))};
}
