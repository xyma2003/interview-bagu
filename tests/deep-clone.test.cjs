'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const NativeArray = Array;
const NativeWeakMap = WeakMap;
const NativeStructuredClone = structuredClone;
const originalObjectKeys = Object.keys;
const originalGetOwnPropertySymbols = Object.getOwnPropertySymbols;
const markdown = fs.readFileSync(`${__dirname}/../frontend/frontend_bigco.md`, 'utf8');
const headings = [...markdown.matchAll(/^### Q42:.*$/gm)];
assert.equal(headings.length, 1, 'Q42 must have exactly one heading');
const question = markdown.slice(headings[0].index + headings[0][0].length)
  .split(/^### Q\d+:.*$/m)[0];
const blocks = [...question.matchAll(/```javascript\s*\n([\s\S]*?)```/g)]
  .map(match => match[1]);
const declaration = /^function deepClone\s*\(/gm;
const definitions = blocks.filter(block => [...block.matchAll(declaration)].length > 0);
assert.equal(definitions.length, 1, 'Q42 must have exactly one deepClone definition block');
assert.equal([...definitions[0].matchAll(declaration)].length, 1, 'deepClone must be defined once');

const context = vm.createContext({});
const RealmArray = vm.runInContext('Array', context);
const RealmWeakMap = vm.runInContext('WeakMap', context);
vm.runInContext(definitions[0], context, { timeout: 1000, filename: 'frontend_bigco.md#q42' });
const deepClone = context.deepClone;
assert.equal(typeof deepClone, 'function');

function assertPrimitiveArrayMatchesNative(source) {
  const expected = NativeStructuredClone(source);
  const beforeKeys = Reflect.ownKeys(source);
  const actual = deepClone(source);
  assert.notEqual(actual, source);
  assert.ok(Array.isArray(actual));
  assert.equal(Object.getPrototypeOf(actual), RealmArray.prototype);
  assert.equal(actual.length, expected.length, 'preserve length even if trailing indexes are absent');
  assert.deepEqual(Reflect.ownKeys(actual), Reflect.ownKeys(expected));
  for (let index = 0; index < source.length; index++) {
    assert.equal(Object.hasOwn(actual, index), Object.hasOwn(expected, index), `index ${index} hole shape`);
    if (Object.hasOwn(expected, index)) assert.ok(Object.is(actual[index], expected[index]));
  }
  assert.deepEqual(Reflect.ownKeys(source), beforeKeys, 'do not fill or remove source holes');
  assert.equal(source.length, expected.length, 'do not change source length');
  return actual;
}

test('loading Q42 leaves host constructors and the native oracle unchanged', () => {
  assert.equal(globalThis.Array, NativeArray);
  assert.equal(globalThis.WeakMap, NativeWeakMap);
  assert.equal(globalThis.structuredClone, NativeStructuredClone);
  assert.equal(Object.keys, originalObjectKeys);
  assert.equal(Object.getOwnPropertySymbols, originalGetOwnPropertySymbols);
  assert.equal(vm.runInContext('Array', context), RealmArray);
  assert.equal(vm.runInContext('WeakMap', context), RealmWeakMap);
});

for (const length of [0, 1, 4, 32]) {
  test(`an all-hole array of length ${length} preserves its length and missing indexes`, () => {
    const actual = assertPrimitiveArrayMatchesNative(new Array(length));
    assert.deepEqual(Object.keys(actual), []);
    assert.equal(actual.length, length);
  });
}

for (const [name, makeInput] of [
  ['leading holes', () => { const a = new Array(5); a[3] = 'late'; a[4] = undefined; return a; }],
  ['interior holes', () => { const a = ['first']; a[3] = 'last'; return a; }],
  ['trailing holes', () => { const a = new Array(7); a[1] = 'only'; return a; }],
]) {
  test(`${name} match native array length and own indexes`, () => {
    assertPrimitiveArrayMatchesNative(makeInput());
  });
}

test('dense undefined and a missing slot remain different', () => {
  const dense = assertPrimitiveArrayMatchesNative([undefined, null, -0, NaN, false, 'text']);
  assert.equal(Object.hasOwn(dense, 0), true);
  const sparse = new Array(6);
  sparse[1] = undefined;
  sparse[3] = 'value';
  const cloned = assertPrimitiveArrayMatchesNative(sparse);
  assert.equal(Object.hasOwn(cloned, 0), false);
  assert.equal(Object.hasOwn(cloned, 1), true);
  assert.equal(cloned[0], cloned[1]); // Same read value, different presence.
  assert.equal(Object.hasOwn(cloned, 5), false);
});

test('nested objects and arrays are independent while retaining nested holes', () => {
  const child = new Array(5);
  child[1] = { count: 1 };
  const source = new Array(4);
  source[0] = { name: 'source', child };
  source[2] = ['original'];
  const clone = deepClone(source);
  assert.equal(clone.length, 4);
  assert.equal(clone[0].child.length, 5);
  assert.equal(Object.hasOwn(clone[0].child, 4), false);
  assert.notEqual(clone[0], source[0]);
  assert.notEqual(clone[0].child, child);
  assert.notEqual(clone[0].child[1], child[1]);
  assert.notEqual(clone[2], source[2]);
  clone[0].child[1].count = 9;
  clone[2].push('new');
  assert.equal(child[1].count, 1);
  assert.deepEqual(source[2], ['original']);
  source[0].name = 'source changed';
  assert.equal(clone[0].name, 'source');
});

test('an array can refer to itself without filling its remaining holes', () => {
  const source = new Array(5);
  source[1] = source;
  const clone = deepClone(source);
  assert.notEqual(clone, source);
  assert.equal(clone.length, 5);
  assert.equal(clone[1], clone);
  assert.deepEqual(Object.keys(clone), ['1']);
  assert.equal(source[1], source);
});

test('ordinary object cycles through an array point back to the cloned root', () => {
  const source = { name: 'root', items: new Array(4) };
  source.items[1] = { parent: source };
  source.self = source;
  const clone = deepClone(source);
  assert.notEqual(clone, source);
  assert.equal(clone.self, clone);
  assert.equal(clone.items[1].parent, clone);
  assert.equal(clone.items.length, 4);
  assert.deepEqual(Object.keys(clone.items), ['1']);
  assert.equal(source.items[1].parent, source);
});

test('repeated ordinary object references share one new object in the clone', () => {
  const shared = { value: { count: 1 } };
  const source = [shared, { again: shared }, shared];
  const clone = deepClone(source);
  assert.notEqual(clone[0], shared);
  assert.equal(clone[0], clone[1].again);
  assert.equal(clone[0], clone[2]);
  assert.notEqual(clone[0].value, shared.value);
  clone[2].value.count = 7;
  assert.equal(clone[0].value.count, 7);
  assert.equal(shared.value.count, 1);
});

test('array string and symbol properties retain their graph relationships', () => {
  const symbol = Symbol('array metadata');
  const source = new Array(6);
  const shared = { tag: 'metadata' };
  source[1] = shared;
  source.description = shared;
  source[symbol] = { shared, owner: source };
  const clone = deepClone(source);
  assert.equal(clone.length, 6);
  assert.equal(Object.hasOwn(clone, 5), false);
  assert.equal(clone[1], clone.description);
  assert.equal(clone[symbol].shared, clone[1]);
  assert.equal(clone[symbol].owner, clone);
  assert.notEqual(clone[1], shared);
  assert.notEqual(clone[symbol], source[symbol]);
  assert.deepEqual(Object.getOwnPropertySymbols(clone), [symbol]);
});

test('property copying follows enumerable strings and all own symbols without descriptors', () => {
  const visibleSymbol = Symbol('visible');
  const hiddenSymbol = Symbol('hidden');
  const shared = { content: 'copy me' };
  const source = { visible: shared, [visibleSymbol]: shared };
  Object.defineProperty(source, 'hiddenString', { value: 'not enumerated', enumerable: false });
  Object.defineProperty(source, hiddenSymbol, { value: shared, enumerable: false });
  const clone = deepClone(source);
  assert.equal(Object.hasOwn(clone, 'hiddenString'), false);
  assert.notEqual(clone.visible, shared);
  assert.equal(clone[visibleSymbol], clone.visible);
  assert.equal(clone[hiddenSymbol], clone.visible);
  assert.deepEqual(Object.getOwnPropertySymbols(clone), [visibleSymbol, hiddenSymbol]);
  assert.equal(Object.getOwnPropertyDescriptor(source, hiddenSymbol).enumerable, false);
  assert.equal(Object.getOwnPropertyDescriptor(clone, hiddenSymbol).enumerable, true);
});

test('primitive values are returned unchanged', () => {
  for (const value of [undefined, null, true, false, 0, -0, NaN, 1n, 'text', Symbol('value')]) {
    assert.ok(Object.is(deepClone(value), value));
  }
});

test('functions retain their original identity and closure', () => {
  let calls = 0;
  const fn = () => ++calls;
  const clone = deepClone({ fn });
  assert.equal(clone.fn, fn);
  assert.equal(clone.fn(), 1);
  assert.equal(calls, 1, 'the closure was not copied or made side-effect free');
});
