# 前端面试专项 · 大厂高频题

> 来源：字节跳动 / 腾讯 / 小红书 / 阿里 真实面经整理
> 每题标注高频出现公司

---

## 字节跳动高频

### Q37: 字节 面试：实现一个 `Promise.all`，要求 all settled 和 race 版本

**🏢 高频公司**：字节（必考）、腾讯、阿里

**题目解析**：
手写 Promise 相关方法是字节前端必考题，考察候选人对 Promise 原理的深度理解和编码能力。

**题目讲解**：

**Promise.all 实现**：
```javascript
Promise.myAll = function(promises) {
  return new Promise((resolve, reject) => {
    if (!promises.length) return resolve([]);
    const results = [];
    let count = 0;
    promises.forEach((p, i) => {
      Promise.resolve(p).then(val => {
        results[i] = val;  // 保持顺序
        if (++count === promises.length) resolve(results);
      }).catch(reject);  // 任一失败立即 reject
    });
  });
};
```

**Promise.allSettled 实现**：
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

**Promise.race 实现**：
```javascript
Promise.myRace = function(promises) {
  return new Promise((resolve, reject) => {
    promises.forEach(p => Promise.resolve(p).then(resolve).catch(reject));
  });
};
```

**Promise.any 实现**：
```javascript
Promise.myAny = function(promises) {
  return new Promise((resolve, reject) => {
    let errors = [];
    let count = 0;
    promises.forEach((p, i) => {
      Promise.resolve(p)
        .then(resolve)  // 任一成功立即 resolve
        .catch(err => {
          errors[i] = err;
          if (++count === promises.length)
            reject(new AggregateError(errors, 'All promises were rejected'));
        });
    });
    if (!promises.length) reject(new AggregateError([], 'No promises'));
  });
};
```

**考察点**：
1. `results[i] = val` 而非 `results.push(val)`（保持顺序）
2. 空数组时的边界处理
3. `Promise.resolve(p)` 包裹（处理非 Promise 值）

**示例答案**：
实现 Promise.all 要注意三个关键点：一是用索引赋值而非 push 保持结果顺序；二是用 count 计数而非 results.length 判断完成（results 是稀疏数组）；三是对传入的每个值用 Promise.resolve 包裹，处理普通值和非标准 thenable。allSettled 的技巧是把每个 Promise 都转成"永不 reject 的 Promise"，成功时包装为 `{status:'fulfilled', value}`，失败时包装为 `{status:'rejected', reason}`，然后用 all 等所有完成。race 最简单，谁先完成就 resolve/reject 谁。any 是 all 的反面，任一 fulfilled 就 resolve，全部 rejected 才 reject，用 AggregateError 包含所有错误。

---

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

### Q39: 字节 面试：实现一个带取消功能的 fetch，以及请求重试机制

**🏢 高频公司**：字节（高频）、腾讯

**题目解析**：
AbortController 取消请求和指数退避重试是工程实践中的常见需求，考察候选人的异步编程能力。

**题目讲解**：

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
async function fetchWithRetry(url, options = {}, {
  maxRetries = 3,
  delay = 1000,
  backoff = 2,          // 指数退避倍数
  shouldRetry = (err) => true  // 可自定义重试条件
} = {}) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === maxRetries || !shouldRetry(err)) throw err;
      const waitTime = delay * Math.pow(backoff, attempt);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

// 使用：只对网络错误重试，不对 4xx 重试
fetchWithRetry('/api/data', {}, {
  shouldRetry: (err) => !err.message.includes('HTTP 4')
});
```

**组合：取消 + 重试**：
```javascript
async function fetchWithRetryAndCancel(url, options = {}, retryOptions = {}) {
  const controller = new AbortController();
  const promise = fetchWithRetry(url, 
    { ...options, signal: controller.signal }, 
    retryOptions
  );
  return { promise, cancel: () => controller.abort() };
}
```

**考察点**：
1. AbortController 的原理（信号传递）
2. 指数退避的意义（避免同时重试打垮服务）
3. 重试条件的设计（4xx 不重试，5xx 和网络错误重试）

**示例答案**：
fetch 取消用 AbortController：创建 controller，把 controller.signal 传给 fetch 的 options，调用 controller.abort() 时 fetch 会 reject 一个 AbortError。注意取消后要判断是 AbortError 才静默处理，其他错误正常抛出。重试实现用 for 循环 + try/catch，每次失败等待 `delay * backoff^attempt` 毫秒（指数退避），防止同时大量请求重试打垮后端。shouldRetry 回调让调用者控制重试条件：4xx 客户端错误说明请求本身有问题，重试也没用，不应该重试；5xx 和网络断开才值得重试。生产中还要加 jitter（随机偏移），避免同一时刻大量用户都在重试造成惊群效应。

---

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

