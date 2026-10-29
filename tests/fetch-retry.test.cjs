'use strict';

const assert = require('node:assert/strict');
const { getEventListeners } = require('node:events');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const originalFetch = globalThis.fetch;
const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
const originalAbortController = globalThis.AbortController;
const originalAbortSignal = globalThis.AbortSignal;
const markdown = fs.readFileSync(`${__dirname}/../frontend/frontend_bigco.md`, 'utf8');
const headings = [...markdown.matchAll(/^### Q39:.*$/gm)];
assert.equal(headings.length, 1, 'Q39 must have exactly one heading');
const question = markdown.slice(headings[0].index + headings[0][0].length)
  .split(/^### Q\d+:.*$/m)[0];
const blocks = [...question.matchAll(/```javascript\s*\n([\s\S]*?)```/g)]
  .map(match => match[1]);

function definition(name) {
  const declaration = new RegExp(`^(?:async\\s+)?function\\s+${name}\\s*\\(`, 'gm');
  const found = blocks.filter(block => [...block.matchAll(declaration)].length > 0);
  assert.equal(found.length, 1, `Q39 must contain exactly one ${name} definition block`);
  assert.equal([...found[0].matchAll(declaration)].length, 1, `${name} must be defined once`);
  return found[0];
}

const definitions = ['fetchWithCancel', 'fetchWithRetry', 'fetchWithRetryAndCancel'].map(definition);
assert.equal(definition('waitForRetry'), definitions[1], 'the retry definition must include its wait helper');
const turn = () => new Promise(resolve => setImmediate(resolve));
const response = value => ({ ok: true, status: 200, json: () => Promise.resolve(value) });

function watch(promise) {
  const result = { status: 'pending' };
  Promise.resolve(promise).then(
    value => { result.status = 'fulfilled'; result.value = value; },
    reason => { result.status = 'rejected'; result.reason = reason; },
  );
  return result;
}

async function rejected(result, reason) {
  await turn();
  assert.equal(result.status, 'rejected', 'must reject without advancing a retry timer');
  assert.equal(result.reason, reason, 'preserve the exact rejection reason');
}

// A controlled transport that honors a real AbortSignal, including cleanup.
// No native fetch, request, URL connection or document usage example runs here.
function pendingUntilAbort(signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const abort = () => {
      signal.removeEventListener('abort', abort);
      reject(signal.reason);
    };
    signal.addEventListener('abort', abort, { once: true });
  });
}

function harness(transport = () => { throw new Error('Unexpected fetch'); }) {
  const calls = [];
  const timers = new Map();
  const scheduled = [];
  const cleared = [];
  let nextId = 0;
  const context = vm.createContext({
    AbortController,
    AbortSignal,
    fetch(url, options = {}) {
      calls.push({ url, options });
      return transport(url, options, calls.length);
    },
    setTimeout(callback, delay) {
      const id = ++nextId;
      const timer = { id, callback, delay };
      timers.set(id, timer);
      scheduled.push(timer);
      return id;
    },
    clearTimeout(id) {
      cleared.push(id);
      timers.delete(id);
    },
    console: { log() { throw new Error('Usage examples must not execute'); } },
  });
  for (const source of definitions) {
    vm.runInContext(source, context, { timeout: 1000, filename: 'frontend_bigco.md#q39' });
  }
  assert.equal(calls.length, 0, 'loading definitions must not execute a fetch usage example');
  assert.equal(timers.size, 0, 'loading definitions must not start the usage cancellation timer');
  return {
    context, calls, timers, scheduled, cleared,
    retry: context.fetchWithRetry,
    combined: context.fetchWithRetryAndCancel,
    cancelOnly: context.fetchWithCancel,
    fireNext() {
      assert.equal(timers.size, 1, 'exactly one backoff timer should be pending');
      const timer = timers.values().next().value;
      timers.delete(timer.id);
      timer.callback();
      return timer;
    },
  };
}

function assertClean(h, signal) {
  assert.equal(h.timers.size, 0, 'no retry timer may remain');
  if (signal) assert.equal(getEventListeners(signal, 'abort').length, 0, 'remove abort listeners');
}

test('definition extraction excludes usage examples and does not replace host APIs', () => {
  const h = harness();
  for (const name of ['fetchWithCancel', 'waitForRetry', 'fetchWithRetry', 'fetchWithRetryAndCancel']) {
    assert.equal(typeof h.context[name], 'function');
  }
  assert.equal(globalThis.fetch, originalFetch);
  assert.equal(globalThis.setTimeout, originalSetTimeout);
  assert.equal(globalThis.clearTimeout, originalClearTimeout);
  assert.equal(globalThis.AbortController, originalAbortController);
  assert.equal(globalThis.AbortSignal, originalAbortSignal);
});

for (const reason of [undefined, null, 'caller cancelled', { cause: 'custom abort reason' }]) {
  test(`an already aborted signal rejects before fetch (${String(reason)})`, async () => {
    const controller = new AbortController();
    controller.abort(reason);
    const h = harness();
    const result = watch(h.retry('/offline', { signal: controller.signal }));
    await rejected(result, controller.signal.reason);
    assert.equal(h.calls.length, 0);
    assert.equal(h.scheduled.length, 0);
    assertClean(h, controller.signal);
  });
}

test('first success preserves URL, options and JSON value without timers', async () => {
  const value = { data: 'JSON result identity' };
  const controller = new AbortController();
  const options = { signal: controller.signal, headers: { Accept: 'application/json' }, method: 'GET' };
  const h = harness(() => Promise.resolve(response(value)));
  const result = watch(h.retry('/offline?query=1', options));
  await turn();
  assert.equal(result.status, 'fulfilled');
  assert.equal(result.value, value);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].url, '/offline?query=1');
  assert.equal(h.calls[0].options, options);
  assertClean(h, controller.signal);
});

