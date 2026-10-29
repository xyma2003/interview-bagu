# 前端开发专项 · 实现与原理

<!-- navigation:start -->
[← 前端目录](README.md) · [12 周学习路线](../LEARNING_GUIDE.md) · [首页](../README.md)

<a id="question-index"></a>

<details>
<summary>本页题目（12 题，点击展开）</summary>

- [Q37 · 如何实现 `Promise.all`，并区分 allSettled、race 和 any？](#q37)
- [Q38 · 实现 `instanceof`，并解释为什么 `typeof null === 'object'`](#q38)
- [Q39 · 实现一个带取消功能的 fetch，以及请求重试机制](#q39)
- [Q40 · 实现一个 `LRU Cache`](#q40)
- [Q41 · EventEmitter 的实现，以及如何防止内存泄漏](#q41)
- [Q42 · 实现 `deepClone`，处理循环引用和特殊类型](#q42)
- [Q43 · 浏览器的渲染进程有哪些线程？它们是如何协作的？](#q43)
- [Q44 · WebSocket 和 HTTP Long Polling 的区别？如何实现断线重连？](#q44)
- [Q45 · CSS 实现一个瀑布流（Masonry）布局，有哪些方案？](#q45)
- [Q46 · 如何实现图片的渐进加载和懒加载？Blurhash 是什么？](#q46)
- [Q47 · 移动端 1px 问题是什么？有哪些解决方案？](#q47)
- [Q48 · Next.js 的 SSR、SSG、ISR 有什么区别？各自适用什么场景？](#q48)

</details>
<!-- navigation:end -->

> 本页未提供可追溯的面经记录，不能作为某公司出题或题目出现频率的证据。
>
> 未核验题保留的旧公司标签不作为事实；选定题以本轮逐题核验记录为准，见[来源核验清单](../SOURCE_AUDIT.md)。

---

## JavaScript 实现与异步控制

<a id="q37"></a>

<a id="review-frontend-q37"></a>

### Q37: 如何实现 `Promise.all`，并区分 allSettled、race 和 any？

> **核验日期**：2026-10-15；`allSettled` 回归补充：2026-10-28
>
> **适用范围**：原生 Promise、未改写内建方法；`any` / `AggregateError` 需要 ES2021 或更新运行时。现有自动回归要求 Node.js 22+；以下是教学实现，不是完整 polyfill。
>
> **技术参考**：[ECMAScript：Promise.all](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.all)、[Promise.allSettled](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.allsettled)、[Promise.race](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.race)
>
> **面经来源**：未提供可追溯面经。

**题目解析**：
重点是输入迭代、结果顺序、拒绝传播与空输入，而非背诵函数名。原生四种方法均接受同步 iterable；它们不负责启动传入的 Promise，也不会因聚合结果已确定而自动取消其他操作。

| 原生方法 | 何时决定结果 | 空 iterable |
|---|---|---|
| `all` | 全部成功，或有输入拒绝；成功结果保持输入顺序 | fulfilled，值为 `[]` |
| `allSettled` | 所有输入均已 settled，结果保持输入顺序 | fulfilled，值为 `[]` |
| `race` | 首个使聚合结果 settled 的输入，无论成功或拒绝 | 一直 pending |
| `any` | 任一成功；全部拒绝时用 `AggregateError` 汇总，errors 保持输入顺序 | rejected，errors 为 `[]` |

即使空输入立即确定状态，后续 `.then` / `.catch` reaction 也异步运行。迭代器自身抛错等错误则另按返回 Promise 的拒绝处理。

**题目讲解**：

**Promise.all 实现**：

接收**同步可迭代对象（iterable）**，例如数组、`Set`、字符串和生成器；输出顺序与输入的迭代顺序一致。

```javascript
Promise.myAll = function(iterable) {
  return new Promise((resolve, reject) => {
    const results = [];
    let index = 0;
    let remaining = 1; // 为“遍历结束”预留一次计数

    for (const item of iterable) {
      const currentIndex = index++;
      remaining++;
      Promise.resolve(item).then(value => {
        results[currentIndex] = value; // 按输入顺序存放，而非完成顺序
        if (--remaining === 0) resolve(results);
      }, reject);
    }

    // 空 iterable 也会走到这里，此时直接完成；then 回调仍异步执行。
    if (--remaining === 0) resolve(results);
  });
};
```

**边界与实现范围**：

- 不能用 `.length` 判断 iterable 是否为空：`Set` 和生成器没有数组的 `length`。
- 不能用 `forEach` 遍历数组：它会跳过空位。`for...of` 会把稀疏数组的空位读为 `undefined`，所以 `Promise.myAll(new Array(2))` 得到 `[undefined, undefined]`，不会一直等待。
- `remaining` 同时记录未完成的元素和“遍历尚未结束”这一项；全部扣完才完成，结果数组的 `length` 不能替代这个计数。
- `Promise.resolve` 统一处理普通值、Promise 和 thenable；任一输入拒绝后，外层 Promise 拒绝，其他任务不会因此取消。
- 非 iterable（如 `null`、数字、只有 `length` 的普通对象）以及迭代过程抛错，会由 Promise executor 转为返回 Promise 的拒绝，而不是从 `myAll` 调用处同步抛出。不要用 `Array.from` 替代迭代，它还会接受不可迭代的 array-like 对象。
- 这是使用原生 `Promise` 的教学实现，要求内建方法未被改写；不是完整 polyfill。不覆盖自定义构造器、Promise 子类的返回类型，以及改写 `resolve` / `then` 后的完整规范行为。

**运行本题验证**（仓库根目录，Node.js 22+，无额外依赖）：

```bash
node --test tests/promise-all.test.cjs
```

测试直接提取本节的 `Promise.myAll` 代码块，与原生 `Promise.all` 对照空输入、稀疏数组、iterable、thenable、顺序、拒绝和迭代异常。核验范围仅为这一实现，不代表整份题库已验证。

规范依据：[Promise.all](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.all)、[PerformPromiseAll](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-performpromiseall)（核验日期：2026-10-10）。

> 以下 `allSettled` / `race` 仅展示普通稠密 Array 的组合思路，不是原生 API 的完整替代。`map` / `forEach` 会跳过稀疏空位，也不支持 Set、生成器等通用 iterable。两者均有上述限定范围的自动回归；不覆盖遍历期间通过数组访问器、代理等副作用改写输入的情况，也不保证与原生实现具有完全相同的微任务时序。`any` 的 iterable 实现与独立验证见后文。

**Promise.allSettled 实现**：

先运行前面的 `Promise.myAll` 定义，再运行本段；本实现调用的是该教学版 `myAll`。

```javascript
Promise.myAllSettled = function(promises) {
  return Promise.myAll(
    promises.map(p =>
      Promise.resolve(p)
        .then(value => ({ status: 'fulfilled', value }))
        .catch(reason => ({ status: 'rejected', reason }))
    )
  );
};
```

**allSettled 的边界与验证**：

- 普通值、Promise 和 thenable 经 `Promise.resolve` 统一处理；结果按输入顺序排列。成功项为 `{ status: 'fulfilled', value }`，失败项为 `{ status: 'rejected', reason }`，即使值或原因为 `undefined` 也保留对应字段。
- 单个输入拒绝不会提前结束，必须等所有输入 settled；如果仍有输入 pending，组合结果继续等待。空数组得到 `[]`，后续回调仍异步执行。
- 稀疏数组不在范围内：`map` 跳过空位后，`myAll` 会把它读成 `undefined`，结果缺少应有的状态对象；这与原生 `allSettled` 不同。非数组参数、数组索引 getter 或映射阶段异常还可能从调用处同步抛出；thenable 的 `then` getter 抛错则由 `Promise.resolve` 转成拒绝，可以得到失败状态对象。
- 此实现增加了 Promise 链，只验证回调异步执行，不承诺与原生实现逐个微任务的相对顺序一致；也不覆盖 Promise 子类或改写内建方法的行为。

在仓库根目录运行（Node.js 22+，无额外依赖）：

```bash
node --test tests/promise-allsettled.test.cjs
```

测试直接提取本题的 `myAll` 与 `myAllSettled`，在隔离 VM 中与未改写的原生 `Promise.allSettled` 对照空输入、普通值、混合成功/拒绝、thenable、结果字段与对象身份、逆序完成、等待未完成项、异步回调及调用后数组变化。[完整验证范围](../EXAMPLE_CHECKS.md#promise-checks)不包含通用 iterable 或完整 polyfill 行为。

规范依据：[Promise.allSettled](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.allsettled)、[PerformPromiseAllSettled](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-performpromiseallsettled)（复核日期：2026-10-28）。

**Promise.race 实现**：
```javascript
Promise.myRace = function(promises) {
  return new Promise((resolve, reject) => {
    promises.forEach(p => Promise.resolve(p).then(resolve, reject));
  });
};
```

成功和拒绝处理器必须在同一层 `.then(resolve, reject)` 注册。如果写成 `.then(resolve).catch(reject)`，拒绝会多经过一层 reaction；例如输入 `[Promise.reject('first'), Promise.resolve('second')]` 时，简化实现就可能错误地让后面的成功胜出。

**运行 race 回归**（Node.js 22+，仅核验上述稠密数组范围）：

```bash
node --test tests/promise-race.test.cjs
```

测试从本题提取 `Promise.myRace`，在隔离 VM 中与原生实现对照先拒绝、先成功和异步回调；不代表已覆盖通用 iterable 或完整 polyfill 行为。

**Promise.any 实现**：

接收同步 iterable；第一个成功的输入决定结果，只有所有输入都拒绝时，才以 `AggregateError` 拒绝。其 `errors` 按输入顺序排列，而不是按拒绝顺序。

```javascript
Promise.myAny = function(iterable) {
  return new Promise((resolve, reject) => {
    const errors = [];
    let index = 0;
    let remaining = 1; // 为“遍历结束”预留一次计数

    for (const item of iterable) {
      const currentIndex = index++;
      remaining++;
      Promise.resolve(item).then(resolve, reason => {
        errors[currentIndex] = reason;
        if (--remaining === 0) {
          reject(new AggregateError(errors, 'All promises were rejected'));
        }
      });
    }

    // 空 iterable 直接拒绝，errors 为 []；非空则等待成功或全部拒绝。
    if (--remaining === 0) {
      reject(new AggregateError(errors, 'All promises were rejected'));
    }
  });
};
```

**any 的边界与实现范围**：

- 使用 `for...of` 和独立计数，支持 `Set`、生成器及稀疏数组；`new Array(2)` 中的空位作为 `undefined` 参与，结果成功为 `undefined`。调用后修改原数组的 `length`，不会改变已经收集的任务数量。
- 空 iterable 拒绝且 `errors` 为 `[]`；如果有输入一直 pending，其他输入全部拒绝，也不能判断“全部拒绝”，返回值会继续等待。任一输入成功后不会取消其他任务，后续拒绝仍有处理函数。
- 非 iterable 和同步迭代异常会使返回的 Promise 拒绝；迭代异常直接作为拒绝原因，不包装成 `AggregateError`。`Promise.resolve` 负责普通值、thenable 和重复回调的归一化。
- 与上面的 `myAll` 一样，限定未改写内建方法的原生 `Promise`，不是完整 polyfill；不覆盖自定义构造器或子类行为。错误文案不要求与各运行时逐字相同。

**运行 any 验证**（Node.js 22+，无额外依赖）：

```bash
node --test tests/promise-any.test.cjs
# 同时运行 all、any 与稠密数组 allSettled / race 的回归
node --test tests/promise-*.test.cjs
```

any 测试直接提取本节代码，与原生 `Promise.any` 对照边界、成功及拒绝语义；`allSettled` / `race` 另有上述限定范围的回归。这些测试不代表整份题库已验证。

规范依据：[Promise.any](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.any)、[PerformPromiseAny](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-performpromiseany)（核验日期：2026-10-13）。

**考察点**：
1. `results[i] = val` 而非 `results.push(val)`（保持顺序）
2. 同步迭代协议、空输入和稀疏数组的边界处理
3. `Promise.resolve(p)` 包裹（处理普通值和 thenable）
4. 拒绝传播与迭代异常；拒绝不会自动取消其他任务

**示例答案**：
实现 Promise.all 时，先用 for...of 读取同步 iterable，避免依赖数组的 length 或跳过稀疏数组空位。每个元素通过 Promise.resolve 统一处理，完成后按输入索引写入结果；用剩余计数判断是否全部完成，不能看结果数组的 length。额外预留一次“遍历结束”计数，让空输入也自然完成。拒绝回调直接交给外层 reject，迭代异常则由 executor 转为拒绝；拒绝不会取消其他任务。这个版本限定原生 Promise，不是完整 polyfill。延伸到 allSettled 时，可把每个输入的成功和失败包装成状态对象；race 取最先完成的结果，any 取最先成功的结果，全部失败时才用 AggregateError 汇总错误。

---

<a id="q38"></a>

### Q38: 字节 面试：实现 `instanceof`，并解释为什么 `typeof null === 'object'`

**🏢 高频公司**：字节、腾讯

**题目解析**：
考察候选人对 JavaScript 类型系统的深层理解和原型链知识。

**题目讲解**：
**手写 instanceof**：
```javascript
function myInstanceof(left, right) {
  // 基本类型直接返回 false
  if (typeof left !== 'object' && typeof left !== 'function') return false;
  if (left === null) return false;
  
  let proto = Object.getPrototypeOf(left);  // 等价于 left.__proto__
  const prototype = right.prototype;
  
  while (proto !== null) {
    if (proto === prototype) return true;
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}
```

**为什么 `typeof null === 'object'`**：
- 历史遗留 bug（JavaScript 诞生时的错误，后来为了向后兼容保留）
- 底层原因：JS 的值用标签位（type tag）标记类型，对象的标签是 `000`，而 `null` 的 32 位表示全是 0，被误判为对象类型
- ES6 曾提案修复（`typeof null === 'null'`），但因为会破坏大量现有代码而被拒绝

**typeof 的完整返回值**：
```javascript
typeof undefined    // "undefined"
typeof null         // "object" (bug!)
typeof true         // "boolean"
typeof 42           // "number"
typeof "str"        // "string"
typeof Symbol()     // "symbol"
typeof 42n          // "bigint"
typeof function(){} // "function"
typeof {}           // "object"
typeof []           // "object"
```

**更准确的类型判断**：
```javascript
Object.prototype.toString.call(null)     // "[object Null]"
Object.prototype.toString.call([])       // "[object Array]"
Object.prototype.toString.call(/regex/)  // "[object RegExp]"
```

**考察点**：
1. instanceof 沿原型链查找的完整过程
2. typeof 的历史 bug
3. Object.prototype.toString 作为精确类型检测工具

**示例答案**：
手写 instanceof：沿左侧对象的 `__proto__` 链向上找，看是否等于右侧构造函数的 `prototype`，到 null 时返回 false。注意处理边界：null 没有原型链，基本类型（数字/字符串等）也要返回 false。`typeof null === 'object'` 是 JavaScript 最著名的历史 bug——1995 年布兰登·艾克设计时，用二进制标签位标记类型，对象是 `000`，而 null 指针的完整二进制表示恰好是 32 个 0，被误识别为对象。这个 bug 在 ES6 提案中被提出修复但被否决，因为全球已有太多代码依赖这个行为。正确检测 null 用全等 `=== null`，精确检测各种对象类型用 `Object.prototype.toString.call()`，它能区分 Array/RegExp/Date/Null 等，是最可靠的运行时类型检测方式。

---

<a id="q39"></a>

### Q39: 字节 面试：实现一个带取消功能的 fetch，以及请求重试机制

**🏢 高频公司**：字节（高频）、腾讯

**题目解析**：
AbortController 取消请求和指数退避重试是工程实践中的常见需求，考察候选人的异步编程能力。

**题目讲解**：

本题使用支持 `AbortSignal.throwIfAborted()` 和 `AbortSignal.any()` 的现代浏览器，或 Node.js 22+。示例按 JSON 响应讲解；重试参数要求非负整数 `maxRetries`、有限非负 `delay` 和有限正数 `backoff`。默认仍是最多重试 3 次、初始等待 1000ms、退避倍数 2；加上第一次请求，最多尝试 4 次。

**带取消的 fetch**：
```javascript
function fetchWithCancel(url, options = {}) {
  const controller = new AbortController();
  const promise = fetch(url, { ...options, signal: controller.signal })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      return res.json();
    });
  
  return {
    promise,
    cancel: () => controller.abort()
  };
}
```

使用示例（需要可用的 `/api/data` 接口，不在离线测试中执行）：
```javascript
// 使用
const { promise, cancel } = fetchWithCancel('/api/data');
// 1秒后取消
setTimeout(cancel, 1000);
promise.then(data => console.log(data))
       .catch(err => {
         if (err.name === 'AbortError') console.log('请求已取消');
         else throw err;
       });
```

**带重试的 fetch**：
```javascript
function waitForRetry(ms, signal) {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };
    const onAbort = () => {
      cleanup();
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

async function fetchWithRetry(url, options = {}, {
  maxRetries = 3,
  delay = 1000,
  backoff = 2,          // 指数退避倍数
  shouldRetry = (err) => true  // 可自定义重试条件
} = {}) {
  const signal = options.signal;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    signal?.throwIfAborted();
    try {
      const res = await fetch(url, options);
      signal?.throwIfAborted();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      signal?.throwIfAborted();
      return data;
    } catch (err) {
      signal?.throwIfAborted();
      if (err?.name === 'AbortError' || attempt === maxRetries) throw err;
      const retry = shouldRetry(err);
      signal?.throwIfAborted();
      if (!retry) throw err;
      const waitTime = delay * Math.pow(backoff, attempt);
      await waitForRetry(waitTime, signal);
    }
  }
}
```

使用示例（保留自定义策略：排除 HTTP 4xx，其余错误仍可重试）：
```javascript
fetchWithRetry('/api/data', {}, {
  shouldRetry: (err) => !err.message.includes('HTTP 4')
});
```

**组合：取消 + 重试**：

先定义上面的 `waitForRetry` 和 `fetchWithRetry`，再定义这个包装函数。包装函数不用 `async`，调用后直接得到 `{ promise, cancel }`；外部信号与 `cancel()` 都能取消同一次操作。

```javascript
function fetchWithRetryAndCancel(url, options = {}, retryOptions = {}) {
  const controller = new AbortController();
  const signal = options.signal
    ? AbortSignal.any([options.signal, controller.signal])
    : controller.signal;
  const promise = fetchWithRetry(url,
    { ...options, signal },
    retryOptions
  );
  return { promise, cancel: () => controller.abort() };
}
```

**取消边界与验证**：

- `fetchWithRetry` 在每次尝试前检查信号。信号已取消时不发请求；请求或响应体读取中的取消交给原生 `fetch`；退避等待监听取消事件并立即拒绝，不等下一次计时器到期。
- 取消后不再调用 `shouldRetry` 或启动下一次请求。优先保留 `signal.reason`，因此自定义取消原因不一定名为 `AbortError`；没有已取消信号但收到 `AbortError` 时，同样直接拒绝。
- 退避结束和取消都会移除等待监听器、清理计时器。包装函数用 `AbortSignal.any` 合并信号；最先发生的取消决定原因。基础 `fetchWithCancel` 仅演示自身 `cancel()`，不合并传入的外部信号。
- 其他错误仍按原 `shouldRetry` 决定是否重试，包括 HTTP 错误和 JSON 解析错误。默认策略允许重试所有非取消错误，不代表适合所有接口；示例不负责幂等性、流式请求体重放、超时、jitter 或非法参数校验，也不承诺撤回服务端已经执行的操作。

离线验证直接提取本题定义代码，使用真实 `AbortController`、可控请求和计时器，不执行上面的用法示例、不访问网络：

```bash
node --test tests/fetch-retry.test.cjs
```

技术依据：[DOM 的取消原因与 `throwIfAborted`](https://dom.spec.whatwg.org/#dom-abortsignal-throwifaborted)、[`AbortSignal.any`](https://dom.spec.whatwg.org/#dom-abortsignal-any)、[Fetch 的信号处理](https://fetch.spec.whatwg.org/#fetch-method)。本次仅核对取消相关代码及边界，不增加公司面经或频率证据。

**考察点**：
1. AbortController 的原理（信号传递）
2. 指数退避的意义（避免同时重试打垮服务）
3. 重试条件的设计（4xx 不重试，5xx 和网络错误重试）

**示例答案**：
取消要同时覆盖正在请求和退避等待两个阶段：把 signal 交给 fetch，每次尝试前检查是否已取消，等待重试时也监听 abort 并清理计时器。取消属于终止操作，不应继续退避或进入下一次 fetch；拒绝原因保留 signal.reason。其他错误按 shouldRetry 决定是否重试，默认等待仍是 1000、2000、4000ms。组合包装函数直接返回 promise 和 cancel，不能加 async 后让取消句柄藏在另一层 Promise 中。具体哪些 HTTP 状态或网络错误值得重试，需要结合接口语义与幂等性决定；这段教学代码没有实现完整的生产重试策略。

---

<a id="q40"></a>

### Q40: 字节 面试：实现一个 `LRU Cache`

**🏢 高频公司**：字节（必考）、腾讯、小红书

**题目解析**：
LRU Cache 是字节前端笔试的超高频题，需要用 Map（保持插入顺序）或双向链表 + HashMap 实现 O(1) 操作。

**题目讲解**：

**方法一：用 Map 实现（面试推荐，ES6 Map 保持插入顺序）**：
```javascript
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();  // Map 保持插入顺序
  }
  
  get(key) {
    if (!this.cache.has(key)) return -1;
    // 访问后移到末尾（最近使用）
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }
  
  put(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);  // 先删后插到末尾
    } else if (this.cache.size >= this.capacity) {
      // 删除最老的（Map 迭代器的第一个 key）
      this.cache.delete(this.cache.keys().next().value);
    }
    this.cache.set(key, value);
  }
}
```

**方法二：双向链表 + HashMap（O(1) 严格保证）**：
```javascript
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();  // key → node
    // 哨兵节点，简化边界处理
    this.head = { key: null, val: null, prev: null, next: null };
    this.tail = { key: null, val: null, prev: null, next: null };
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }
  
  _remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }
  
  _addToTail(node) {  // 最近使用 = 靠近 tail
    node.prev = this.tail.prev;
    node.next = this.tail;
    this.tail.prev.next = node;
    this.tail.prev = node;
  }
  
  get(key) {
    if (!this.map.has(key)) return -1;
    const node = this.map.get(key);
    this._remove(node);
    this._addToTail(node);
    return node.val;
  }
  
  put(key, value) {
    if (this.map.has(key)) {
      const node = this.map.get(key);
      node.val = value;
      this._remove(node);
      this._addToTail(node);
    } else {
      if (this.map.size >= this.capacity) {
        const lru = this.head.next;  // 最久未使用的
        this._remove(lru);
        this.map.delete(lru.key);
      }
      const node = { key, val: value };
      this._addToTail(node);
      this.map.set(key, node);
    }
  }
}
```

**考察点**：
1. Map 的 keys() 迭代顺序（插入顺序）
2. 哨兵节点简化链表边界处理
3. 所有操作均为 O(1)

**示例答案**：
LRU Cache 需要同时支持 O(1) 的 get 和 put，纯数组不行（查找 O(N)），纯 HashMap 不行（无法维护顺序）。面试中用 Map 的方法最简洁：ES6 Map 保证迭代顺序等于插入顺序，`keys().next().value` 可以拿到最久未使用的 key，每次访问就先删后重新 set（把它移到末尾）。这种方法所有操作均 O(1)（HashMap 查找 + 链表头删，Map 内部用哈希链表实现）。若面试官要求手动实现底层结构，改用双向链表 + HashMap：链表维护顺序（head.next 是最久未用，tail.prev 是最近用），HashMap 实现 O(1) 的节点查找，两者配合达到全 O(1)。哨兵节点（dummy head/tail）是工程技巧，避免处理空链表或只有一个节点时的边界情况，代码更简洁。

---

<a id="q41"></a>

### Q41: 字节 面试：EventEmitter 的实现，以及如何防止内存泄漏

**🏢 高频公司**：字节、腾讯

**题目解析**：
观察者模式的手写实现，以及 Node.js EventEmitter 的内存泄漏是常见面试考察点。

**题目讲解**：

**基础 EventEmitter 实现**：
```javascript
class EventEmitter {
  constructor() {
    this._events = Object.create(null);  // 避免原型污染
    this._maxListeners = 10;
  }
  
  on(event, listener) {
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push(listener);
    // 超过最大监听数警告（防内存泄漏）
    if (this._events[event].length > this._maxListeners) {
      console.warn(`MaxListeners exceeded for event: ${event}`);
    }
    return this;  // 链式调用
  }
  
  once(event, listener) {
    const wrapper = (...args) => {
      listener(...args);
      this.off(event, wrapper);
    };
    wrapper._original = listener;  // 方便 off 时找到原始函数
    return this.on(event, wrapper);
  }
  
  emit(event, ...args) {
    const listeners = this._events[event];
    if (!listeners) return false;
    [...listeners].forEach(fn => fn(...args));  // 拷贝防止 emit 中 off 引起的遍历问题
    return true;
  }
  
  off(event, listener) {
    const listeners = this._events[event];
    if (!listeners) return this;
    this._events[event] = listeners.filter(
      fn => fn !== listener && fn._original !== listener
    );
    return this;
  }
  
  removeAllListeners(event) {
    if (event) delete this._events[event];
    else this._events = Object.create(null);
    return this;
  }
}
```

**内存泄漏场景**：
1. `on` 注册监听但从不 `off`（组件销毁后监听器仍在，持有组件引用）
2. `once` 的 wrapper 函数 closure 持有外部对象引用
3. 循环引用：A listen B，B listen A

**防止内存泄漏**：
- 组件卸载时（React `useEffect` return，Vue `onUnmounted`）一定 `off` 已注册的监听
- 使用 `once` 代替 `on`（自动移除）
- 设置 `maxListeners` 上限（Node.js 默认 10）
- 使用 WeakRef 持有对象（允许 GC 回收）

**考察点**：
1. `once` 的 wrapper 实现和 `off` 时的匹配问题
2. `emit` 时遍历拷贝防止 listener 修改数组
3. `Object.create(null)` vs `{}`（避免 toString 等原型属性冲突）

**示例答案**：
EventEmitter 的核心是用 `_events` 对象存储事件名到监听器数组的映射。关键细节：用 `Object.create(null)` 而非 `{}` 存储，防止事件名叫 `toString` / `hasOwnProperty` 时与原型方法冲突；`once` 的实现要用 wrapper 函数包裹原始 listener，执行后自动调用 `off` 移除，同时在 wrapper 上存 `_original` 引用，方便用户用原始函数调用 `off`；`emit` 时要先拷贝 listeners 数组再遍历，防止 listener 里调用 `off` 修改原数组导致遍历跳过某些 listener。内存泄漏是实际开发中的大坑，React 里在 useEffect 的 return 函数里取消所有订阅，Vue 里在 onUnmounted 里清理，这是团队规范里必须强制的。`maxListeners` 警告是个很好的早期信号，超过阈值说明可能有重复注册的 bug。

---

<a id="q42"></a>

### Q42: 字节 面试：实现 `deepClone`，处理循环引用和特殊类型

**🏢 高频公司**：字节（必考）、腾讯

**题目解析**：
深拷贝是字节前端必考题，考察候选人对 JavaScript 数据结构的全面掌握。

**题目讲解**：

```javascript
function deepClone(target, map = new WeakMap()) {
  // 基本类型和 null 直接返回
  if (target === null || typeof target !== 'object') return target;
  
  // 处理循环引用
  if (map.has(target)) return map.get(target);
  
  // 特殊类型处理
  if (target instanceof Date) return new Date(target.valueOf());
  if (target instanceof RegExp) return new RegExp(target.source, target.flags);
  if (target instanceof Map) {
    const clone = new Map();
    map.set(target, clone);
    target.forEach((val, key) => clone.set(deepClone(key, map), deepClone(val, map)));
    return clone;
  }
  if (target instanceof Set) {
    const clone = new Set();
    map.set(target, clone);
    target.forEach(val => clone.add(deepClone(val, map)));
    return clone;
  }
  
  // 普通对象和数组
  const clone = Array.isArray(target) ? [] : Object.create(Object.getPrototypeOf(target));
  map.set(target, clone);  // 先存，再递归（处理循环引用）
  
  // 处理 Symbol key
  [...Object.keys(target), ...Object.getOwnPropertySymbols(target)].forEach(key => {
    clone[key] = deepClone(target[key], map);
  });
  
  return clone;
}
```

**常见遗漏**：
- 循环引用（WeakMap 记录已拷贝对象）
- Date、RegExp（需要特殊构造）
- Map、Set（forEach 递归）
- Symbol 类型的属性键
- 对象的原型（`Object.create(Object.getPrototypeOf(target))` 保留原型链）
- 函数（通常不深拷贝，直接返回引用）

**考察点**：
1. WeakMap 而非 Map（避免内存泄漏，GC 可以回收 key）
2. 先 `map.set` 再递归（防止循环引用无限递归）
3. `Object.getOwnPropertySymbols` 处理 Symbol key

**示例答案**：
深拷贝的几个关键点：第一，用 WeakMap 记录已拷贝的对象，遇到已拷贝的直接返回，解决循环引用；要先 `map.set(target, clone)` 再递归子属性，不然循环引用时会先递归而不是先记录，仍然死循环。第二，特殊类型单独处理：Date 用 `new Date(target.valueOf())`，RegExp 用 `new RegExp(source, flags)`，Map 和 Set 要 forEach 递归键值。第三，保留原型链：用 `Object.create(Object.getPrototypeOf(target))` 创建 clone，而非 `{}`，这样克隆出来的对象 instanceof 关系不会丢失。第四，Symbol 属性键：`Object.keys` 不包含 Symbol，需要另外用 `Object.getOwnPropertySymbols`。函数通常不深拷贝，直接引用原函数（函数一般是无副作用的）。

---

## 浏览器与实时通信

---

<a id="q43"></a>

### Q43: 腾讯 面试：浏览器的渲染进程有哪些线程？它们是如何协作的？

**🏢 高频公司**：腾讯（高频）、字节

**题目解析**：
浏览器多线程架构是腾讯前端面试的高频考察点，理解它有助于解释很多性能问题。

**题目讲解**：
**浏览器进程架构（多进程）**：
- **浏览器主进程**：UI 显示、用户交互、子进程管理
- **渲染进程（每 Tab 一个）**：网页解析、渲染（沙箱隔离）
- **GPU 进程**：GPU 加速渲染
- **网络进程**：网络请求
- **插件进程**：第三方插件隔离

**渲染进程中的线程**：
1. **主线程（JS 引擎 + DOM + CSS）**：
   - 解析 HTML/CSS，执行 JS，布局（Layout），绘制（Paint）
   - Event Loop 在这里运行
2. **合成线程（Compositor Thread）**：
   - 负责合成各个图层，生成最终帧
   - 处理 `transform` 和 `opacity` 动画（不需要通知主线程）
   - 处理滚动（某些情况下）
3. **Raster 线程（光栅化线程池）**：
   - 把绘制指令转为像素（位图）
   - 通常有多个线程并行工作
4. **I/O 线程**：
   - 处理进程间通信

**JS 为什么阻塞渲染**：
JS 在主线程上执行，主线程同时负责解析 HTML 和渲染。JS 执行时，主线程无法做解析和布局，所以 `<script>` 标签会阻塞 HTML 解析（也叫"Parser Blocking"）。

**为什么 transform 动画不卡顿**：
- `transform/opacity` 变化只需要合成线程重新合成图层，完全不涉及主线程
- 即使主线程被 JS 阻塞，合成线程仍然能正常运行，动画不卡顿
- 这是为什么 CSS 动画优于 JS 动画（JS setInterval 动画在主线程）

**考察点**：
1. 主线程 vs 合成线程的工作分配
2. 为什么 will-change/transform 可以提升到独立图层
3. 合成器动画（Compositor Animation）的性能优势

**示例答案**：
浏览器渲染进程里有几个关键线程协作完成渲染。主线程负责最繁重的工作：解析 HTML 建 DOM、解析 CSS 建 CSSOM、执行 JS、Layout 计算几何、Paint 生成绘制命令。合成线程（Compositor）负责最终的帧输出：拿到各图层的位图后合成，发给 GPU 显示，关键是它独立于主线程，可以直接处理 `transform` 和 `opacity` 变化（这两个属性的动画完全在合成线程，不经过主线程）。Raster 线程池把 Paint 的绘制命令转成实际像素，通常是多核并行。这个架构解释了很多性能现象：为什么 CSS transform 动画不被 JS 阻塞（合成线程独立运行）；为什么 `will-change: transform` 可以提前创建独立合成层（提升后主线程的变化只影响这一层，不引起大面积重绘）；为什么滚动性能好（合成线程处理，不过主线程）。

---

<a id="q44"></a>

### Q44: 腾讯 面试：WebSocket 和 HTTP Long Polling 的区别？如何实现断线重连？

**🏢 高频公司**：腾讯（即时通讯场景必考）、字节

**题目解析**：
腾讯有大量 IM（微信/QQ）相关业务，WebSocket 是核心基础知识。

**题目讲解**：
**HTTP Long Polling（长轮询）**：
- 客户端发送 HTTP 请求，服务端 hold 住连接不立刻返回
- 有消息时返回，客户端立刻发下一次请求
- **缺点**：频繁建连（TCP 三次握手 × N），服务端维护大量挂起连接，延迟较高

**SSE（Server-Sent Events）**：
- 持久 HTTP 连接，服务端单向推送（text/event-stream）
- 自动重连（浏览器原生支持）
- 只支持文本，不支持二进制

**WebSocket**：
- HTTP Upgrade 握手建立持久 TCP 双工连接
- 二进制或文本均支持，延迟最低
- 不受同源策略限制（有 Origin 头，服务端自己验证）
- 没有 HTTP 请求/响应的开销

**断线重连实现**：
```javascript
class ReconnectingWebSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.maxRetries = options.maxRetries ?? Infinity;
    this.baseDelay = options.baseDelay ?? 1000;
    this.retryCount = 0;
    this.listeners = {};
    this.connect();
  }
  
  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = (e) => {
      this.retryCount = 0;  // 连接成功，重置计数
      this.emit('open', e);
    };
    
    this.ws.onmessage = (e) => this.emit('message', e);
    this.ws.onerror = (e) => this.emit('error', e);
    
    this.ws.onclose = (e) => {
      this.emit('close', e);
      if (!e.wasClean && this.retryCount < this.maxRetries) {
        const delay = Math.min(
          this.baseDelay * Math.pow(2, this.retryCount),  // 指数退避
          30000  // 最大 30s
        );
        this.retryCount++;
        setTimeout(() => this.connect(), delay);
      }
    };
  }
  
  send(data) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }
  
  on(event, handler) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  }
  
  emit(event, data) {
    this.listeners[event]?.forEach(fn => fn(data));
  }
  
  close() {
    this.maxRetries = 0;  // 禁止重连
    this.ws.close();
  }
}
```

**心跳机制**：
```javascript
// 定时发送心跳，检测连接存活
startHeartbeat() {
  this.heartbeatTimer = setInterval(() => {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.send(JSON.stringify({ type: 'ping' }));
    }
  }, 30000);
}
```

**考察点**：
1. WebSocket 握手过程（HTTP Upgrade 请求的 Sec-WebSocket-Key）
2. 指数退避防止重连风暴
3. 心跳机制检测无声断线

**示例答案**：
WebSocket 用一次 HTTP Upgrade 握手把 HTTP 连接升级为持久双工 TCP 连接，此后数据帧直接在连接上发，没有 HTTP 头开销，延迟最低、性能最好，适合实时 IM、协作工具。Long Polling 每次请求都是完整的 HTTP，虽然服务端延迟返回减少了请求次数，但每次连接建立/关闭仍有开销，服务端也要维护大量挂起连接。断线重连的关键是指数退避：第一次重连等 1s，第二次 2s，第三次 4s……最长不超过 30s，防止网络抖动时大量客户端同时重连打垮服务器。还需要心跳机制处理"无声断线"（NAT/防火墙超时切断连接但没发 RST 包），每 30s 发 ping，服务端回 pong，超时没收到则主动关闭触发重连。重连成功后要把 retryCount 归零，从头开始退避计数。

---

## 页面布局与资源展示

---

<a id="q45"></a>

### Q45: 小红书 面试：CSS 实现一个瀑布流（Masonry）布局，有哪些方案？

**🏢 高频公司**：小红书（产品特色）、Instagram 类应用

**题目解析**：
瀑布流是小红书的核心 UI 模式，是小红书前端面试的标志性题目。

**题目讲解**：
**方案一：CSS Multi-Column**（最简单，但无法精确控制列）：
```css
.masonry {
  column-count: 2;
  column-gap: 12px;
}
.masonry-item {
  break-inside: avoid;  /* 防止卡片被断开 */
  margin-bottom: 12px;
}
```
- 优点：纯 CSS，零 JS
- 缺点：列顺序是从上到下排（先填第一列，再第二列），不是从左到右按时间序

**方案二：CSS Grid（现代方案）**：
```css
.masonry {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: masonry;  /* CSS Masonry 草案，Chrome flag 需开启 */
  gap: 12px;
}
```
- CSS Masonry 是 W3C 草案，部分浏览器实验性支持

**方案三：JS 计算列高（生产主流）**：
```javascript
function masonry(items, columns = 2, gap = 12) {
  const colHeights = new Array(columns).fill(0);
  const positions = [];
  
  items.forEach(item => {
    // 找当前最矮的列
    const minCol = colHeights.indexOf(Math.min(...colHeights));
    const colWidth = (containerWidth - gap * (columns - 1)) / columns;
    
    positions.push({
      left: minCol * (colWidth + gap),
      top: colHeights[minCol],
      width: colWidth
    });
    
    colHeights[minCol] += item.height + gap;
  });
  
  return positions;
}
```
- 优点：精确控制，支持从左到右排序
- 缺点：需要预知图片高度（或加载后重算）

**方案四：Flexbox（伪瀑布流）**：
- 多列 Flex，每列单独一个 div，按列分配数据
- 缺点：需要后端或前端提前分配数据到各列

**生产实践（小红书方案）**：
- JS 算法 + 虚拟列表组合：只渲染可视区域的卡片
- 图片懒加载 + placeholder（先占位，加载后渐现）
- IntersectionObserver 触发懒加载

**考察点**：
1. Multi-Column 的排列顺序问题（列序 vs 行序）
2. 图片高度预知问题（需要服务端返回图片宽高）
3. 瀑布流 + 虚拟列表的结合

**示例答案**：
小红书的瀑布流生产方案是 JS 计算 + 绝对定位。核心算法：维护每列的当前高度，每来一张卡片放入最矮的列，这样各列高度趋于均衡。图片高度问题是关键难点：如果等图片加载后才知道高度，会有明显的布局抖动（图片加载时卡片突然变高，后续卡片全部移位）。解决方案是服务端在图片 URL 里返回宽高信息（或单独字段），前端用固定宽度 + 服务端高度计算宽高比，用 `padding-bottom: 56.25%` 等技巧预先占位，图片加载后直接填入占位容器，用户不感知 layout shift。虚拟列表是必须的（首页可能有几千条内容），按列分别维护虚拟滚动状态，只渲染可视区域上下各一屏的卡片。CSS Multi-column 方案虽然最简单，但排列顺序是按列（第一列从上到下，再第二列），不是时间顺序，不符合信息流场景。

---

<a id="q46"></a>

### Q46: 小红书 面试：如何实现图片的渐进加载和懒加载？Blurhash 是什么？

**🏢 高频公司**：小红书、Instagram 类图片应用

**题目解析**：
图片加载体验是内容型产品的核心用户体验，考察候选人的图片性能工程能力。

**题目讲解**：

**渐进加载策略**：
1. **缩略图 → 原图（LQIP: Low Quality Image Placeholder）**：
   ```html
   <img src="thumbnail.jpg" data-src="full.jpg" class="lazy-img">
   ```
   先显示低质量模糊图，用 IntersectionObserver 触发加载原图

2. **Blurhash（字节/Facebook 方案）**：
   - 把图片编码为 30-40 字节的字符串（比 LQIP thumbnail 小 100 倍）
   - 服务端计算，前端用 JS 解码渲染为 Canvas 模糊占位图
   - 加载体验极好，首屏几乎无白块
   ```javascript
   import { decode } from 'blurhash';
   
   function renderBlurhash(hash, width, height, canvas) {
     const pixels = decode(hash, width, height);
     const ctx = canvas.getContext('2d');
     const imageData = ctx.createImageData(width, height);
     imageData.data.set(pixels);
     ctx.putImageData(imageData, 0, 0);
   }
   ```

3. **Progressive JPEG**：
   - JPEG 的一种编码格式，先显示低质量全图，逐渐清晰
   - 不需要额外代码，浏览器原生支持

4. **WebP / AVIF 格式**：
   - WebP 比 JPEG 小 25-35%，AVIF 更小（小 50%+），加载更快
   - 用 `<picture>` 标签按浏览器支持降级

**完整实现**：
```javascript
// IntersectionObserver 懒加载 + 原图加载完成后淡入
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const img = entry.target;
    const fullSrc = img.dataset.src;
    
    const fullImg = new Image();
    fullImg.onload = () => {
      img.src = fullSrc;
      img.classList.add('loaded');  // 触发 CSS 淡入动画
    };
    fullImg.src = fullSrc;
    observer.unobserve(img);  // 加载后停止观察
  });
}, { rootMargin: '200px' });  // 提前 200px 开始加载
```

**考察点**：
1. Blurhash 的数据大小优势（vs LQIP）
2. rootMargin 的预加载距离设置
3. 加载完成后的 CSS transition 淡入体验

**示例答案**：
图片懒加载 + 占位的完整方案：先在图片位置用占位元素（颜色块或 Blurhash 解码的模糊图）保持布局稳定，IntersectionObserver 检测到图片进入视口提前 200px 时开始加载，加载完成后用 CSS transition opacity 0→1 淡入，避免图片突然出现的突兀感。Blurhash 是现在最优雅的占位方案：服务端在上传图片时计算 Blurhash 字符串（通常 30 字节左右），存在数据库里，接口返回图片信息时一并返回；前端拿到 hash 后解码渲染到 Canvas，得到对应的模糊版本，与原图尺寸一致，加载体验极好。相比 LQIP（发一张额外的低质量缩略图请求），Blurhash 不需要额外 HTTP 请求，直接从数据库的字段里得到，性能更好。格式选择上，AVIF 体积最小但解码稍慢，WebP 兼顾质量和兼容性，用 `<picture>` 标签做降级：AVIF → WebP → JPEG，浏览器自动选择支持的最优格式。

---

<a id="q47"></a>

### Q47: 小红书 面试：移动端 1px 问题是什么？有哪些解决方案？

**🏢 高频公司**：小红书、腾讯、字节

**题目解析**：
移动端 1px 是 H5 开发的经典问题，考察候选人对设备像素比的理解。

**题目讲解**：
**问题原因**：
- 移动设备 DPR（Device Pixel Ratio，设备像素比）通常为 2 或 3
- DPR=2 时，CSS 的 1px = 设备的 2 个物理像素，视觉上显示为 2px 粗
- 设计稿要求的"1px 细线"在高清屏上无法用 CSS 1px 实现

**解决方案**：

**方案一：viewport 缩放（最彻底）**：
```javascript
const dpr = window.devicePixelRatio;
const meta = document.querySelector('meta[name="viewport"]');
meta.content = `width=device-width, initial-scale=${1/dpr}, 
                maximum-scale=${1/dpr}, minimum-scale=${1/dpr}`;
```
- 整体缩放后，CSS 1px = 1 物理像素
- 问题：整个页面等比缩放，字体/图标也会变小，需要整体调整

**方案二：transform: scaleY(0.5)**（最常用）：
```css
.border-1px {
  position: relative;
}
.border-1px::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background: #ddd;
  transform: scaleY(0.5);    /* DPR=2 用 0.5，DPR=3 用 0.333 */
  transform-origin: bottom;
}
```
```javascript
// 根据 DPR 动态设置
const scale = 1 / window.devicePixelRatio;
el.style.transform = `scaleY(${scale})`;
```

**方案三：box-shadow（无伪元素占用）**：
```css
.border-shadow {
  box-shadow: 0 1px 0 0 #ddd;  /* 底边 */
}
```

**方案四：border-image + SVG**：
用 1x2 或 2x2 的 SVG 作为边框图片，顶部透明底部有颜色

**方案五：PostCSS 自动转换**：
- `postcss-write-svg` 插件自动处理

**最佳实践**：
Sass/Less mixin 封装 transform 方案，按 DPR 自动适配：
```scss
@mixin hairline-bottom($color: #ddd) {
  position: relative;
  &::after {
    content: '';
    position: absolute;
    left: 0; bottom: 0;
    width: 100%; height: 1px;
    background: $color;
    @media (-webkit-min-device-pixel-ratio: 2) {
      transform: scaleY(0.5);
    }
    @media (-webkit-min-device-pixel-ratio: 3) {
      transform: scaleY(0.333);
    }
  }
}
```

**考察点**：
1. DPR 的概念和计算
2. `transform: scale` 不影响布局（不会撑开空间）
3. 4 周边框的 scale 方案（`transform: scale(0.5); width: 200%; height: 200%; transform-origin: 0 0;`）

**示例答案**：
1px 问题的根源是 DPR：iPhone 的 DPR 为 2 或 3，CSS 1px 实际渲染成 2 或 3 个物理像素，视觉上比设计稿厚。最常用的方案是伪元素 + `transform: scaleY(0.5)`：在元素上用 `::after` 画一条高 1px 的线，然后缩放为 0.5，物理上就是 0.5 CSS px = 1 物理像素。transform 缩放不影响文档流（不撑开空间），是最无副作用的方案。实际项目用 SCSS mixin 封装，用媒体查询按 DPR 自动选择缩放比（0.5 或 0.333），调用时 `@include hairline-bottom()` 一行搞定所有边框。如果需要四边边框，稍微复杂些：把伪元素做成 200% × 200% 然后整体缩放 0.5，`transform-origin: 0 0` 保证从左上角缩放。postcss-hairlines 等插件可以自动处理，不用每次手写。

---

## 服务端渲染与缓存

---

<a id="q48"></a>

### Q48: 阿里 面试：Next.js 的 SSR、SSG、ISR 有什么区别？各自适用什么场景？

**🏢 高频公司**：阿里、字节（有大量 Next.js 项目）

**题目解析**：
Next.js 是现代全栈 React 框架，SSR/SSG/ISR 的区别是面试高频题，考察候选人对渲染策略的理解。

**题目讲解**：

| 渲染方式 | 时机 | 适用场景 | 数据新鲜度 |
|---------|------|---------|----------|
| CSR（Client Side Rendering）| 浏览器实时 | 后台管理、用户专属页 | 实时 |
| SSR（Server Side Rendering）| 请求时服务端实时渲染 | 个性化内容、实时数据 | 实时 |
| SSG（Static Site Generation）| 构建时生成 | 博客、文档、营销页 | 构建时快照 |
| ISR（Incremental Static Regeneration）| 构建+按需重生成 | 电商商品页、新闻 | 定时或按需更新 |

**SSR（`getServerSideProps`）**：
```javascript
export async function getServerSideProps(context) {
  const { id } = context.params;
  const data = await fetchUser(id);  // 每次请求都执行
  return { props: { data } };
}
```
- 每个请求都服务端执行，数据最新
- TTFB 较高（需要等服务端数据请求完成）
- SEO 友好

**SSG（`getStaticProps`）**：
```javascript
export async function getStaticProps() {
  const posts = await fetchPosts();  // 只在构建时执行一次
  return { props: { posts } };
}
```
- 构建时生成静态 HTML，CDN 缓存，极快
- 数据是构建时快照，适合不频繁变化的内容

**ISR（`revalidate` 参数）**：
```javascript
export async function getStaticProps() {
  const data = await fetchData();
  return {
    props: { data },
    revalidate: 60  // 60 秒后下次请求触发重新生成
  };
}
```
- Stale-While-Revalidate：先返回旧缓存，后台重新生成
- 兼顾性能（静态）和数据新鲜度

**App Router（Next.js 13+）**：
- React Server Components 默认 SSR
- `fetch` 自带缓存和 revalidate 语义
- `cache: 'no-store'`（动态）vs `next: { revalidate: 60 }`（ISR）

**考察点**：
1. ISR 的"陈旧同时重新验证"语义（类似 HTTP stale-while-revalidate）
2. 混合策略：同一个应用不同页面用不同渲染方式
3. App Router vs Pages Router 的差异

**示例答案**：
SSR、SSG、ISR 的本质是"数据获取在什么时候执行"。SSR 每次请求执行，适合内容和用户强相关（登录态、个性化推荐）；SSG 只在构建时执行，适合内容几乎不变（文档、博客），CDN 直接缓存，性能极好；ISR 是 SSG 的增强，加了定时重新生成（`revalidate: 60` 表示 60 秒后下次请求会触发后台重新生成），返回给用户的是旧版本（不阻塞），后台更新完成后的新请求才拿到新内容，是"Stale While Revalidate"语义，非常适合电商商品页（价格/库存可以接受几十秒延迟）。实际项目里经常混用：营销首页 SSG（全静态）、商品详情 ISR（revalidate: 30）、用户购物车 SSR（实时）。Next.js 13+ App Router 里这些变成 fetch 的参数，`cache: 'force-cache'` 相当于 SSG，`next: {revalidate: 60}` 相当于 ISR，`cache: 'no-store'` 相当于 SSR，更细粒度。

---

*本页包含 12 题（Q37-Q48）。题号与主题不代表面经来源；逐题核验范围以[来源核验清单](../SOURCE_AUDIT.md)为准。*

---

<!-- navigation:start -->
[↑ 回到本页题目目录](#question-index) · [返回前端目录](README.md)
<!-- navigation:end -->
