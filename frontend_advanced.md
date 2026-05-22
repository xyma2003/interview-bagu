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

### Q28: XSS 和 CSRF 攻击的原理是什么？如何防御？

**题目解析**：Web 安全是前端工程师必须掌握的知识，也是面试的高频考察点。

**题目讲解**：
**XSS（Cross-Site Scripting，跨站脚本）**：
攻击者在页面注入恶意脚本，在受害者浏览器上执行，窃取 Cookie/Session 或做其他恶意操作。

三种类型：
1. **存储型 XSS**：恶意脚本存储在服务器（数据库），每次有人访问该页面都会执行
2. **反射型 XSS**：恶意脚本在 URL 参数里，服务端反射到响应页面
3. **DOM型 XSS**：前端 JavaScript 把不可信数据插入 DOM（innerHTML/document.write）

**XSS 防御**：
- **输入验证 + 输出转义**：所有用户输入在显示时转义 HTML 特殊字符（`<` → `&lt;`）
- **CSP（Content Security Policy）**：HTTP 头设置 `Content-Security-Policy: script-src 'self'`，禁止内联 script 和非同源脚本
- **HttpOnly Cookie**：阻止 JS 访问 Cookie（`document.cookie` 读不到）
- **避免 innerHTML**：用 `textContent` 代替，或用 DOMPurify 净化 HTML

**CSRF（Cross-Site Request Forgery，跨站请求伪造）**：
攻击者诱导受害者访问恶意页面，该页面自动向目标站点发送带有受害者凭证（Cookie）的请求。

**CSRF 防御**：
- **CSRF Token**：服务端生成随机 token 嵌入表单，请求时校验（攻击者无法获取这个 token）
- **SameSite Cookie**：`Set-Cookie: token=xxx; SameSite=Strict/Lax`，跨站请求不携带 Cookie
- **双重 Cookie**：读 Cookie 中的 token 并在请求 Header 中携带，服务端校验二者一致（CSRF 攻击无法读 Cookie 但能携带）
- **Referer 校验**：验证请求来源域名（不够可靠，可被伪造或被用户隐藏）

**考察点**：
1. HttpOnly 防 XSS 盗 Cookie，SameSite 防 CSRF 的机制
2. CSP 的配置和绕过方式
3. React/Vue 的自动转义（JSX 表达式自动转义，防存储型 XSS）

**示例答案**：
XSS 的本质是"把数据当代码执行"——攻击者在用户输入里藏 `<script>`，如果服务端不转义直接渲染，就会在所有访问者浏览器上执行恶意脚本。防御核心是输出时转义：把用户数据展示到 HTML 时，将 `<>&'"` 转义为 HTML 实体；React/Vue 的模板/JSX 默认做这个转义，所以现代框架大幅减少了 XSS 风险，但 `dangerouslySetInnerHTML` 和 `v-html` 会绕过，要谨慎。CSP 是纵深防御，即使有注入点，脚本因为 CSP 策略而被浏览器拒绝执行。CSRF 利用的是浏览器的自动 Cookie 携带行为：你登录了银行网站，恶意页面里的表单提交就会自动带上你的 Cookie。SameSite=Strict/Lax 是最简单的现代防御：浏览器不在跨站请求里携带这类 Cookie。CSRF Token 是传统方案，后端生成唯一 token 嵌入表单，攻击者的页面无法读取这个 token（同源策略），所以伪造的请求缺少这个 token 会被拒绝。

---

### Q29: 什么是 Content Security Policy（CSP）？如何配置？

**题目解析**：CSP 是现代 Web 安全的重要机制，考察候选人对安全头的实践经验。

**题目讲解**：
**CSP 是什么**：
通过 HTTP 响应头或 `<meta>` 标签，声明页面允许加载哪些来源的资源（脚本、样式、图片、字体等），浏览器强制执行该策略。

**常用指令**：
```
Content-Security-Policy:
  default-src 'self';                        # 默认只允许同源资源
  script-src 'self' 'nonce-abc123' cdn.com;  # 脚本：同源 + nonce + 特定CDN
  style-src 'self' 'unsafe-inline';          # 样式：同源 + 允许内联
  img-src *;                                  # 图片：允许所有来源
  connect-src 'self' api.example.com;        # AJAX/WebSocket
  frame-ancestors 'none';                    # 禁止被 iframe 嵌入（防 Clickjacking）
  report-uri /csp-report;                    # 违规时上报到该地址
```

