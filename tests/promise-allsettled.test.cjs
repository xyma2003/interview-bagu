'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

// This teaching wrapper supports ordinary dense arrays, not the full native API.
// Load both published answers, including the actual myAll dependency, into a VM.
const NativePromise = Promise;
const originalHostAll = NativePromise.all;
const originalHostAllSettled = NativePromise.allSettled;
const markdown = fs.readFileSync(`${__dirname}/../frontend/frontend_bigco.md`, 'utf8');
const headings = [...markdown.matchAll(/^### Q37:.*$/gm)];
assert.equal(headings.length, 1, 'Q37 must have exactly one heading');
const question = markdown.slice(headings[0].index + headings[0][0].length)
  .split(/^### Q\d+:.*$/m)[0];
const blocks = [...question.matchAll(/```javascript\s*\n([\s\S]*?)```/g)]
  .map(match => match[1]);

function answerFor(name) {
  const assignment = new RegExp(`^Promise\\.${name}\\s*=\\s*function\\b`, 'm');
  const candidates = blocks.filter(block => assignment.test(block));
  assert.equal(candidates.length, 1, `Q37 must contain exactly one ${name} answer block`);
  const assignments = [...candidates[0].matchAll(new RegExp(assignment.source, 'gm'))];
  assert.equal(assignments.length, 1, `${name} must be assigned exactly once in its block`);
  return candidates[0];
}

const context = vm.createContext({});
const RealmPromise = vm.runInContext('Promise', context);
const originalRealmAll = RealmPromise.all;
const originalRealmAllSettled = RealmPromise.allSettled;
const nativeAllSettled = originalRealmAllSettled.bind(RealmPromise);
vm.runInContext(answerFor('myAll'), context, { timeout: 1000 });
vm.runInContext(answerFor('myAllSettled'), context, { timeout: 1000 });
const myAllSettled = RealmPromise.myAllSettled;
assert.equal(typeof RealmPromise.myAll, 'function');
assert.equal(typeof myAllSettled, 'function');

function invoke(input) {
  assert.ok(Array.isArray(input), 'test inputs must be ordinary dense arrays');
  assert.equal(Object.getPrototypeOf(input), Array.prototype);
  for (let index = 0; index < input.length; index++) {
    assert.ok(Object.hasOwn(input, index), 'test inputs must not contain holes');
  }
  let result;
  assert.doesNotThrow(() => { result = myAllSettled(input); });
  assert.ok(result instanceof RealmPromise, 'the wrapper must return its realm Promise');
  return result;
}

async function settlement(promise) {
  let deadline;
  try {
    return await NativePromise.race([
      NativePromise.resolve(promise).then(
        value => ({ status: 'fulfilled', value }),
        reason => ({ status: 'rejected', reason }),
      ),
      new NativePromise((_, reject) => {
        deadline = setTimeout(() => reject(new Error('Promise did not settle within 1500 ms')), 1500);
      }),
    ]);
  } finally {
    clearTimeout(deadline);
  }
}

function compareRecords(actual, expected) {
  assert.ok(Array.isArray(actual), 'the result must be an array');
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < expected.length; index++) {
    assert.ok(Object.hasOwn(actual, index), `result index ${index} must be present`);
    const observed = actual[index];
    const reference = expected[index];
    assert.ok(observed !== null && typeof observed === 'object', 'each result must be a record');
    assert.equal(observed.status, reference.status);
    assert.ok(['fulfilled', 'rejected'].includes(reference.status));
    const payload = reference.status === 'fulfilled' ? 'value' : 'reason';
    // Keys stay present for undefined payloads, and the opposite payload is absent.
    assert.deepEqual(Reflect.ownKeys(observed).sort(), ['status', payload].sort());
    assert.equal(observed[payload], reference[payload], 'preserve the value/reason identity');
    for (const key of ['status', payload]) {
      const descriptor = Object.getOwnPropertyDescriptor(observed, key);
      assert.equal(descriptor.enumerable, true);
      assert.equal(descriptor.writable, true);
      assert.equal(descriptor.configurable, true);
      assert.ok(Object.hasOwn(descriptor, 'value'), 'result fields must be own data properties');
    }
  }
}

async function matchesNative(makeInput, mutate) {
  // Do not reuse stateful promises/thenables between implementations.
  // Shared payload objects are intentional so identity can be compared directly.
  const actualInput = makeInput();
  const actual = settlement(invoke(actualInput));
  if (mutate) mutate(actualInput);
  const expectedInput = makeInput();
  const expected = settlement(nativeAllSettled(expectedInput));
  if (mutate) mutate(expectedInput);
  const [observed, reference] = await NativePromise.all([actual, expected]);
  assert.equal(reference.status, 'fulfilled');
  assert.equal(observed.status, 'fulfilled', 'individual failures must become result records');
  compareRecords(observed.value, reference.value);
  return observed.value;
}

function deferred() {
  let resolve;
  let reject;
  const promise = new NativePromise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const turn = () => new NativePromise(resolve => setImmediate(resolve));

test('loading only all and allSettled leaves both native oracles unchanged', () => {
  assert.equal(globalThis.Promise, NativePromise);
  assert.equal(NativePromise.all, originalHostAll);
  assert.equal(NativePromise.allSettled, originalHostAllSettled);
  assert.equal(Object.hasOwn(NativePromise, 'myAll'), false);
  assert.equal(Object.hasOwn(NativePromise, 'myAllSettled'), false);
  assert.equal(RealmPromise.all, originalRealmAll);
  assert.equal(RealmPromise.allSettled, originalRealmAllSettled);
  assert.equal(Object.hasOwn(RealmPromise, 'myAny'), false);
  assert.equal(Object.hasOwn(RealmPromise, 'myRace'), false);
});

const valueObject = { message: 'fulfilled payload' };
const reasonObject = { message: 'rejected payload' };
const reasonError = new Error('rejected error identity');
const valueSymbol = Symbol('fulfilled symbol');
const valueFunction = () => 'ordinary function value';

for (const [name, makeInput] of [
  ['empty dense array', () => []],
  ['plain values including undefined, NaN and negative zero', () => [
    undefined, null, false, 0, -0, NaN, 1n, 'plain', valueSymbol, valueObject, valueFunction,
  ]],
  ['all fulfilled promises', () => [
    NativePromise.resolve(valueObject), NativePromise.resolve(undefined), RealmPromise.resolve('realm value'),
  ]],
  ['all rejected promises', () => [
    NativePromise.reject(reasonObject), NativePromise.reject(reasonError), RealmPromise.reject(undefined),
  ]],
  ['mixed fulfillment, rejection and plain values', () => [
    NativePromise.reject(reasonObject), valueObject, RealmPromise.resolve(undefined), NativePromise.reject('failure'),
  ]],
]) {
  test(`${name} matches native status records`, { timeout: 5000 }, async () => {
    await matchesNative(makeInput);
  });
}

test('fulfilled and rejected undefined retain different own payload fields', { timeout: 5000 }, async () => {
  const result = await matchesNative(() => [NativePromise.resolve(undefined), NativePromise.reject(undefined)]);
  assert.deepEqual(Object.keys(result[0]).sort(), ['status', 'value']);
  assert.deepEqual(Object.keys(result[1]).sort(), ['reason', 'status']);
});

for (const [name, makeThenable, status, payload] of [
  ['fulfilling thenable', () => ({ then(resolve) { resolve(valueObject); } }), 'fulfilled', valueObject],
  ['rejecting thenable', () => ({ then(_, reject) { reject(reasonObject); } }), 'rejected', reasonObject],
  ['then getter throws', () => ({ get then() { throw reasonObject; } }), 'rejected', reasonObject],
  ['then callback throws before settlement', () => ({ then() { throw reasonError; } }), 'rejected', reasonError],
  ['then callback resolves on a later event-loop turn', () => ({
    then(resolve) { setImmediate(() => resolve(valueObject)); },
  }), 'fulfilled', valueObject],
  ['then callback rejects on a later event-loop turn', () => ({
    then(_, reject) { setImmediate(() => reject(reasonObject)); },
  }), 'rejected', reasonObject],
  ['repeated resolution, late rejection and late throw', () => ({
    then(resolve, reject) {
      resolve(valueObject);
      resolve('duplicate value');
      reject(reasonObject);
      throw reasonError;
    },
  }), 'fulfilled', valueObject],
  ['repeated rejection, late resolution and late throw', () => ({
    then(resolve, reject) {
      reject(reasonObject);
      reject('duplicate reason');
      resolve(valueObject);
      throw reasonError;
    },
  }), 'rejected', reasonObject],
]) {
  test(`${name} is captured without rejecting the aggregate`, { timeout: 5000 }, async () => {
    const result = await matchesNative(() => [makeThenable(), 'sibling']);
    assert.equal(result[0].status, status);
    assert.equal(result[0][status === 'fulfilled' ? 'value' : 'reason'], payload);
    assert.equal(result[1].value, 'sibling');
  });
}

test('a non-callable then property remains an ordinary object value', { timeout: 5000 }, async () => {
  const ordinary = { then: 42 };
  const result = await matchesNative(() => [ordinary]);
  assert.equal(result[0].value, ordinary);
});

test('reverse completion still produces records in input order', { timeout: 5000 }, async () => {
  const completionTraces = [];
  const result = await matchesNative(() => {
    const tasks = [deferred(), deferred(), deferred()];
    const trace = [];
    completionTraces.push(trace);
    setImmediate(() => {
      tasks[2].resolve('third');
      trace.push(2);
      tasks[1].reject(reasonObject);
      trace.push(1);
      tasks[0].resolve(valueObject);
      trace.push(0);
    });
    return tasks.map(task => task.promise);
  });
  assert.deepEqual(completionTraces, [[2, 1, 0], [2, 1, 0]]);
  compareRecords(result, [
    { status: 'fulfilled', value: valueObject },
    { status: 'rejected', reason: reasonObject },
    { status: 'fulfilled', value: 'third' },
  ]);
});

for (const [name, finish, expectedRecord] of [
  ['fulfills', task => task.resolve(valueObject), { status: 'fulfilled', value: valueObject }],
  ['rejects', task => task.reject(reasonObject), { status: 'rejected', reason: reasonObject }],
]) {
  test(`settled siblings cannot finish the aggregate before the last input ${name}`, { timeout: 5000 }, async () => {
    for (const aggregate of [invoke, nativeAllSettled]) {
      const last = deferred();
      let status = 'pending';
      const observed = aggregate([
        NativePromise.resolve('ready'),
        { then(resolve, reject) { reject('first failure'); reject('duplicate'); resolve('ignored'); } },
        last.promise,
      ]).then(
        value => { status = 'fulfilled'; return value; },
        reason => { status = 'rejected'; throw reason; },
      );
      const completion = settlement(observed);
      await turn();
      await turn();
      const beforeRelease = status;
      // Always release the controlled task, even if the pending assertion fails.
      finish(last);
      const result = await completion;
      assert.equal(beforeRelease, 'pending');
      assert.equal(status, 'fulfilled');
      assert.equal(result.status, 'fulfilled');
      compareRecords(result.value, [
        { status: 'fulfilled', value: 'ready' },
        { status: 'rejected', reason: 'first failure' },
        expectedRecord,
      ]);
    }
  });
}

for (const [name, makeInput] of [
  ['empty input', () => []],
  ['plain values', () => ['ready']],
  ['already fulfilled promises', () => [NativePromise.resolve('ready')]],
  ['already rejected promises', () => [NativePromise.reject(reasonObject)]],
]) {
  test(`${name} invokes aggregate callbacks asynchronously`, { timeout: 5000 }, async () => {
    for (const aggregate of [invoke, nativeAllSettled]) {
      const events = [];
      const completion = settlement(aggregate(makeInput()).then(() => events.push('fulfilled')));
      events.push('returned');
      assert.deepEqual(events, ['returned']);
      const result = await completion;
      assert.equal(result.status, 'fulfilled');
      assert.deepEqual(events, ['returned', 'fulfilled']);
    }
    // This checks asynchronous delivery, not an exact number of microtask turns.
  });
}

for (const [name, mutate] of [
  ['cleared', input => { input.length = 0; }],
  ['replaced', input => { input.splice(0, input.length, 'replacement'); }],
  ['appended', input => { input.push('appended'); }],
]) {
  test(`an array ${name} after the call does not change the collected tasks`, { timeout: 5000 }, async () => {
    const result = await matchesNative(() => {
      const first = deferred();
      const second = deferred();
      setImmediate(() => {
        second.reject(reasonObject);
        first.resolve(valueObject);
      });
      return [first.promise, second.promise];
    }, mutate);
    compareRecords(result, [
      { status: 'fulfilled', value: valueObject },
      { status: 'rejected', reason: reasonObject },
    ]);
  });
}