test('abort during an in-flight fetch rejects immediately without policy or retry', async () => {
  const controller = new AbortController();
  const reason = { message: 'cancel in-flight operation' };
  let policyCalls = 0;
  const h = harness((url, { signal }) => pendingUntilAbort(signal));
  const result = watch(h.retry('/offline', { signal: controller.signal }, {
    shouldRetry() { policyCalls++; return true; },
  }));
  assert.equal(h.calls.length, 1);
  controller.abort(reason);
  await rejected(result, reason);
  assert.equal(policyCalls, 0);
  assert.equal(h.calls.length, 1);
  assert.equal(h.scheduled.length, 0);
  assertClean(h, controller.signal);
});

test('abort while reading the response body does not retry JSON parsing', async () => {
  const controller = new AbortController();
  let bodyReads = 0;
  const h = harness((url, { signal }) => Promise.resolve({
    ok: true, status: 200,
    json() { bodyReads++; return pendingUntilAbort(signal); },
  }));
  const result = watch(h.retry('/offline', { signal: controller.signal }));
  await turn();
  assert.equal(bodyReads, 1);
  controller.abort();
  await rejected(result, controller.signal.reason);
  assert.equal(h.calls.length, 1);
  assert.equal(h.scheduled.length, 0);
  assertClean(h, controller.signal);
});

test('abort during backoff clears its timer and listener without another fetch', async () => {
  const controller = new AbortController();
  const failure = new Error('offline transport failure');
  let policyCalls = 0;
  const h = harness(() => Promise.reject(failure));
  const result = watch(h.retry('/offline', { signal: controller.signal }, {
    shouldRetry(error) { assert.equal(error, failure); policyCalls++; return true; },
  }));
  await turn();
  assert.equal(h.calls.length, 1);
  assert.equal(h.timers.size, 1);
  assert.equal(h.scheduled[0].delay, 1000);
  assert.equal(getEventListeners(controller.signal, 'abort').length, 1);
  const oldTimer = h.scheduled[0];
  controller.abort();
  await rejected(result, controller.signal.reason);
  assertClean(h, controller.signal);
  assert.ok(h.cleared.includes(oldTimer.id));
  // Even a callback already queued before clearTimeout cannot resurrect a retry.
  oldTimer.callback();
  await turn();
  assert.equal(h.calls.length, 1);
  assert.equal(policyCalls, 1);
  assertClean(h, controller.signal);
});

test('abort after a backoff timer fires but before its continuation prevents fetch', async () => {
  const controller = new AbortController();
  const h = harness(() => Promise.reject(new Error('offline failure')));
  const result = watch(h.retry('/offline', { signal: controller.signal }));
  await turn();
  h.fireNext();
  controller.abort();
  await rejected(result, controller.signal.reason);
  assert.equal(h.calls.length, 1);
  assertClean(h, controller.signal);
});

