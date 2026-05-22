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

### Q26: WeakMap 和 WeakSet 的应用场景是什么？为什么它们的键只能是对象？

**题目解析**：WeakMap/WeakSet 是 JavaScript 内存管理的利器，考察候选人对 GC 机制的理解。

**题目讲解**：
**WeakMap 特性**：
- 键必须是对象（不是原始值），值可以是任意类型
- 弱引用：如果键对象没有其他引用，GC 可以回收它（WeakMap 中的条目也随之消失）
- 不可枚举（无 size / keys() / values() / forEach()），无法迭代
- 因为不阻止 GC，不会造成内存泄漏

**为什么键只能是对象**：
WeakMap 的"弱"体现在对键的弱引用，GC 通过引用计数来判断是否回收，原始值（字符串/数字）本身不是引用对象，无法建立"弱引用"语义。

**WeakSet 特性**：
- 存储的值只能是对象
- 弱引用集合，对象无其他引用时自动清除

**实际应用**：
1. **私有数据存储**（Class 私有字段的早期模式）：
   ```javascript
   const privateData = new WeakMap();
   class User {
     constructor(id) { privateData.set(this, { id }); }
     getId() { return privateData.get(this).id; }
   }
   // User 实例被 GC 时，privateData 里的对应条目自动消失
   ```
2. **对象元数据缓存**：给 DOM 元素附加额外数据，元素被移除时自动清理
3. **防止内存泄漏**：事件监听器的弱引用管理
4. **标记已处理对象**（WeakSet）：防止无限递归或重复处理

**考察点**：
1. 弱引用 vs 强引用对 GC 的影响
2. WeakRef API（ES2021）：显式弱引用
3. 与 Map/Set 的使用场景对比

**示例答案**：
WeakMap 解决了"给对象附加额外数据，但不阻止 GC 回收该对象"的需求。普通 Map 作为键的对象即使不再被业务代码引用，只要还在 Map 里就不会被 GC 回收，会造成内存泄漏。WeakMap 的键是弱引用，一旦键对象的引用计数归零（无其他引用），GC 可以直接回收它，WeakMap 里对应的条目也随之消失，完全自动。典型场景是 DOM 节点的附加状态：把 DOM 节点作为键，附加处理结果作为值存入 WeakMap，DOM 节点从页面移除后（引用断开），WeakMap 里的缓存自动清理，不用手动维护。WeakSet 用来标记"已处理的对象"，比如深拷贝时用 WeakSet 记录已遍历的对象防止循环引用无限递归，拷贝完成后 WeakSet 里的引用不阻止任何 GC。键只能是对象是因为原始值没有引用语义，无法建立弱引用关系。

---

### Q27: Proxy 和 Reflect 的关系是什么？有哪些实际应用场景？

**题目解析**：Proxy 是 ES6 最强大的元编程特性，也是 Vue 3 响应式的底层，考察候选人的 JavaScript 高级能力。

**题目讲解**：
**Proxy**：
```javascript
const proxy = new Proxy(target, handler);
// handler 是一组陷阱（trap）的集合：get/set/has/deleteProperty/apply/construct等
```

**Reflect**：
- 与 Proxy handler 的 trap 一一对应的方法集合
- 提供了执行"默认行为"的标准方式
- 在 Proxy trap 里调用 `Reflect.xxx` 执行默认操作，避免手写底层行为

```javascript
const handler = {
  set(target, key, value, receiver) {
    console.log(`设置 ${key} = ${value}`);
    return Reflect.set(target, key, value, receiver); // 执行默认 set 行为
  }
};
```

**实际应用**：
1. **Vue 3 响应式**：拦截 get/set，自动依赖收集和触发更新
2. **数据验证**：在 set 陷阱里校验值类型
3. **负索引数组**：拦截 get，支持 `arr[-1]` 访问最后一个元素
4. **只读对象**：在 set/deleteProperty 陷阱里抛出错误
5. **函数调用追踪（apply trap）**：记录函数调用次数和参数（mock/测试工具）
6. **虚拟对象（has trap）**：动态报告属性是否存在

**考察点**：
1. Proxy 与 Object.defineProperty 的区别（Proxy 代理整个对象，后者代理单个属性）
2. Reflect 的 receiver 参数（保持 this 正确性）
3. 不可代理的值（基本类型不能用 Proxy）

**示例答案**：
Proxy 和 Reflect 是配套设计的：Proxy 让你拦截对象操作，Reflect 让你在拦截里执行默认行为。在 handler 的 set trap 里如果不调用 Reflect.set（或等价的 target[key]=value），设置操作就不会真正发生。Reflect 的价值在于它接受 receiver 参数（保证 this 指向正确），比直接操作 target 更安全。Vue 3 的响应式就是用 Proxy 的 get trap 收集依赖（当前正在执行的 effect 放进 dep set），set trap 触发所有依赖的重新执行。负索引是一个有趣的 Proxy 应用：`get(target, key) { const k = Number(key); return target[k < 0 ? target.length + k : k]; }`，这样 `arr[-1]` 就能正常工作。Proxy 相比 Object.defineProperty 的核心优势是代理整个对象而非单个属性，增删属性都能感知；Object.defineProperty 必须提前枚举所有属性，Vue 2 的响应式局限就在于此。

---

## 十一、浏览器安全

---

