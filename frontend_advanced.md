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

### Q31: 如何实现 React 的虚拟列表（Virtual List）？Intersection Observer 和固定高度方案的区别是什么？

**题目解析**：虚拟列表是大数据量渲染的核心性能优化，考察候选人的前端性能工程能力。

**题目讲解**：
**虚拟列表原理**：
只渲染视口内可见的少量 DOM 节点（10-20个），通过 CSS 定位模拟完整列表的滚动行为，避免一次性渲染 10000 个 DOM 节点。

**固定行高虚拟列表**：
```
可见 item 数 = Math.ceil(containerHeight / itemHeight) + 缓冲区
startIndex = Math.floor(scrollTop / itemHeight)
endIndex = startIndex + 可见数量
paddingTop = startIndex * itemHeight  // 撑开上方空间
paddingBottom = (totalCount - endIndex) * itemHeight  // 撑开下方空间
```

**动态行高虚拟列表**（更复杂）：
- 用 ResizeObserver 测量每行真实高度，存储高度映射表
- 用二分查找找到 startIndex
- 需要预估高度（首次渲染），实际高度渲染后更新

**现有库**：
- `react-window`（轻量，固定行高）
- `react-virtuoso`（动态行高，功能更全）
- `@tanstack/virtual`（headless，自由定制）

**与 Intersection Observer 的区别**：
- IntersectionObserver：检测元素是否进入视口，适合"懒加载"（渐进加载 DOM）
- 虚拟列表：DOM 始终只有可见数量，不渲染不可见的节点
- 二者目标不同：IO 减少无用加载，虚拟列表减少 DOM 节点数

**考察点**：
1. 固定高度和动态高度的实现复杂度差异
2. 滚动容器的 `overflow: auto` 配合 `position: absolute` 的定位机制
3. 缓冲区（overscan）的必要性（防止快速滚动时闪烁）

**示例答案**：
虚拟列表的核心思路：用一个全高度的外层容器（`height = totalCount × itemHeight`）撑开滚动区域，内部只渲染当前可见的 item，通过 `paddingTop` 或绝对定位把可见 item 放在正确位置。监听容器的 `onScroll` 事件，根据 `scrollTop` 计算 startIndex 和 endIndex，更新渲染的子集。固定行高实现最简单，公式直接，性能好；动态行高需要维护一个高度数组，每个 item 渲染后用 ResizeObserver 测量真实高度回填，用二分查找计算 startIndex，复杂度显著提升，通常直接用 react-virtuoso 库省事。"渲染 DOM 但 visibility:hidden 隐藏"不是虚拟列表，DOM 节点数不减少，性能没有改善。IntersectionObserver 的图片懒加载是"按需初始化 DOM"，和虚拟列表的"只保留可见 DOM"思路不同但可以组合使用——虚拟列表减少 DOM 数，每个可见 item 里的图片再用 IO 懒加载。

---

### Q32: 什么是 React 的 Reconciliation 和 Diffing 算法？key 的作用是什么？

**题目解析**：Diff 算法是 React 虚拟 DOM 的核心，理解它有助于写出高性能 React 代码。

**题目讲解**：
**Reconciliation（调和）**：
React 比较新旧虚拟 DOM 树，找出最小变更集，应用到真实 DOM 的过程。

**O(N) Diff 算法（三个假设）**：
完整 Tree Diff 是 O(N³) 的，React 通过三个假设降到 O(N)：
1. **不同类型的元素**：`<div>` → `<p>` 会销毁整棵子树重新创建
2. **key 属性**：帮助 React 识别列表中的哪个元素发生了移动/新增/删除
3. **只对同层元素比较**：不做跨层移动（跨层移动视为删除 + 新建）

**key 的作用**：
- 无 key：React 按索引顺序匹配新旧元素，列表首部插入会导致所有后续元素更新
- 有稳定 key：React 通过 key 找到对应的旧节点，只更新真正变化的属性，将插入/删除隔离

**key 的选择**：
- 用数据的唯一稳定 ID（`item.id`），而非索引
- 列表不变时用索引可以（但如果列表会重排/过滤，用索引会导致 state 错位）

**Fiber 下的 Diff**：
Fiber 把 Diff 拆成可中断的任务，但 Diff 算法本质不变，只是执行方式改变。

