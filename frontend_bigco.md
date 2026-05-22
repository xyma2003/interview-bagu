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