**nonce 的使用**：
为每次请求生成随机 nonce，内联 script 标签上加 `nonce="abc123"`，CSP 只允许带对应 nonce 的内联脚本执行，绕过了"禁止所有内联脚本"的限制同时保持安全。

**Report-Only 模式**：
`Content-Security-Policy-Report-Only`：先不强制执行，只上报违规，用于测试和逐步迁移。

**CSP 对 XSS 的减缓**：
即使有 XSS 注入点，`script-src 'self'` 可以阻止攻击者注入的内联脚本或外部脚本执行。

**考察点**：
1. nonce vs hash 两种内联脚本白名单方式
2. 'unsafe-inline' 和 'unsafe-eval' 的代价
3. CSP Level 2 vs Level 3 的区别

**示例答案**：
CSP 通过白名单声明页面的资源加载策略，浏览器只允许来自白名单的资源加载执行，是 XSS 的重要纵深防御层。配置时从严开始：`default-src 'self'` 只允许同源资源，然后按需添加例外（CDN 域名、谷歌字体等）。`script-src 'unsafe-inline'` 和 `'unsafe-eval'` 会显著削弱 CSP 对 XSS 的防护，要尽量避免；如果有内联 script 需要，用 nonce 方案（每次请求服务端生成随机 nonce，注入到 script 标签和 CSP 头里，只有 nonce 匹配的内联脚本才允许执行）。上线前先用 `Content-Security-Policy-Report-Only` + `report-uri` 收集 2 周的违规报告，看清楚哪些资源被阻断，调整白名单后再切换为强制模式，避免把第三方资源也拦截了。`frame-ancestors 'none'` 防止页面被 iframe 嵌入（点击劫持），相当于老的 `X-Frame-Options: DENY`。

---

## 十二、React 进阶

---

### Q30: React 18 有哪些新特性？Concurrent Mode 的核心改变是什么？

**题目解析**：React 18 是 React 的重大升级，考察候选人对最新框架变化的跟进。

**题目讲解**：
**React 18 主要新特性**：

1. **Automatic Batching（自动批处理）**：
   - React 17：只在 React 事件处理函数中批量更新 setState，setTimeout/Promise 里的 setState 不批处理
   - React 18：所有来源的 setState 都自动批处理（减少重渲染）
   - 如需退出：用 `flushSync(() => setState(...))`

2. **Transitions（过渡更新）**：
   - `startTransition(() => setSearchResults(...))`：将更新标记为"非紧急"
   - `useTransition()` Hook：`const [isPending, startTransition] = useTransition()`
   - `useDeferredValue(value)`：延迟值的更新，类似 debounce 但自动感知系统繁忙度

3. **Concurrent Features（并发特性）**：
   - `<Suspense>` 正式支持数据请求（React Server Components）
   - `useSyncExternalStore`：替代外部状态管理库的 `subscribe` 模式
   - `useId()`：生成稳定的唯一 ID（SSR 水合时 server 和 client 保持一致）

4. **React Server Components（RSC）**（主要在 Next.js 13+ 使用）：
   - 在服务器上渲染、不发送到客户端的组件（无 hydration）
   - 可以直接访问数据库/文件系统
   - bundle 大小减小（组件代码不在客户端）

**新的 Root API**：
```javascript
// React 17
ReactDOM.render(<App />, container);
// React 18
const root = ReactDOM.createRoot(container);
root.render(<App />);
```

**考察点**：
1. Automatic Batching 的收益（减少多次 setState 触发的重渲染）
2. startTransition vs setTimeout 的区别（前者让 React 知道这是低优先级）
3. React Server Components 的使用场景和限制

**示例答案**：
React 18 最重要的变化是把 Concurrent Mode 从可选变成默认——只要用 `createRoot` 初始化，所有并发特性就都可用。Automatic Batching 是立即可感知的收益：之前在 setTimeout 里连续 setState 3 次会触发 3 次渲染，18 里自动合并为 1 次。Transitions 是大改进：`startTransition` 告诉 React 这个更新是"非紧急的"，React 可以中断它去处理用户输入（如打字），让 UI 始终流畅。实践上，搜索框的结果列表更新用 `startTransition` 包裹，即使过滤计算量大，输入框也不会有卡顿感。`useDeferredValue` 则是对值的 memo 化——新值先渲染旧值（不阻塞），等 React 有空再渲染新值，适合"输入→渲染大量列表"的场景。React Server Components 在 Next.js 13+ 的 App Router 里是核心特性，服务端组件直接查数据库、不打包进 client bundle，大幅减小首屏 JS 体积，这是前后端融合的重要一步。

---