**考察点**：
1. key=index 在动态列表中引发的 bug（组件 state 对应关系错乱）
2. 同类型元素 Diff 的属性更新细节
3. Fragment 列表时 key 的位置

**示例答案**：
React 的 Diff 算法做了三个假设来把 O(N³) 降到 O(N)：同类型才比较、只比较同层、key 用来追踪列表元素。key 的最重要作用是列表重排时帮 React 复用组件实例：没有 key 时，React 按位置比较，在列表前插入一个元素，后面所有元素都会被视为"更新"（实际只是后移了）；有稳定 key，React 识别出是"新增了一个"，后面的元素复用旧的，性能好得多。key=index 在静态列表没问题，但动态列表（删除/排序/过滤）会导致严重 bug：删除第 0 个元素，原来第 1 个元素变成位置 0，key 从 1 变成 0，React 会把"原来第 0 个"的 state 给"现在位置 0 的元素"，造成 state 对应关系错乱，特别是受控输入组件会出现输入内容乱跑的 bug。因此列表必须用数据 ID 作为 key。

---

## 十三、微前端

---

### Q33: 微前端是什么？qiankun/single-spa/Module Federation 的差异是什么？

**题目解析**：微前端是大型前端工程化的主流方案，大厂面试必考。

**题目讲解**：
**微前端解决的问题**：
- 大型单体前端难以多团队并行开发
- 技术栈升级困难（有 React 15 的遗留代码）
- 不同业务域的独立部署需求

**主要方案**：

1. **iframe**：
   - 最简单，完全隔离（CSS、JS、全局变量）
   - 缺点：URL 不同步、通信困难、性能差、样式难统一

2. **single-spa**：
   - 前端路由级别的微前端框架，统一生命周期管理
   - 各子应用注册到主应用，根据路由激活
   - 需要改造子应用，暴露 bootstrap/mount/unmount 方法
   - JS 不隔离（共享全局作用域），样式可能冲突

3. **qiankun（蚂蚁）**：
   - 基于 single-spa，增加 JS 沙箱（Proxy sandbox，Snapshot sandbox）和 CSS 隔离
   - JS 沙箱：用 Proxy 拦截子应用的全局对象操作（window.xxx），不污染主应用
   - CSS 隔离：Shadow DOM 或动态添加/移除样式表
   - 开箱即用，国内最流行

4. **Module Federation（Webpack 5）**：
   - 不是运行时路由微前端，而是构建时共享模块
   - Host（主应用）和 Remote（子应用）共享 npm 包（避免重复打包）
   - 可以与 qiankun 组合使用

**qiankun 的 JS 沙箱原理**：
```javascript
// Proxy Sandbox
const proxyWindow = new Proxy(window, {
  set(target, key, value) { sandbox[key] = value; return true; },
  get(target, key) { return sandbox[key] ?? target[key]; }
});
```
子应用运行在 proxyWindow 上下文，修改 "window" 实际是修改沙箱对象，不影响真实 window。

**考察点**：
1. qiankun JS 沙箱的实现原理
2. CSS 隔离的两种方案（Shadow DOM vs scoped CSS）
3. 微前端通信方案（props 传递、全局状态、CustomEvent）

**示例答案**：
微前端把大型前端拆成多个独立应用，各团队独立开发部署，主应用负责路由和整合。iframe 虽然隔离完美但体验太差（URL 不同步、白屏时间长）。qiankun 是国内最成熟的方案，基于 single-spa 的路由激活机制，加上 Proxy 沙箱（拦截子应用对 window 的所有读写，映射到独立的沙箱对象，不污染主应用）和 CSS 隔离（Dynamic Stylesheet 或 Shadow DOM），实现了较好的隔离性。Module Federation 是另一个层面的技术：解决的是"多个应用共享 npm 包避免重复打包"的问题，Host 应用可以动态加载 Remote 应用暴露的模块，是构建优化而非运行时微前端。实际中两者常组合：qiankun 做运行时路由管理，Module Federation 做公共依赖共享（react/react-dom 在多子应用间只加载一次）。微前端的沟通成本是主要代价，要在收益（独立部署、技术栈自由）和成本（路由协调、样式隔离调试困难）间权衡，小团队通常不值得引入。

---

## 十四、测试

---