test('AbortError without an aborted signal bypasses shouldRetry and timers', async () => {
  const reason = new DOMException('cancelled by transport', 'AbortError');
  const controller = new AbortController();
  let policyCalls = 0;
  const h = harness(() => Promise.reject(reason));
  const result = watch(h.retry('/offline', { signal: controller.signal }, {
    shouldRetry() { policyCalls++; return true; },
  }));
  await rejected(result, reason);
  assert.equal(controller.signal.aborted, false);
  assert.equal(policyCalls, 0);
  assert.equal(h.calls.length, 1);
  assertClean(h, controller.signal);
});

for (const decision of [true, false]) {
  test(`a policy that cancels before returning ${decision} starts no timer`, async () => {
    const controller = new AbortController();
    const reason = { cause: 'cancel inside policy' };
    const h = harness(() => Promise.reject(new Error('offline failure')));
    const result = watch(h.retry('/offline', { signal: controller.signal }, {
      shouldRetry() { controller.abort(reason); return decision; },
    }));
    await rejected(result, reason);
    assert.equal(h.calls.length, 1);
    assert.equal(h.scheduled.length, 0);
    assertClean(h, controller.signal);
  });
}

test('default failures keep four attempts and backoffs of 1000, 2000, 4000', async () => {
  const failures = Array.from({ length: 4 }, (_, index) => new Error(`failure ${index + 1}`));
  const seen = [];
  const controller = new AbortController();
  const h = harness((url, options, attempt) => Promise.reject(failures[attempt - 1]));
  const result = watch(h.retry('/offline', { signal: controller.signal }, {
    shouldRetry(error) { seen.push(error); return true; },
  }));
  for (const delay of [1000, 2000, 4000]) {
    await turn();
    assert.equal(result.status, 'pending');
    assert.equal(h.timers.values().next().value.delay, delay);
    assert.equal(getEventListeners(controller.signal, 'abort').length, 1);
    h.fireNext();
  }
  await rejected(result, failures[3]);
  assert.deepEqual(h.scheduled.map(timer => timer.delay), [1000, 2000, 4000]);
  assert.deepEqual(seen, failures.slice(0, 3));
  assert.equal(h.calls.length, 4);
  assert.equal(h.cleared.length, 3);
  assertClean(h, controller.signal);
});

test('success on the fourth default attempt stops with no extra timer', async () => {
  const value = { success: 'fourth attempt' };
  const controller = new AbortController();
  const h = harness((url, options, attempt) => attempt < 4
    ? Promise.reject(new Error('offline failure')) : Promise.resolve(response(value)));
  const result = watch(h.retry('/offline', { signal: controller.signal }));
  for (let index = 0; index < 3; index++) {
    await turn();
    h.fireNext();
  }
  await turn();
  assert.equal(result.status, 'fulfilled');
  assert.equal(result.value, value);
  assert.equal(h.calls.length, 4);
  assert.deepEqual(h.scheduled.map(timer => timer.delay), [1000, 2000, 4000]);
  assertClean(h, controller.signal);
  controller.abort();
  await turn();
  assert.equal(result.status, 'fulfilled');
  assert.equal(h.calls.length, 4);
});

test('custom retry parameters retain their existing number and delay semantics', async () => {
  const reason = new Error('custom retry failure');
  const h = harness(() => Promise.reject(reason));
  const result = watch(h.retry('/offline', {}, { maxRetries: 2, delay: 25, backoff: 3 }));
  for (let index = 0; index < 2; index++) {
    await turn();
    h.fireNext();
  }
  await rejected(result, reason);
  assert.equal(h.calls.length, 3);
  assert.deepEqual(h.scheduled.map(timer => timer.delay), [25, 75]);
  assertClean(h);
});

test('zero retries propagates the first error without calling shouldRetry', async () => {
  const reason = new Error('first error');
  let policyCalls = 0;
  const h = harness(() => Promise.reject(reason));
  const result = watch(h.retry('/offline', {}, {
    maxRetries: 0, shouldRetry() { policyCalls++; return true; },
  }));
  await rejected(result, reason);
  assert.equal(h.calls.length, 1);
  assert.equal(policyCalls, 0);
  assert.equal(h.scheduled.length, 0);
});

for (const kind of ['http', 'json', 'sync']) {
  test(`a non-abort ${kind} failure keeps the normal retry path`, async () => {
    const value = { recovered: kind };
    const reason = kind === 'json' ? new SyntaxError('invalid JSON') : new Error('synchronous transport error');
    const seen = [];
    const h = harness((url, options, attempt) => {
      if (attempt === 2) return Promise.resolve(response(value));
      if (kind === 'http') return Promise.resolve({ ok: false, status: 503 });
      if (kind === 'json') return Promise.resolve({ ok: true, json: () => Promise.reject(reason) });
      throw reason;
    });
    const result = watch(h.retry('/offline', {}, { shouldRetry(error) { seen.push(error); return true; } }));
    await turn();
    h.fireNext();
    await turn();
    assert.equal(result.status, 'fulfilled');
    assert.equal(result.value, value);
    assert.equal(h.calls.length, 2);
    assert.equal(seen.length, 1);
    if (kind === 'http') assert.equal(seen[0].message, 'HTTP 503');
    else assert.equal(seen[0], reason);
    assertClean(h);
  });
}

