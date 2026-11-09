import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

// Promote an existing native client image leaf, without redrawing or changing
// its material. Callers explicitly select private originals through importer.
export function createContentComponentAdapter({importer, wire}) {
  const {fields, one, field, replace} = wire ?? {};
  const metadata = importer?.metadata ?? importer?.uiMetadata;
  assert(typeof importer?.loadOriginalComponent === 'function' && typeof metadata === 'function' && fields && one && field && replace, 'Content adapter dependencies required');
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  const number = (bytes, id) => {
    const found = fields(bytes).filter(f => f.id === id);
    assert(found.length <= 1, 'Duplicate source scalar');
    if (!found.length) return null;
    assert.equal(found[0].wire, 0);const value = Number(found[0].value);
    assert(Number.isSafeInteger(value), 'Unsafe source scalar');return value;
  };
  const kind = f => number(f.data, 502);
  const nameField = f => f.id === 505 && f.wire === 2 && kind(f) === 15;
  const templateFlag = f => f.id === 502 && f.wire === 2 && kind(f) === 4;
  function restorePromotedLeaf(ui, prepared) {
    const original = prepared.originalLeaf, old = fields(original.ui), current = fields(ui);
    const markers = current.filter(templateFlag);assert.equal(markers.length, 1);
    assert(markers[0].raw.equals(prepared.templateFlag), 'Source template marker changed');
    assert(!current.some(f => f.id === 504), 'Promoted image gained an external parent');
    const list = current.filter(f => !templateFlag(f));let index = 0;
    const restored = old.map(source => {
      if (source.id === 504) return source.raw;
      const actual = list[index++];assert(actual, 'Promoted leaf lost a field');
      if (nameField(source)) {
        assert(nameField(actual), 'Promoted leaf name component moved');
        const renamed = replace(actual.data, 12, 2, replace(one(actual.data, 12), 501, 2, one(one(source.data, 12), 501)));
        assert(renamed.equals(source.data), 'Name promotion changed unrelated properties');
        return field(505, 2, renamed);
      }
      assert(actual.raw.equals(source.raw), 'Promotion changed an original image/geometry field');return actual.raw;
    });
    assert.equal(index, list.length, 'Promoted leaf gained an unclassified field');
    return Buffer.concat(restored);
  }
  function prepareOriginalContentImage(sampleId, templateSelector, {leafId, leafSelector, name = 'OriginalContentImage'} = {}) {
    assert(typeof name === 'string' && /^[A-Za-z][A-Za-z0-9_]{0,79}$/.test(name), 'Explicit unique content-template name required');
    const source = importer.loadOriginalComponent(sampleId, templateSelector);
    assert.equal(source.recordType, 70, 'Content source must already be a native client70 template');
    const root = source.records.find(r => r.id === source.rootId);assert(root);
    const marker = fields(root.ui).filter(templateFlag);assert.equal(marker.length, 1, 'One native template marker required');
    assert.deepEqual(fields(marker[0].data).map(f => [f.id, f.wire]), [[14, 2], [501, 0], [502, 0]], 'Unclassified template-marker schema');
    assert.equal(one(marker[0].data, 14).length, 0, 'Template marker carries unknown references');
    assert.equal(number(marker[0].data, 501), 4);assert.equal(number(marker[0].data, 502), 4);
    const chosen = source.records.filter(r => leafId !== undefined ? r.id === leafId : leafSelector !== undefined ? r.entry.file === leafSelector : r !== root && r.children.length === 0 && r.content.includes(96) && r.content.includes(97));
    const leaf = leafId !== undefined || leafSelector !== undefined ? (assert.equal(chosen.length, 1, 'Ambiguous native content leaf'), chosen[0]) : chosen[0];
    assert(leaf, 'No native image leaf');assert.equal(leaf.entry.recordType, 15, 'Only an existing native client leaf can be promoted');
    assert.equal(leaf.children.length, 0, 'Content source image must be a leaf');
    assert(leaf.content.includes(86) && leaf.content.includes(96) && leaf.content.includes(97), 'Native client image/mask required');
    assert(leaf.structure.every(k => [5, 6].includes(k)), 'Leaf has unclassified structural references');
    assert.equal(digest(leaf.ui), leaf.uiSha256, 'Source leaf drift');
    const byId = new Map(source.records.map(r => [r.id, r]));assert.equal(byId.size, source.records.length, 'Duplicate source identity');
    const visited = new Set();let current = leaf;
    while (true) {
      assert(!visited.has(current.id), 'Cyclic original image parent chain');visited.add(current.id);
      assert.equal(digest(current.ui), current.uiSha256, 'Source ancestor drift');
      const actual = metadata(current.ui);assert.equal(actual.id, current.id);assert.equal(actual.parent, current.parent);
      if (current.id === source.rootId) { assert.equal(actual.parent, null, 'Source template has an external parent');break; }
      const parent = byId.get(actual.parent);assert(parent, 'Broken original image parent chain');
      assert.equal(metadata(parent.ui).children.filter(id => id === current.id).length, 1, 'Original parent must own image exactly once');
      current = parent;
    }
    const parts = fields(leaf.ui), names = parts.filter(nameField), parents = parts.filter(f => f.id === 504);
    assert.equal(names.length, 1);assert.equal(parents.length, 1);assert.equal(parents[0].wire, 0);
    const script = parts.filter(f => f.id === 505 && f.wire === 2 && kind(f) === 83);assert.equal(script.length, 1);
    const scriptPayload = one(one(script[0].data, 503), 74);
    assert(!fields(scriptPayload).some(f => f.id === 502 && f.wire === 2), 'Mounted scripts cannot be implicitly copied into a content leaf');
    let inserted = false;
    const ui = Buffer.concat(parts.flatMap(f => {
      if (f.id === 504) return [];
      if (nameField(f)) {
        assert(!inserted);inserted = true;
        return [marker[0].raw, field(505, 2, replace(f.data, 12, 2, replace(one(f.data, 12), 501, 2, Buffer.from(name, 'utf8'))))];
      }
      return [f.raw];
    }));
    assert(inserted);
    const info = metadata(ui);assert.equal(info.parent, null);assert.deepEqual(info.children, []);assert.equal(info.name, name);assert(info.structure.includes(4));
    const prepared = {originalLeaf: leaf, templateFlag: marker[0].raw};
    assert(restorePromotedLeaf(ui, prepared).equals(leaf.ui), 'Content promotion inverse differs from original');
    const row = {...leaf, ...info, entry: {...leaf.entry, recordType: 70}, ui, uiSha256: digest(ui), sourceUiSha256: leaf.uiSha256};
    const ledger = {operation:'NATIVE_CLIENT_IMAGE_LEAF_TO_IMAGE_TEMPLATE', sampleId, sourceSha256:source.sourceSha256,
      sourceTemplateSelector:templateSelector, sourceTemplateRoot:source.rootId, sourceLeafSelector:leaf.entry.file,
      sourceLeafId:leaf.id, sourceLeafUiSha256:leaf.uiSha256, templateMarkerSha256:digest(marker[0].raw),
      changes:[{field:'504/parent',from:leaf.parent,to:null},{field:'502/type4',from:'absent',to:'same-package native template marker'},
        {field:'505/type15/12/501',from:leaf.name,to:name}], retained:'All other original UI fields/material/geometry/script/navigation bytes unchanged.',
      inverseByteExact:true, sourceRecordType:15, targetRecordType:70,
      instanceUse:'Business instances may explicitly SetImage/imageColor and change anchor, pivot, size, position/rotation for data glyph/edge slots. This is content migration, not preservation of the original instance appearance. Original source and sealed frame templates stay unchanged.',
      officialImport:'unverified', devicePerformance:'unverified'};
    return {...prepared, ledger, component:{...source,rootId:leaf.id,recordType:70,sourceRecordType:15,records:[row],promotion:ledger}};
  }
  return {prepareOriginalContentImage, prepareContentImage:prepareOriginalContentImage, restorePromotedLeaf};
}