### Q34: 前端测试分哪几层？Jest、Vitest、React Testing Library 的定位是什么？

**题目解析**：测试是工程质量的保证，考察候选人的工程化成熟度。

**题目讲解**：
**测试金字塔**：
- **单元测试（Unit Test）**：测试单个函数/组件，快速，数量最多
- **集成测试（Integration Test）**：测试多个组件/模块的交互
- **端到端测试（E2E Test）**：模拟用户操作，测试完整业务流程，慢，数量最少

**Jest vs Vitest**：
- **Jest**：Facebook 出品，成熟生态，全功能（测试运行器 + 断言 + Mock + 覆盖率）
- **Vitest**：基于 Vite，速度更快（复用 Vite 的 ES Module 转换，watch 模式极快），API 与 Jest 兼容（迁移成本低）
- 选择：Vite 项目选 Vitest，Webpack 项目用 Jest

**React Testing Library（RTL）**：
- 测试哲学："测试用户行为，而不是实现细节"
- 用 `getByRole`/`getByText`/`getByLabel` 查询元素（像用户一样找元素），而非 `querySelector` 或组件内部状态
- 核心 API：`render`, `screen`, `fireEvent`, `userEvent`, `waitFor`
- 配合 Jest/Vitest 使用，不是测试运行器

**E2E 工具**：
- **Playwright（微软）**：跨浏览器（Chromium/Firefox/Safari），API 优秀，速度快，现在主流
- **Cypress**：UI 直观，调试方便，但只支持 Chrome 系

**测试原则**：
- 测试接近"用户视角"，越少测试实现细节越好
- 不需要100%覆盖率，关键业务路径 + 容易出错的边界案例
- Fast / Reliable / Isolated：测试要快、可重复、相互独立

**考察点**：
1. RTL 的查询优先级（role > label > text > testid）
2. Mock 的使用场景（模拟 API、计时器、依赖模块）
3. 覆盖率 vs 测试质量的权衡

**示例答案**：
前端测试分三层：单元测试（函数、hooks、工具类，快如闪电）、集成测试（多组件交互、API mock，是主力）、E2E（真实浏览器跑完整流程，慢但最接近用户）。RTL 的核心理念是"像用户一样查询"——用 `screen.getByRole('button', {name: '提交'})` 而非 `container.querySelector('.btn-submit')`，这样即使你改了 class name 或组件实现，测试不会失败（没有绑定实现细节）。Vitest 在 Vite 项目里是 Jest 的更好替代，watch 模式下改一个文件只重跑受影响的测试，速度提升极明显，且 API 完全兼容 Jest 可以无缝迁移。E2E 工具现在推荐 Playwright：真正跨浏览器（Webkit/Firefox/Chromium），并发执行快，自动等待（不需要手写 waitFor），截图/视频录制支持，debug 体验也很好。测试策略上不追求 100% 覆盖率，优先覆盖：用户主流程（下单、登录）、容易出 bug 的业务逻辑、以前出过 bug 的地方（回归测试）。

---

## 十五、性能监控与 Web API

---

### Q35: 如何实现前端错误监控？需要捕获哪些类型的错误？

**题目解析**：错误监控是生产系统质量保障的基础，考察候选人的工程化运维意识。

**题目讲解**：
**错误类型**：
1. **JS 运行时错误**：`window.onerror` 或 `addEventListener('error')`
2. **Promise 未捕获拒绝**：`window.addEventListener('unhandledrejection')`
3. **资源加载失败**：`addEventListener('error', handler, true)`（捕获阶段，因为 error 事件不冒泡）
4. **React 渲染错误**：`ErrorBoundary` 的 `componentDidCatch`
5. **接口错误**：Axios/Fetch 拦截器捕获网络请求错误
6. **白屏检测**：定时检测页面是否渲染了关键元素

**错误上报**：
```javascript
window.addEventListener('error', (event) => {
  reportError({
    type: 'js_error',
    message: event.message,
    source: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
    url: location.href,
  });
}, true);
```

**Source Map**：
- 压缩混淆后的代码行号无意义
- 上传 source map 到错误监控平台（Sentry），还原原始代码位置
- source map 不应公开（包含源代码），应只在错误平台内部使用