test('the documented HTTP 4xx policy rejects without a backoff', async () => {
  const h = harness(() => Promise.resolve({ ok: false, status: 404 }));
  const result = watch(h.retry('/offline', {}, {
    shouldRetry: error => !error.message.includes('HTTP 4'),
  }));
  await turn();
  assert.equal(result.status, 'rejected');
  assert.equal(result.reason.message, 'HTTP 404');
  assert.equal(h.calls.length, 1);
  assert.equal(h.scheduled.length, 0);
});

test('a thrown shouldRetry error is preserved without a timer', async () => {
  const reason = new Error('policy failed');
  const h = harness(() => Promise.reject(new Error('offline transport failed')));
  const result = watch(h.retry('/offline', {}, { shouldRetry() { throw reason; } }));
  await rejected(result, reason);
  assert.equal(h.calls.length, 1);
  assert.equal(h.scheduled.length, 0);
});

test('combined wrapper immediately returns a handle and internal cancel is idempotent', async () => {
  const h = harness((url, { signal }) => pendingUntilAbort(signal));
  const handle = h.combined('/offline');
  assert.equal(typeof handle.cancel, 'function');
  assert.equal(typeof handle.promise.then, 'function');
  assert.equal(handle.then, undefined, 'the handle itself must not be a Promise');
  const result = watch(handle.promise);
  const signal = h.calls[0].options.signal;
  handle.cancel();
  const reason = signal.reason;
  handle.cancel();
  await rejected(result, reason);
  assert.equal(reason.name, 'AbortError');
  assert.equal(h.calls.length, 1);
  assertClean(h, signal);
});

test('combined wrapper preserves an already aborted external signal without fetching', async () => {
  const external = new AbortController();
  const reason = { message: 'pre-aborted external' };
  external.abort(reason);
  const h = harness();
  const handle = h.combined('/offline', { signal: external.signal });
  const result = watch(handle.promise);
  handle.cancel();
  await rejected(result, reason);
  assert.equal(h.calls.length, 0);
  assert.equal(h.scheduled.length, 0);
  assertClean(h, external.signal);
});

for (const first of ['external', 'internal']) {
  test(`combined signals honor ${first} cancellation first without mutating options`, async () => {
    const external = new AbortController();
    const options = { signal: external.signal, method: 'GET', headers: { Accept: 'application/json' } };
    const h = harness((url, { signal }) => pendingUntilAbort(signal));
    const handle = h.combined('/offline', options);
    const result = watch(handle.promise);
    const signal = h.calls[0].options.signal;
    assert.notEqual(signal, external.signal);
    assert.equal(options.signal, external.signal);
    assert.equal(h.calls[0].options.method, options.method);
    assert.equal(h.calls[0].options.headers, options.headers);
    if (first === 'external') external.abort({ source: 'external' });
    else handle.cancel();
    const reason = signal.reason;
    if (first === 'external') handle.cancel();
    else external.abort({ source: 'later external' });
    await rejected(result, reason);
    assert.equal(h.calls.length, 1);
    assertClean(h, signal);
  });
}

test('combined cancellation also interrupts default backoff', async () => {
  const h = harness(() => Promise.reject(new Error('offline failure')));
  const handle = h.combined('/offline');
  const result = watch(handle.promise);
  await turn();
  const signal = h.calls[0].options.signal;
  assert.equal(h.scheduled[0].delay, 1000);
  handle.cancel();
  await rejected(result, signal.reason);
  assert.equal(h.calls.length, 1);
  assertClean(h, signal);
});

test('basic cancel example retains its immediate handle and single request', async () => {
  const h = harness((url, { signal }) => pendingUntilAbort(signal));
  const handle = h.cancelOnly('/offline');
  assert.equal(typeof handle.cancel, 'function');
  const result = watch(handle.promise);
  const signal = h.calls[0].options.signal;
  handle.cancel();
  await rejected(result, signal.reason);
  assert.equal(h.calls.length, 1);
  assertClean(h, signal);
});
