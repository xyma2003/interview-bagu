'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

// Test the dense-array teaching example as published, using a separate realm.
const NativePromise = Promise;
const originalHostRace = NativePromise.race;
const markdown = fs.readFileSync(`${__dirname}/../frontend/frontend_bigco.md`, 'utf8');
const question = markdown.split(/^### Q37:.*$/m)[1]?.split(/^### Q\d+:.*$/m)[0];
assert.ok(question, 'Q37 must exist');
const blocks = [...question.matchAll(/```javascript\s*\n([\s\S]*?)```/g)];
const snippet = blocks.find(block => /Promise\.myRace\s*=/.test(block[1]));
assert.ok(snippet, 'Q37 must contain the Promise.myRace answer');

const context = vm.createContext({});
const RealmPromise = vm.runInContext('Promise', context);
const originalRealmRace = RealmPromise.race;
const nativeRace = originalRealmRace.bind(RealmPromise);
vm.runInContext(snippet[1], context, { timeout: 1000 });
const myRace = RealmPromise.myRace;
assert.equal(typeof myRace, 'function');

const outcome = promise => NativePromise.resolve(promise).then(
  value => ({ status: 'fulfilled', value }),
  reason => ({ status: 'rejected', reason }),
);

test('loading only the race example preserves both native oracles', () => {
  assert.equal(globalThis.Promise, NativePromise);
  assert.equal(NativePromise.race, originalHostRace);
  assert.equal(Object.hasOwn(NativePromise, 'myRace'), false);
  assert.equal(RealmPromise.race, originalRealmRace);
  assert.equal(Object.hasOwn(RealmPromise, 'myAll'), false);
  assert.equal(Object.hasOwn(RealmPromise, 'myAllSettled'), false);
  assert.equal(Object.hasOwn(RealmPromise, 'myAny'), false);
});

test('an already rejected first input beats an already fulfilled second input', { timeout: 2000 }, async () => {
  const reason = { message: 'first rejection' };
  const inputs = () => [RealmPromise.reject(reason), RealmPromise.resolve('second fulfillment')];
  const [actual, expected] = await NativePromise.all([
    outcome(myRace(inputs())), outcome(nativeRace(inputs())),
  ]);
  assert.deepEqual(actual, expected);
  assert.deepEqual(actual, { status: 'rejected', reason });
  assert.equal(actual.reason, reason);
});

test('reversing the dense inputs lets the already fulfilled first input win', { timeout: 2000 }, async () => {
  const inputs = () => [RealmPromise.resolve('first fulfillment'), RealmPromise.reject('second rejection')];
  const [actual, expected] = await NativePromise.all([
    outcome(myRace(inputs())), outcome(nativeRace(inputs())),
  ]);
  assert.deepEqual(actual, expected);
  assert.deepEqual(actual, { status: 'fulfilled', value: 'first fulfillment' });
});

test('fulfillment and rejection callbacks run after the call returns', { timeout: 2000 }, async () => {
  for (const aggregate of [myRace, nativeRace]) {
    for (const success of [true, false]) {
      const events = [];
      const input = success ? RealmPromise.resolve('ok') : RealmPromise.reject('failure');
      const result = aggregate([input]);
      assert.ok(result instanceof RealmPromise);
      const observed = result.then(
        () => events.push('fulfilled'),
        () => events.push('rejected'),
      );
      events.push('returned');
      assert.deepEqual(events, ['returned']);
      await observed;
      assert.deepEqual(events, ['returned', success ? 'fulfilled' : 'rejected']);
    }
  }
});