**上报方式**：
- `fetch` POST（可能失败）
- `navigator.sendBeacon`（页面关闭时可靠上报，不阻塞页面卸载）
- `new Image().src = reportUrl`（1x1像素图片，兼容性好）

**工具**：
- **Sentry**：最主流，开源可自托管，错误聚合、告警、Source Map 支持
- 自研上报 SDK

**考察点**：
1. `unhandledrejection` 捕获 Promise 错误的必要性
2. Source Map 的安全处理
3. 采样上报（避免高流量下打爆后端）

**示例答案**：
前端错误监控要全面覆盖几类错误：`window.onerror` 捕获 JS 运行时错误，`unhandledrejection` 捕获没有 catch 的 Promise rejection（现代 async/await 代码的漏网之鱼），资源加载失败（图片/CSS/JS）用 error 事件的捕获阶段（因为不会冒泡），React 组件渲染错误用 ErrorBoundary 的 componentDidCatch。上报要用 `sendBeacon`——页面关闭/跳转时可靠地把最后一批错误上报，不被页面卸载中断。Source Map 一定要上传到监控平台（Sentry 支持），但不要公开到 CDN，否则源码泄露；上传时用 CI/CD 流程自动化，每次部署同步上传 source map 并标记版本号，这样 Sentry 能精确还原每个版本的错误位置。高流量应用要做采样（同一 user 相同错误每小时只上报 1 次），避免把监控后端打垮。错误监控要配告警规则：新错误出现、错误率突增（比昨天同时段高 2 倍）触发报警，让团队能在用户大量反映之前先发现问题。

---

### Q36: 什么是 Service Worker？它能实现哪些功能？

**题目解析**：Service Worker 是 PWA 的核心，也是离线缓存和推送通知的基础。

**题目讲解**：
**Service Worker 特点**：
- 独立于主线程的 Worker，在后台运行
- 可拦截和处理网络请求（Fetch 事件）
- 可以操作 Cache Storage（持久化缓存）
- 不能直接访问 DOM
- 生命周期独立（install → activate → idle/fetch）
- 只在 HTTPS 下工作（localhost 例外）

**主要能力**：
1. **离线缓存（Offline First）**：
   - install 阶段预缓存关键资源（App Shell）
   - fetch 阶段实现缓存策略（Cache First / Network First / Stale While Revalidate）
2. **后台同步（Background Sync）**：
   - 用户离线时的操作，联网后自动重试（SyncManager）
3. **推送通知（Push Notification）**：
   - 即使页面未打开，服务端也能推送通知
4. **周期性后台任务（Periodic Background Sync）**：
   - 定期在后台刷新内容

**Workbox（Google）**：
- Service Worker 的高级封装，提供多种缓存策略开箱即用：
  - CacheFirst：优先缓存（字体、图片）
  - NetworkFirst：优先网络（API 请求）
  - StaleWhileRevalidate：立即返回缓存，同时在后台更新（非关键数据）

**考察点**：
1. Service Worker 的生命周期（install/waiting/activate）
2. `skipWaiting()` 和 `clients.claim()` 的用途
3. 缓存策略的选择依据

**示例答案**：
Service Worker 是在浏览器后台运行的脚本，可以拦截所有网络请求并决定如何响应——从缓存返回、从网络获取，或者两者结合。实现离线缓存的核心是：install 阶段把关键资源（HTML/CSS/JS App Shell）预缓存到 Cache Storage，之后用户访问时即使断网也能从缓存提供完整页面。缓存策略的选择很重要：HTML 用 NetworkFirst（保证内容最新），静态资源（带 hash 的 JS/CSS）用 CacheFirst（hash 变了就是新文件，直接用缓存最快），API 数据用 StaleWhileRevalidate（先返回缓存不阻塞渲染，同时后台更新缓存）。Workbox 把这些策略封装好了，直接用 `registerRoute` 配置路由匹配规则和策略即可，不用手写复杂的 SW 代码。`skipWaiting()` 让新 SW 直接激活而不用等待所有旧页面关闭，`clients.claim()` 让新 SW 立即接管当前打开的页面——两者配合实现静默更新。推送通知需要服务端 Web Push 协议支持，用户授权后即使页面关闭也能收到通知。

---

*进阶篇完，与基础篇合计约 36 道前端面试题，涵盖 JavaScript高级特性/安全/React进阶/微前端/测试/SW。*

---

