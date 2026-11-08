import {readFileSync, realpathSync} from 'node:fs';
import {resolve, relative, isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const within = (root, path) => {
  const result = realpathSync.native(resolve(root, path)), rel = relative(realpathSync.native(root), result);
  if (rel.startsWith('..') || isAbsolute(rel)) throw Error('Component input escapes its kit');
  return result;
};

// The encoder's wire codec is injected. No machine path, private asset, or tool
// installation is embedded in this adapter. Unknown fields retain their bytes.
export function createComponentImporter({kitRoot, wire, legacy56Classifier}) {
  const {fields, one, field, varint, container, wrap, replace} = wire;
  const number = (bytes, id) => {
    const matches = fields(bytes).filter(f => f.id === id && f.wire === 0);
    if (matches.length > 1) throw Error('Duplicate scalar field ' + id);
    if (!matches.length) return null;
    const value = Number(matches[0].value);
    if (!Number.isSafeInteger(value)) throw Error('Unsafe component ID');
    return value;
  };
  function packedIds(bytes) {
    const result = []; let position = 0;
    while (position < bytes.length) {
      let value = 0n, shift = 0n, ended = false;
      for (let i = 0; i < 10; i++) {
        if (position >= bytes.length) throw Error('Truncated packed ID');
        const byte = bytes[position++]; value |= BigInt(byte & 127) << shift;
        if (!(byte & 128)) { ended = true; break; }
        shift += 7n;
      }
      if (!ended || value > BigInt(Number.MAX_SAFE_INTEGER)) throw Error('Unsafe packed ID');
      result.push(Number(value));
    }
    return result;
  }
  function metadata(ui) {
    const parts = fields(ui), blocks = id => parts.filter(f => f.id === id && f.wire === 2).map(f => f.data);
    const content = blocks(505).map(b => number(b, 502));
    const head = blocks(502), nameBlock = blocks(505).find(b => number(b, 502) === 15);
    const children = parts.filter(f => f.id === 503 && f.wire === 2);
    if (children.length > 1) throw Error('Duplicate child list');
    const slotBlock = head.find(b => number(b, 502) === 6);
    const names = nameBlock ? fields(one(nameBlock, 12)).filter(f => f.id === 501 && f.wire === 2) : [];
    if (names.length > 1) throw Error('Duplicate component name');
    return {id:number(ui, 501), parent:number(ui, 504), content,
      structure:head.map(b => number(b, 502)),
      name:names[0]?.data.toString('utf8') ?? '',
      children:children.length ? packedIds(children[0].data) : [],
      slot:slotBlock ? number(one(slotBlock, 12), 501) : null};
  }
  function loadOriginalComponent(sampleId, selector) {
    const catalog = JSON.parse(readFileSync(within(kitRoot, 'CATALOG.json'), 'utf8'));
    const samples = catalog.samples.filter(s => s.id === sampleId);
    if (samples.length !== 1) throw Error('Unknown or duplicate component sample');
    const sample = samples[0], sourcePath = within(kitRoot, sample.rawPath), raw = readFileSync(sourcePath);
    if (digest(raw) !== sample.sha256) throw Error('Component source hash mismatch');
    container(raw);
    const index = JSON.parse(readFileSync(within(kitRoot, sample.indexPath), 'utf8'));
    const selected = index.entries.filter(e => e.file === selector || e.path === selector);
    if (selected.length !== 1) throw Error('Ambiguous component selector');
    const records = new Map(), skipped = [];
    for (const entry of index.entries) {
      if (![15, 61, 70].includes(entry.recordType)) { skipped.push({path:entry.path, recordType:entry.recordType}); continue; }
      if (!Number.isSafeInteger(entry.offset) || !Number.isSafeInteger(entry.bytes) || entry.offset < 0 || entry.bytes < 1 || entry.offset + entry.bytes > raw.length) throw Error('Invalid original record range');
      const envelope = raw.subarray(entry.offset, entry.offset + entry.bytes);
      const body = fields(envelope).filter(f => f.id === 19 && f.wire === 2);
      if (!body.length) continue;
      if (body.length !== 1) throw Error('Duplicate original UI body');
      const ui = one(body[0].data, 1), info = metadata(ui);
      if (!info.id || records.has(info.id)) throw Error('Duplicate or missing original control ID');
      records.set(info.id, {entry, envelope, ui, ...info, uiSha256:digest(ui)});
    }
    const root = [...records.values()].find(r => r.entry === selected[0]);
    if (!root) throw Error('Selected component is not UI');
    const deps = fields(root.envelope).filter(f => f.id === 2 && f.wire === 2).map(f => number(f.data, 4));
    const ids = [root.id, ...deps], closure = new Set(ids);
    if (closure.size !== ids.length) throw Error('Duplicate original dependency');
    const owned = ids.map(id => { if (!records.has(id)) throw Error('Missing original UI dependency ' + id); return records.get(id); });
    for (const record of owned) {
      for (const id of record.children) if (!closure.has(id)) throw Error('Child outside original dependency closure');
      if (record !== root && !closure.has(record.parent)) throw Error('Parent outside original dependency closure');
    }
    return {sampleId, selector, sourcePath, sourceSha256:sample.sha256, rootId:root.id, recordType:root.entry.recordType, records:owned, skipped};
  }
  function appendOriginalClientTemplate(baseBytes, component) {
    if (component.recordType !== 70) throw Error('Regular UI requires an explicit conversion; expected client70');
    const payload = container(baseBytes), section = one(payload, 9);
    const existing = fields(section).filter(f => f.id === 502 && f.wire === 2).map(f => metadata(f.data));
    const used = new Set(existing.map(r => r.id)), root = component.records[0];
    if (!root || root.id !== component.rootId || !root.structure.includes(4) || !root.content.includes(86)) throw Error('Original root is not a native client template');
    if (existing.some(r => r.structure.includes(4) && r.content.includes(86) && r.name === root.name)) throw Error('Ambiguous original template name: ' + root.name);
    if (new Set(component.records.map(r => r.id)).size !== component.records.length) throw Error('Duplicate import ID');
    for (const record of component.records) {
      if (used.has(record.id)) throw Error('Component ID collision requires typed remapping: ' + record.id);
      if (digest(record.ui) !== record.uiSha256) throw Error('Component changed after source validation');
    }
    let nextSlot = Math.max(0, ...existing.map(r => r.slot ?? 0)); const slots = [];
    const patched = component.records.map(record => {
      if (record.slot === null) throw Error('Original template control has no structural slot');
      const slot = ++nextSlot;
      const relocate = (bytes, value) => Buffer.concat(fields(bytes).map(f => f.id === 502 && f.wire === 2 && number(f.data, 502) === 6
        ? field(502, 2, replace(f.data, 12, 2, replace(one(f.data, 12), 501, 0, value))) : f.raw));
      const bytes = relocate(record.ui, slot);
      if (!relocate(bytes, record.slot).equals(record.ui)) throw Error('Slot relocation changed original data');
      slots.push({id:record.id, original:record.slot, mapped:slot}); return bytes;
    });
    let rootLists = 0;
    const updated = Buffer.concat(fields(section).map(f => {
      if (f.id !== 501 || f.wire !== 2) return f.raw;
      rootLists++; return field(501, 2, Buffer.concat([f.data, varint(root.id)]));
    }));
    if (rootLists !== 1) throw Error('Expected one native template root list');
    const added = Buffer.concat([updated, ...patched.map(bytes => field(502, 2, bytes))]);
    const bytes = wrap(baseBytes, Buffer.concat(fields(payload).map(f => f.id === 9 ? field(9, 2, added) : f.raw)));
    const readback = fields(one(container(bytes), 9)).filter(f => f.id === 502 && f.wire === 2);
    for (const [i, record] of component.records.entries()) {
      const match = readback.filter(f => number(f.data, 501) === record.id);
      if (match.length !== 1 || !match[0].data.equals(patched[i])) throw Error('Original component readback differs');
    }
    return {bytes, templateIndex:root.id, name:root.name, controls:component.records.length, slots,
      receipt:{sourceSha256:component.sourceSha256, selector:component.selector, outputSha256:digest(bytes),
        preservation:'Original UI bytes retained; inverse structural-slot relocation is byte exact.',
        officialImport:'unverified', devicePerformance:'unverified'}};
  }
  function relocateComponent(component, {idStart}) {
    if (!Number.isSafeInteger(idStart) || idStart < 1 || idStart + component.records.length > 0x7fffffff) throw Error('Invalid component ID range');
    if (component.recordType !== 70) throw Error('Typed relocation requires native client70');
    const mapping = new Map(component.records.map((r, i) => [r.id, idStart + i]));
    const inverse = new Map([...mapping].map(([a, b]) => [b, a]));
    const known = new Set([12, 15, 82, 83, 84, 85, 86, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99]);
    function mapped(id, map) {
      if (id === 0 || id === 0n || id === 0xffffffffffffffffn) return id;
      const next = map.get(Number(id));
      if (!next) throw Error('UI reference outside imported component: ' + String(id));
      return next;
    }
    function idsIn(bytes, wanted, map) {
      return Buffer.concat(fields(bytes).map(f => f.wire === 0 && wanted.includes(f.id)
        ? field(f.id, 0, mapped(f.value, map)) : f.raw));
    }
    function block(bytes, map, structural = false, nested = false, ownerId) {
      const type = number(bytes, 502);
      const extension = !structural && type === 56 && typeof legacy56Classifier === 'function';
      if (extension && !nested) legacy56Classifier(bytes, ownerId);
      if (!(structural ? [4, 5, 6].includes(type) : known.has(type) || extension)) throw Error('Unclassified component cannot be relocated: ' + type);
      return Buffer.concat(fields(bytes).map(f => {
        if (f.id === 504 && f.wire === 2) {
          if (number(f.data, 3) !== 8) throw Error('Unclassified component owner');
          return field(504, 2, idsIn(f.data, [4], map));
        }
        if (!structural && f.id === 503 && f.wire === 2) return field(503, 2, block(f.data, map, false, true, ownerId));
        if (structural && type === 5 && f.id === 11 && f.wire === 2) return field(11, 2, idsIn(f.data, [501], map));
        const references = {82:[73, [501]], 89:[77, [501]], 90:[78, [501, 502, 503, 504]],
          92:[80, [506]], 93:[81, [501, 502, 503, 504]]}[type];
        if (nested && references && f.id === references[0] && f.wire === 2) return field(f.id, 2, idsIn(f.data, references[1], map));
        if (nested && type === 83 && f.id === 74 && f.wire === 2 && fields(f.data).some(x => x.id === 502 && x.wire === 2)) throw Error('Mounted scripts require their own typed dependency relocation');
        return f.raw;
      }));
    }
    function rewrite(ui, map) {
      return Buffer.concat(fields(ui).map(f => {
        if (f.wire === 0 && [501, 504].includes(f.id)) return field(f.id, 0, mapped(f.value, map));
        if (f.id === 503 && f.wire === 2) return field(503, 2, Buffer.concat(packedIds(f.data).map(id => varint(mapped(id, map)))));
        if (f.id === 502 && f.wire === 2) return field(502, 2, block(f.data, map, true, false, number(ui, 501)));
        if (f.id === 505 && f.wire === 2) return field(505, 2, block(f.data, map, false, false, number(ui, 501)));
        return f.raw;
      }));
    }
    const records = component.records.map(record => {
      if (digest(record.ui) !== record.uiSha256) throw Error('Component changed after source validation');
      const ui = rewrite(record.ui, mapping);
      if (!rewrite(ui, inverse).equals(record.ui)) throw Error('Typed relocation changed unrelated source bytes');
      return {...record, ...metadata(ui), ui, sourceUiSha256:record.uiSha256, uiSha256:digest(ui)};
    });
    return {...component, rootId:mapping.get(component.rootId), records,
      relocation:{ids:Object.fromEntries(mapping), inverseByteExact:true}};
  }
  return {loadOriginalComponent, appendOriginalClientTemplate, relocateComponent, metadata, packedIds};
}
