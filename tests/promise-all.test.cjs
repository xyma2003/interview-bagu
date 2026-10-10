'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

// Execute the published answer itself, without changing the native oracle.
const NativePromise = Promise;
const originalHostAll = NativePromise.all;
const markdown = fs.readFileSync(
  `${__dirname}/../frontend/frontend_bigco.md`,
  'utf8',
);
const question = markdown.split(/^### Q37:.*$/m)[1]?.split(/^### Q\d+:.*$/m)[0];
assert.ok(question, 'Q37 must exist');
const snippet = question.match(/```javascript\s*\n([\s\S]*?)```/);
assert.ok(snippet, 'Q37 must contain a JavaScript answer');

const context = vm.createContext({});
const RealmPromise = vm.runInContext('Promise', context);
const originalRealmAll = RealmPromise.all;
const nativeAll = originalRealmAll.bind(RealmPromise);
vm.runInContext(snippet[1], context, { timeout: 1000 });
const myAll = RealmPromise.myAll;
assert.equal(typeof myAll, 'function');

// Convert VM arrays without hiding holes: Promise.all must produce dense results.
function normalize(value) {
  if (!Array.isArray(value)) return value;
  const result = new Array(value.length);
  for (let index = 0; index < value.length; index++) {
    if (Object.hasOwn(value, index)) result[index] = normalize(value[index]);
  }
  return result;
}

async function settlement(promise) {
  let deadline;
  try {
    return await NativePromise.race([
      NativePromise.resolve(promise).then(
        value => ({ status: 'fulfilled', value: normalize(value) }),
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

function invoke(input) {
  let result;
  assert.doesNotThrow(() => { result = myAll(input); }, 'errors must reject the returned Promise');
  assert.ok(result instanceof RealmPromise, 'myAll must return its native realm Promise');
  return result;
}

async function matchesNative(makeInput) {
  // A fresh iterable is essential for one-shot generators and stateful thenables.
  const actual = settlement(invoke(makeInput()));
  const expected = settlement(nativeAll(makeInput()));
  const [observed, reference] = await NativePromise.all([actual, expected]);
  assert.deepEqual(observed, reference);
  return observed;
}

test('loading the answer does not replace or modify the native Promise oracle', () => {
  assert.equal(globalThis.Promise, NativePromise);
  assert.equal(NativePromise.all, originalHostAll);
  assert.equal(Object.hasOwn(NativePromise, 'myAll'), false);
  assert.equal(RealmPromise.all, originalRealmAll);
  assert.equal(Object.hasOwn(RealmPromise, 'myAllSettled'), false, 'only the first snippet is loaded');
});

for (const [name, makeInput] of [
  ['empty array', () => []],
  ['all-hole sparse array', () => new Array(3)],
  ['mixed sparse array', () => [1, , NativePromise.resolve(3)]],
  ['Set iterable', () => new Set([1, NativePromise.resolve(2), 3])],
  ['string iterable', () => 'A😀B'],
  ['generator iterable', () => (function* () { yield 1; yield NativePromise.resolve(2); yield 3; })()],
  ['ordinary values, promises, and thenables', () => [
    0, undefined, null, false,
    NativePromise.resolve('promise'),
    { then(resolve) { resolve('thenable'); } },
  ]],
]) {
  test(name, { timeout: 5000 }, async () => {
    await matchesNative(makeInput);
  });
}

test('sparse inputs produce dense results with an own property at every index', { timeout: 5000 }, async () => {
  const result = await matchesNative(() => new Array(3));
  assert.equal(result.status, 'fulfilled');
  assert.equal(result.value.length, 3);
  for (let index = 0; index < result.value.length; index++) {
    assert.ok(Object.hasOwn(result.value, index), `result index ${index} must exist`);
    assert.equal(result.value[index], undefined);
  }
});

for (const [name, makeInput] of [['empty', () => []], ['nonempty', () => [1]]]) {
  test(`${name} input invokes fulfillment callbacks asynchronously`, { timeout: 5000 }, async () => {
    for (const aggregate of [invoke, nativeAll]) {
      const events = [];
      const pending = aggregate(makeInput()).then(() => events.push('callback'));
      events.push('returned');
      assert.deepEqual(events, ['returned']);
      const result = await settlement(pending);
      assert.equal(result.status, 'fulfilled');
      assert.deepEqual(events, ['returned', 'callback']);
    }
  });
}

test('reverse settlement still preserves input order', { timeout: 5000 }, async () => {
  await matchesNative(() => {
    const resolvers = [];
    const promises = ['first', 'second', 'third'].map(value =>
      new NativePromise(resolve => resolvers.push(() => resolve(value))),
    );
    queueMicrotask(() => resolvers.reverse().forEach(resolve => resolve()));
    return promises;
  });
});

test('rejection preserves the reason and does not wait for a pending sibling', { timeout: 5000 }, async () => {
  const reason = { message: 'first failure' };
  const result = await matchesNative(() => [
    new NativePromise(() => {}),
    NativePromise.reject(reason),
  ]);
  assert.equal(result.status, 'rejected');
  assert.equal(result.reason, reason);
});

test('both rejected inputs are handled, including a later rejection', { timeout: 5000 }, async () => {
  const first = { message: 'first' };
  const second = { message: 'second' };
  const unhandled = [];
  const onUnhandled = reason => unhandled.push(reason);
  process.on('unhandledRejection', onUnhandled);
  try {
    for (const aggregate of [invoke, nativeAll]) {
      let rejectLater;
      const later = new NativePromise((_, reject) => { rejectLater = reject; });
      const result = await settlement(aggregate([NativePromise.reject(first), later]));
      assert.equal(result.status, 'rejected');
      assert.equal(result.reason, first);
      rejectLater(second);
      // Two event-loop turns allow Node's unhandled-rejection reporting to run.
      await new NativePromise(resolve => setImmediate(resolve));
      await new NativePromise(resolve => setImmediate(resolve));
    }
    assert.deepEqual(unhandled, []);
  } finally {
    process.removeListener('unhandledRejection', onUnhandled);
  }
});

for (const [name, makeInput] of [
  ['null', () => null],
  ['undefined', () => undefined],
  ['number', () => 42],
  ['array-like object', () => ({ 0: 'value', length: 1 })],
]) {
  test(`non-iterable ${name} returns a rejected Promise`, { timeout: 5000 }, async () => {
    const [actual, expected] = await NativePromise.all([
      settlement(invoke(makeInput())),
      settlement(nativeAll(makeInput())),
    ]);
    assert.equal(actual.status, 'rejected');
    assert.equal(expected.status, 'rejected');
    assert.equal(actual.reason.name, expected.reason.name);
    assert.equal(actual.reason.name, 'TypeError');
  });
}

test('an iterator getter failure becomes a rejected Promise with the same reason', { timeout: 5000 }, async () => {
  const reason = { message: 'cannot obtain iterator' };
  const result = await matchesNative(() => ({
    get [Symbol.iterator]() { throw reason; },
  }));
  assert.equal(result.status, 'rejected');
  assert.equal(result.reason, reason);
});

test('a synchronous iterator failure wins over a previously yielded rejected Promise', { timeout: 5000 }, async () => {
  const rejection = { message: 'earlier Promise rejection' };
  const iteratorFailure = { message: 'iterator failed synchronously' };
  const traces = [];
  const result = await matchesNative(() => {
    const trace = [];
    traces.push(trace);
    return (function* () {
      trace.push('first');
      yield NativePromise.reject(rejection);
      trace.push('next');
      throw iteratorFailure;
    })();
  });
  assert.equal(result.status, 'rejected');
  assert.equal(result.reason, iteratorFailure);
  assert.deepEqual(traces, [['first', 'next'], ['first', 'next']]);
});

test('iteration is fully consumed even after yielding a rejected Promise', { timeout: 5000 }, async () => {
  const reason = { message: 'rejected input' };
  const traces = [];
  const result = await matchesNative(() => {
    const trace = [];
    traces.push(trace);
    return (function* () {
      trace.push('first');
      yield NativePromise.reject(reason);
      trace.push('second');
      yield 2;
      trace.push('done');
    })();
  });
  assert.equal(result.reason, reason);
  assert.deepEqual(traces, [['first', 'second', 'done'], ['first', 'second', 'done']]);
});

test('a throwing then getter rejects without stopping iteration', { timeout: 5000 }, async () => {
  const reason = { message: 'then getter failed' };
  const traces = [];
  const result = await matchesNative(() => {
    const trace = [];
    traces.push(trace);
    return (function* () {
      yield { get then() { trace.push('then getter'); throw reason; } };
      trace.push('next value');
      yield 2;
    })();
  });
  assert.equal(result.status, 'rejected');
  assert.equal(result.reason, reason);
  assert.deepEqual(traces, [['then getter', 'next value'], ['then getter', 'next value']]);
});

test('native thenable assimilation ignores duplicate resolution and a later throw', { timeout: 5000 }, async () => {
  const result = await matchesNative(() => [{
    then(resolve, reject) {
      resolve('first resolution');
      resolve('second resolution');
      reject(new Error('late rejection'));
      throw new Error('late throw');
    },
  }, 2]);
  assert.deepEqual(result, { status: 'fulfilled', value: ['first resolution', 2] });
});
