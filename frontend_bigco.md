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

