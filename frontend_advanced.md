# 前端面试八股 · 进阶篇

> 接续基础篇，涵盖：JavaScript高级特性 / 浏览器安全 / React进阶 / 微前端 / PWA / WebGL / 测试 / 移动端

---

## 十、JavaScript 高级特性

### Q25: Generator 函数和 Iterator 协议是什么？它们在实际中有哪些应用？

**题目解析**：Generator 是 JavaScript 异步编程的基础（async/await 的底层），考察候选人对 JS 深层机制的理解。

**题目讲解**：
**Iterator 协议**：
对象实现了 `[Symbol.iterator]()` 方法，返回一个迭代器对象（有 `next()` 方法，返回 `{value, done}`）即可迭代。

**Generator 函数**：
- `function*` 声明，`yield` 暂停执行并返回值，`next()` 恢复
- 每次调用 `next(value)` 传入的 value 会成为上一个 `yield` 表达式的返回值
- `return` 语句让 `done: true`
- Generator 对象既是迭代器又是可迭代对象

```javascript
function* range(start, end) {
  for (let i = start; i < end; i++) yield i;
}
[...range(1, 5)]  // [1, 2, 3, 4]

function* fibonacci() {
  let [a, b] = [0, 1];
  while (true) { yield a; [a, b] = [b, a + b]; }
}
```

**实际应用**：
1. **无限序列**：懒计算，只在需要时生成值（斐波那契、分页）
2. **状态机**：`yield` 天然是暂停点，可以实现协程式状态机
3. **async/await 的底层**：Babel 将 async/await 编译为 Generator + 自动执行器
4. **Redux-Saga**：用 Generator 描述副作用（更可测试、可取消）
5. **自定义迭代**：实现树的深度优先遍历等

**考察点**：
1. `next(value)` 向 Generator 传值的机制
2. `yield*` 委托给另一个迭代器
3. Generator 与 async/await 的关系

**示例答案**：
Generator 是 JavaScript 协程的实现：`function*` 内部可以 `yield` 出值并暂停，外部调用 `next()` 恢复执行。它的独特之处是 `next(value)` 可以向里传值，上一个 `yield` 表达式的返回值就是传入的 value，这实现了双向通信。async/await 在 Babel 编译后就是 Generator + 自动执行器（自动调用 next，遇到 Promise 等其解决再继续）。实际应用里最典型的是 Redux-Saga：用 `yield call(api.fetchUser)` 描述异步调用，Saga 中间件拿到 Effect 描述符后实际执行，这使得 Saga 可以不用 mock 就能测试（只需检查 yield 出了什么 Effect）。懒计算也很实用：分页场景下 `yield*` 懒加载每页数据，消费者按需迭代，不预先加载全部。

---

