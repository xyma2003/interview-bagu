'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

// Execute the published answer in its own realm and retain a native oracle.
const NativePromise = Promise;
const originalHostAny = NativePromise.any;
const markdown = fs.readFileSync(`${__dirname}/../frontend/frontend_bigco.md`, 'utf8');
const question = markdown.split(/^### Q37:.*$/m)[1]?.split(/^### Q\d+:.*$/m)[0];
assert.ok(question, 'Q37 must exist');
const answer = question.split('**Promise.any 实现**：')[1];
const snippet = answer?.match(/```javascript\s*\n([\s\S]*?)```/);
assert.ok(snippet, 'Q37 must contain its Promise.any answer');
const context = vm.createContext({});
const RealmPromise = vm.runInContext('Promise', context);
const RealmAggregateError = vm.runInContext('AggregateError', context);
const originalRealmAny = RealmPromise.any;
const nativeAny = originalRealmAny.bind(RealmPromise);
vm.runInContext(snippet[1], context, { timeout: 1000 });
const myAny = RealmPromise.myAny;
assert.equal(typeof myAny, 'function');

function invoke(input) {
  let result;
  assert.doesNotThrow(() => { result = myAny(input); }, 'errors must reject the returned Promise');
  assert.ok(result instanceof RealmPromise, 'myAny must return its native realm Promise');
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

function compare(actual, expected) {
  assert.equal(actual.status, expected.status);
  if (expected.status === 'fulfilled') {
    assert.equal(actual.value, expected.value);
  } else if (expected.reason instanceof RealmAggregateError) {
    assert.ok(actual.reason instanceof RealmAggregateError, 'all failures must produce AggregateError');
    assert.ok(Array.isArray(actual.reason.errors));
    assert.equal(actual.reason.errors.length, expected.reason.errors.length);
    for (let index = 0; index < expected.reason.errors.length; index++) {
      assert.ok(Object.hasOwn(actual.reason.errors, index), 'errors must be dense');
      assert.equal(actual.reason.errors[index], expected.reason.errors[index], 'preserve each rejection identity');
    }
    // AggregateError message wording is implementation-defined; do not compare it.
  } else {
    assert.equal(actual.reason, expected.reason, 'iteration errors must preserve their identity');
  }
}

async function matchesNative(makeInput, mutate) {
  // Fresh inputs matter for generators, mutable arrays and stateful thenables.
  // Observe each returned rejection immediately, before waiting on either side.
  const actualInput = makeInput();
  const actual = settlement(invoke(actualInput));
  if (mutate) mutate(actualInput);
  const expectedInput = makeInput();
  const expected = settlement(nativeAny(expectedInput));
  if (mutate) mutate(expectedInput);
  const [observed, reference] = await NativePromise.all([actual, expected]);
  compare(observed, reference);
  return observed;
}

test('loading only the any answer leaves native Promise methods unchanged', () => {
  assert.equal(globalThis.Promise, NativePromise);
  assert.equal(NativePromise.any, originalHostAny);
  assert.equal(Object.hasOwn(NativePromise, 'myAny'), false);
  assert.equal(RealmPromise.any, originalRealmAny);
  assert.equal(Object.hasOwn(RealmPromise, 'myAll'), false);
});

for (const [name, makeInput] of [
  ['empty array', () => []],
  ['empty Set', () => new Set()],
  ['empty generator', () => (function* () {})()],
]) {
  test(`${name} rejects with AggregateError and an empty errors array`, { timeout: 5000 }, async () => {
    const result = await matchesNative(makeInput);
    assert.equal(result.status, 'rejected');
    assert.equal(result.reason.errors.length, 0);
  });
}

for (const [name, makeInput] of [
  ['all-hole sparse array', () => new Array(3)],
  ['mixed sparse array', () => [, NativePromise.reject('failure'), 'success']],
  ['Set iterable', () => new Set([NativePromise.reject('failure'), 'success'])],
  ['string iterable', () => '😀AB'],
  ['generator iterable', () => (function* () { yield NativePromise.reject('failure'); yield 'success'; })()],
  ['ordinary values and promises', () => [NativePromise.reject('failure'), 0, NativePromise.resolve('later')]],
  ['fulfilling thenable', () => [{ then(resolve) { resolve('thenable'); } }]],
]) {
  test(name, { timeout: 5000 }, async () => {
    await matchesNative(makeInput);
  });
}

test('a sparse hole fulfills with undefined', { timeout: 5000 }, async () => {
  const result = await matchesNative(() => new Array(2));
  assert.deepEqual(result, { status: 'fulfilled', value: undefined });
});

test('the first fulfillment wins despite an earlier rejection and a pending sibling', { timeout: 5000 }, async () => {
  const winner = { message: 'winner' };
  const result = await matchesNative(() => {
    let resolveFirst;
    let resolveSecond;
    const first = new NativePromise(resolve => { resolveFirst = resolve; });
    const second = new NativePromise(resolve => { resolveSecond = resolve; });
    // Wait until cross-realm promise assimilation has attached both handlers.
    setImmediate(() => {
      resolveSecond(winner);
      resolveFirst('later fulfillment');
    });
    return [NativePromise.reject('earlier rejection'), new NativePromise(() => {}), first, second];
  });
  assert.equal(result.value, winner);
});

test('all rejections preserve input order and object identity despite reversed settlement', { timeout: 5000 }, async () => {
  const reasons = [{ message: 'first' }, { message: 'second' }, { message: 'third' }];
  const result = await matchesNative(() => {
    const rejectors = [];
    const promises = reasons.map(reason => new NativePromise((_, reject) => {
      rejectors.push(() => reject(reason));
    }));
    queueMicrotask(() => rejectors.reverse().forEach(reject => reject()));
    return promises;
  });
  assert.equal(result.status, 'rejected');
  reasons.forEach((reason, index) => assert.equal(result.reason.errors[index], reason));
});

test('rejections cannot settle any while one input remains pending', { timeout: 5000 }, async () => {
  for (const aggregate of [invoke, nativeAny]) {
    let resolvePending;
    const pendingInput = new RealmPromise(resolve => { resolvePending = resolve; });
    let status = 'pending';
    const observed = aggregate([RealmPromise.reject('first failure'), pendingInput]).then(
      value => { status = 'fulfilled'; return value; },
      reason => { status = 'rejected'; return reason; },
    );
    await new NativePromise(resolve => setImmediate(resolve));
    await new NativePromise(resolve => setImmediate(resolve));
    const statusBeforeRelease = status;
    // Release the controlled input even if the pending-state assertion fails.
    resolvePending('eventual success');
    const result = await settlement(observed);
    assert.equal(statusBeforeRelease, 'pending');
    assert.equal(status, 'fulfilled');
    assert.equal(result.value, 'eventual success');
  }
});

test('a Set of rejected inputs aggregates every reason', { timeout: 5000 }, async () => {
  const reasons = [{ message: 'first' }, { message: 'second' }];
  await matchesNative(() => new Set(reasons.map(reason => NativePromise.reject(reason))));
});

for (const [name, mutate] of [
  ['cleared', input => { input.length = 0; }],
  ['expanded with holes', input => { input.length = 8; }],
]) {
  test(`an input array ${name} after calling any does not change the rejection count`, { timeout: 5000 }, async () => {
    const reasons = [{ message: 'first' }, { message: 'second' }];
    const result = await matchesNative(() => reasons.map(reason => NativePromise.reject(reason)), mutate);
    assert.equal(result.reason.errors.length, 2);
  });
}

for (const [name, makeInput] of [
  ['null', () => null],
  ['undefined', () => undefined],
  ['number', () => 42],
  ['array-like object', () => ({ 0: 'value', length: 1 })],
]) {
  test(`non-iterable ${name} returns a rejected Promise`, { timeout: 5000 }, async () => {
    const [actual, expected] = await NativePromise.all([
      settlement(invoke(makeInput())),
      settlement(nativeAny(makeInput())),
    ]);
    assert.equal(actual.status, 'rejected');
    assert.equal(expected.status, 'rejected');
    assert.equal(actual.reason.name, 'TypeError');
    assert.equal(actual.reason.name, expected.reason.name);
  });
}

test('a failing iterator getter preserves the rejection reason', { timeout: 5000 }, async () => {
  const reason = { message: 'iterator getter failed' };
  const result = await matchesNative(() => ({ get [Symbol.iterator]() { throw reason; } }));
  assert.equal(result.reason, reason);
});

test('a synchronous iteration failure wins over an already fulfilled input', { timeout: 5000 }, async () => {
  const reason = { message: 'iterator failed' };
  const result = await matchesNative(() => (function* () {
    yield RealmPromise.resolve('success');
    throw reason;
  })());
  assert.equal(result.reason, reason);
});

test('iteration continues after a fulfilled input and handles later rejections', { timeout: 5000 }, async () => {
  const traces = [];
  const result = await matchesNative(() => {
    const trace = [];
    traces.push(trace);
    return (function* () {
      trace.push('first');
      yield 'success';
      trace.push('second');
      yield NativePromise.reject('later failure');
      trace.push('done');
    })();
  });
  assert.equal(result.value, 'success');
  assert.deepEqual(traces, [['first', 'second', 'done'], ['first', 'second', 'done']]);
});

test('throwing then getters are aggregated as rejections while iteration continues', { timeout: 5000 }, async () => {
  const reason = { message: 'then getter failed' };
  const second = { message: 'second failure' };
  const result = await matchesNative(() => [
    { get then() { throw reason; } },
    NativePromise.reject(second),
  ]);
  assert.equal(result.reason.errors[0], reason);
  assert.equal(result.reason.errors[1], second);
});

test('a throwing then getter does not prevent another input from fulfilling', { timeout: 5000 }, async () => {
  const result = await matchesNative(() => [
    { get then() { throw new Error('then getter failed'); } },
    'success',
  ]);
  assert.equal(result.value, 'success');
});

test('thenable assimilation ignores duplicate fulfillment, late rejection and late throw', { timeout: 5000 }, async () => {
  const winner = { message: 'first resolution' };
  const result = await matchesNative(() => [{
    then(resolve, reject) {
      resolve(winner);
      resolve('duplicate');
      reject('late rejection');
      throw new Error('late throw');
    },
  }]);
  assert.equal(result.value, winner);
});

test('duplicate thenable rejections do not prematurely reject while a sibling can fulfill', { timeout: 5000 }, async () => {
  const result = await matchesNative(() => [
    { then(resolve, reject) { reject('first'); reject('duplicate'); resolve('ignored'); } },
    { then(resolve) { queueMicrotask(() => resolve('success')); } },
  ]);
  assert.equal(result.value, 'success');
});

test('a rejected thenable contributes only its first rejection', { timeout: 5000 }, async () => {
  const reason = { message: 'first rejection' };
  const result = await matchesNative(() => [{
    then(resolve, reject) {
      reject(reason);
      reject('duplicate');
      resolve('ignored');
      throw new Error('late throw');
    },
  }]);
  assert.equal(result.reason.errors.length, 1);
  assert.equal(result.reason.errors[0], reason);
});

test('late sibling rejections after fulfillment are still handled', { timeout: 5000 }, async () => {
  const unhandled = [];
  const onUnhandled = reason => unhandled.push(reason);
  process.on('unhandledRejection', onUnhandled);
  try {
    for (const aggregate of [invoke, nativeAny]) {
      let rejectLater;
      const later = new NativePromise((_, reject) => { rejectLater = reject; });
      const result = await settlement(aggregate(['success', later]));
      assert.equal(result.status, 'fulfilled');
      rejectLater('late failure');
      await new NativePromise(resolve => setImmediate(resolve));
      await new NativePromise(resolve => setImmediate(resolve));
    }
    assert.deepEqual(unhandled, []);
  } finally {
    process.removeListener('unhandledRejection', onUnhandled);
  }
});

for (const [name, makeInput, status] of [
  ['empty input', () => [], 'rejected'],
  ['ordinary value', () => ['success'], 'fulfilled'],
]) {
  test(`${name} invokes callbacks asynchronously`, { timeout: 5000 }, async () => {
    for (const aggregate of [invoke, nativeAny]) {
      const events = [];
      const pending = aggregate(makeInput()).then(
        () => events.push('fulfilled'),
        () => events.push('rejected'),
      );
      events.push('returned');
      assert.deepEqual(events, ['returned']);
      await settlement(pending);
      assert.deepEqual(events, ['returned', status]);
    }
  });
}
