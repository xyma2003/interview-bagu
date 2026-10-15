# 前端开发面试八股题库

<!-- navigation:start -->
[← 前端目录](README.md) · [12 周学习路线](../LEARNING_GUIDE.md) · [首页](../README.md)

<a id="question-index"></a>

<details>
<summary>本页题目（24 题，点击展开）</summary>

- [Q1 · 什么是 BFC（块级格式化上下文）？如何创建 BFC？有哪些应用场景？](#q1)
- [Q2 · CSS `position` 的几种取值有什么区别？`sticky` 的工作原理是什么？](#q2)
- [Q3 · Flex 和 Grid 布局各自的适用场景是什么？](#q3)
- [Q4 · JavaScript 的事件循环（Event Loop）是如何工作的？宏任务和微任务有什么区别？](#q4)
- [Q5 · 请解释 JavaScript 的原型链，以及 `__proto__`、`prototype`、`Object.getPrototypeOf` 的关系](#q5)
- [Q6 · 什么是闭包？闭包有哪些实际应用场景和潜在问题？](#q6)
- [Q7 · `this` 的指向规则有哪些？箭头函数的 `this` 与普通函数有何不同？](#q7)
- [Q8 · Promise、async/await 的错误处理有哪些最佳实践？](#q8)
- [Q9 · 浏览器从输入 URL 到页面渲染的完整过程是什么？](#q9)
- [Q10 · 什么是重绘（Repaint）和回流（Reflow）？如何减少它们？](#q10)
- [Q11 · HTTP/1.1、HTTP/2、HTTP/3 的主要区别是什么？](#q11)
- [Q12 · 浏览器缓存机制是怎样的？强缓存和协商缓存有什么区别？](#q12)
- [Q13 · 什么是跨域？有哪些解决方案？CORS 的预检请求是什么？](#q13)
- [Q14 · React Fiber 架构是什么？它解决了什么问题？](#q14)
- [Q15 · React Hooks 的设计原理是什么？为什么 Hooks 不能在条件语句中使用？](#q15)
- [Q16 · 如何优化 React 应用的渲染性能？](#q16)
- [Q17 · Vue 2 和 Vue 3 的响应式原理有什么区别？](#q17)
- [Q18 · Vue 3 的 `setup()` 和 Composition API 的优势是什么？](#q18)
- [Q19 · 什么是 Web Vitals？LCP、INP、CLS 分别是什么？FID 有何变化？](#q19)
- [Q20 · 如何实现前端懒加载？路由懒加载和图片懒加载各是什么原理？](#q20)
- [Q21 · Webpack 和 Vite 的核心区别是什么？Vite 为什么在开发环境下更快？](#q21)
- [Q22 · TypeScript 的泛型是什么？请举出实际使用场景](#q22)
- [Q23 · TypeScript 中的 `type` 和 `interface` 有什么区别？何时该用哪个？](#q23)
- [Q24 · 如何解释 TypeScript 的类型守卫（Type Guard）？](#q24)

</details>
<!-- navigation:end -->

> 覆盖：HTML/CSS / JavaScript核心 / ES6+ / 浏览器原理 / 网络 / React / Vue / 性能优化 / 工程化 / TypeScript

---

## 一、HTML / CSS

<a id="q1"></a>

<a id="review-frontend-q1"></a>

### Q1: 什么是 BFC（块级格式化上下文）？如何创建 BFC？有哪些应用场景？

> **核验日期**：2026-10-15
>
> **适用范围**：CSS 2.2 / CSS Display Level 3 / CSS Overflow Level 3；以下外边距示例采用水平书写模式与普通块布局。
>
> **技术参考**：[CSS 块格式化上下文](https://www.w3.org/TR/CSS22/visuren.html#block-formatting)、[CSS Display：格式化上下文](https://drafts.csswg.org/css-display-3/#formatting-context)、[CSS Overflow：overflow](https://www.w3.org/TR/css-overflow-3/#overflow-properties)
>
> **面经来源**：未提供可追溯面经。

**题目解析**：区分块格式化上下文、浮动与外边距折叠，避免把所有独立布局都叫作 BFC。

**题目讲解**：
BFC 是按块与行内布局规则排版的格式化上下文。它隔离内外浮动等布局影响，但容器的尺寸仍参与外部布局，不能理解为内外完全没有影响。

**常见创建方式**：
- `display: flow-root`，明确为内容建立新的 BFC。
- 浮动元素、绝对定位元素，以及 `inline-block`、表格单元格等块容器。
- 块盒的 `overflow` 计算值为 `hidden`、`auto` 或 `scroll`。`overflow: clip` 单独使用不会建立 BFC；两轴取值混用时应看计算值。

`flex` / `inline-flex` 建立 **flex formatting context**，`grid` / `inline-grid` 建立 **grid formatting context**。它们也有隔离浮动、阻止外边距跨上下文折叠等性质，但内部布局规则不同，不应直接称为 BFC。

**应用与边界**：
1. **包住内部浮动**：BFC 根的自动高度计算会计入参与该 BFC 的浮动后代，常用 `flow-root` 解决浮动内容不撑开父容器的问题。
2. **阻止父子外边距折叠**：新 BFC 的边界阻止其内容的 margin 与容器外部折叠；容器内部符合条件的相邻块仍可能折叠，不能说“有 BFC 就不会折叠”。
3. **避开外部浮动**：建立 BFC 的普通流块盒可避开同一外部上下文中的浮动，用于传统浮动两栏布局。

**示例答案**：
如果目的只是建立 BFC，我会优先考虑 `display: flow-root`，因为它不额外要求裁剪内容或创建滚动机制；但它本身会改变浮动和 margin 的布局关系，不能称为“完全无副作用”。需要 Flex/Grid 的排布能力时则直接使用相应布局，不把它们与块格式化上下文混为一谈。

---

<a id="q2"></a>

### Q2: CSS `position` 的几种取值有什么区别？`sticky` 的工作原理是什么？

**题目解析**：定位是 CSS 布局的基础，sticky 是相对新的特性，很多候选人对其工作原理理解不深。

**题目讲解**：
- **static**：默认值，按正常文档流排列，top/left 等属性无效
- **relative**：相对于自身原位置偏移，仍占据原来的空间（不脱离文档流）
- **absolute**：脱离文档流，相对于最近的非 static 祖先元素定位
- **fixed**：脱离文档流，相对于视口（viewport）定位，滚动不影响位置
- **sticky**：粘性定位，平时按 relative 流排列，当滚动到特定阈值时"粘"在视口上（类似 fixed）

**sticky 的工作原理**：
- 需要指定 `top/bottom/left/right` 中至少一个值（如 `top: 0`）
- 在滚动容器中，当元素距离容器顶部的距离 ≤ top 值时，切换为 fixed-like 表现
- 约束在其父容器内：一旦父容器底边到达 sticky 元素底边，元素停止粘附，随父容器滚走
- **失效原因**：父容器 `overflow: hidden/auto/scroll`（因为 sticky 需要能感知滚动，overflow 非 visible 会创建新滚动上下文打断）

**考察点**：
1. absolute 的定位参照物（最近 positioned 祖先）
2. sticky 失效的条件（overflow 问题）
3. fixed 在移动端的特殊行为（transform 影响）

**示例答案**：
position 五个值中，static 是默认流；relative 相对自身偏移但不脱流，常用于给 absolute 子元素提供定位参照；absolute 完全脱流，找最近有 position 属性（非 static）的祖先作为包含块；fixed 相对视口定位，不随滚动移动。sticky 是最有趣的：它是 relative + 条件性 fixed 的结合——元素平时在文档流中，当滚动距离使其即将离开可视区时，它"粘"在设定的阈值上（`top: 0` 即粘在视口顶部）。关键约束是它的粘性范围受父容器限制，父容器滚出视口时它也跟着走。sticky 最常见的失效原因是父元素设了 `overflow: hidden/auto/scroll`，这会创建独立的滚动上下文，导致 sticky 无法感知外层滚动。

---

<a id="q3"></a>

### Q3: Flex 和 Grid 布局各自的适用场景是什么？

**题目解析**：现代 CSS 布局的核心，考察候选人对不同布局技术的选择判断力。

**题目讲解**：
**Flexbox（一维布局）**：
- 处理一个方向（行或列）上的空间分配和对齐
- 主轴 / 交叉轴的概念，`justify-content`（主轴对齐）、`align-items`（交叉轴对齐）
- `flex: 1` = `flex-grow: 1; flex-shrink: 1; flex-basis: 0`，让元素填充剩余空间
- 适合：导航栏、按钮组、卡片列表、单行/列布局

**Grid（二维布局）**：
- 同时控制行和列，精确控制二维空间
- `grid-template-columns/rows`，`gap`，`grid-area` 命名区域
- `fr` 单位（fraction，按比例分配）
- 适合：页面整体布局、画廊/卡片瀑布流、复杂表格型布局

**选择原则**：
- "组件内部的元素排列" → Flex（单维，简单）
- "页面级别的区域划分" → Grid（二维，精确）
- 两者可以嵌套使用

**考察点**：
1. flex-grow/flex-shrink/flex-basis 的含义
2. Grid 的 fr 单位和 auto-fill/auto-fit 的区别
3. 实际布局问题的选型判断

**示例答案**：
Flex 是一维布局，沿一个轴（行或列）分配空间，适合组件内部的元素排列，比如按钮组、导航 item、卡片内的文本图片对齐。Grid 是二维布局，可以同时控制行和列，适合页面级区域划分（头部/侧边栏/主内容/底部）或需要精确对齐行列的网格内容。实际项目中常见的用法是 Grid 负责宏观布局（`grid-template-areas` 定义区域），Flex 负责每个区域内部的元素排列。两者都支持 `gap` 属性控制间距，`auto-fit` 配合 `minmax()` 可以实现不写 media query 的响应式网格。

---

## 二、JavaScript 核心

---

<a id="q4"></a>

<a id="review-frontend-q4"></a>

### Q4: JavaScript 的事件循环（Event Loop）是如何工作的？宏任务和微任务有什么区别？

> **核验日期**：2026-10-15
>
> **适用范围**：WHATWG HTML Living Standard 的浏览器 Window 事件循环；示例是同一次普通脚本执行，不套用于 Node.js 的事件循环阶段或 `process.nextTick`。
>
> **技术参考**：[HTML：事件循环处理模型](https://html.spec.whatwg.org/multipage/webappapis.html#event-loop-processing-model)、[HTML：微任务检查点](https://html.spec.whatwg.org/multipage/webappapis.html#perform-a-microtask-checkpoint)、[HTML：计时器](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)
>
> **面经来源**：未提供可追溯面经。

**题目讲解**：
同一 JavaScript agent 的执行上下文按调用栈运行；浏览器还可有 Worker 等其他 agent，不能据此把整个浏览器说成单线程。异步操作由宿主调度，`new Promise` 的 executor 本身仍同步执行。

- **任务（task，常被口头称为宏任务）**：如计时器回调、消息事件。事件循环可有多个任务队列与来源，不是所有任务共用一个全局 FIFO。
- **微任务（microtask）**：如已就绪的 Promise reaction、`queueMicrotask` 回调和 MutationObserver 通知。在微任务检查点，队列会处理至空，期间加入的微任务也会继续处理。
- **渲染机会**：渲染有专门调度，`requestAnimationFrame` 回调属于更新渲染流程。当前规范还定义 rendering task source；不能把“UI 渲染”简单当成与计时器同队列的普通宏任务，也不能保证每处理一个任务就绘制一帧。

**分析顺序**：先执行当前同步代码，再看哪些微任务已经入队；任务完成后的检查点会处理它们，然后事件循环才选择后续任务。规范也在其他位置设置检查点，并非只有“宏任务结束”这一处。持续递归添加微任务可能延迟后续任务与渲染。

```javascript
console.log('1');                    // 同步
setTimeout(() => console.log('2'));  // 宏任务
Promise.resolve().then(() => console.log('3')); // 微任务
console.log('4');                    // 同步
// 输出: 1, 4, 3, 2
```

**示例答案**：
上例的 Promise 已经 fulfilled，因此 reaction 在当前脚本结束后的检查点执行，输出为 `1, 4, 3, 2`。这不意味着任意 `Promise.then` 都早于任意 `setTimeout`：如果 Promise 尚未解决，它的回调可能尚未入队。`await` 会暂停当前 async 函数，后续恢复通过 Promise 的异步机制安排；仍需结合被等待值的完成时机分析。计时器延迟表示调度条件，不保证精确执行时间。

---

<a id="q5"></a>

### Q5: 请解释 JavaScript 的原型链，以及 `__proto__`、`prototype`、`Object.getPrototypeOf` 的关系

**题目解析**：原型链是 JavaScript 面向对象的基础，也是很多面试官拉开差距的考察点。

**题目讲解**：
- **`prototype`**：只有函数对象有，是函数作为构造函数时创建实例的原型对象
- **`__proto__`**：每个对象都有（除 null），指向其原型（等同于 `Object.getPrototypeOf(obj)`，`__proto__` 是非标准访问器）
- **原型链**：对象查找属性时，先找自身，找不到沿 `__proto__` 向上查找，直到 `null`

```javascript
function Person(name) { this.name = name; }
Person.prototype.greet = function() { return 'Hi ' + this.name; };

const p = new Person('Alice');
p.__proto__ === Person.prototype  // true
Person.prototype.__proto__ === Object.prototype  // true
Object.prototype.__proto__ === null  // true（链的终点）
```

**new 操作符做了什么**：
1. 创建空对象 `obj = {}`
2. 设置原型 `obj.__proto__ = Constructor.prototype`
3. 执行构造函数（this 指向 obj）
4. 若构造函数返回对象，则返回该对象；否则返回 obj

**instanceof 原理**：沿左侧对象的原型链查找，是否存在右侧构造函数的 prototype。

**考察点**：
1. prototype 和 __proto__ 的区别
2. new 的四个步骤
3. instanceof 的判断原理

**示例答案**：
JavaScript 里每个对象都有一个内部属性指向它的原型对象（可通过 `__proto__` 访问，标准做法是 `Object.getPrototypeOf()`）。函数对象有 `prototype` 属性，当函数作为构造函数用 new 调用时，创建的实例对象的 `__proto__` 会指向该函数的 `prototype`。属性查找遵循原型链：先找对象自身属性，没有就沿 `__proto__` 向上找，直到 `Object.prototype`，再往上是 null，查找结束。new 做了四件事：创建空对象、设置原型链指向构造函数的 prototype、以新对象为 this 执行构造函数、返回该对象。继承本质就是操纵原型链——ES6 的 class extends 只是语法糖，底层仍是原型链。

---

<a id="q6"></a>

### Q6: 什么是闭包？闭包有哪些实际应用场景和潜在问题？

**题目解析**：闭包是 JavaScript 最核心的概念，几乎所有前端面试都会考到。

**题目讲解**：
**闭包定义**：函数和其词法环境的组合。当一个函数能访问其外部函数作用域中的变量时，就形成了闭包。

**形成条件**：
- 存在内层函数
- 内层函数引用了外层函数的变量
- 内层函数在外层函数执行完后仍然存活（被返回或传递）

**实际应用**：
1. **数据封装（私有变量）**：模块模式
2. **函数工厂**：根据参数生成不同功能的函数
3. **记忆化（Memoization）**：缓存函数计算结果
4. **防抖/节流**：闭包保存 timer 状态
5. **IIFE + 模块化**：ES5 时代的模块化方案

**潜在问题**：
- **内存泄漏**：闭包持有对外部变量的引用，如果变量不再需要但闭包未释放，GC 无法回收
- **循环中的陷阱**：经典的 `for + setTimeout` 问题（用 let 或 IIFE 解决）

**考察点**：
1. 闭包的内存影响（为何不能滥用）
2. 经典循环闭包问题的解法
3. 与模块系统的关系

**示例答案**：
闭包是函数和它所在词法环境的绑定——内层函数"记住"了外层作用域的变量，即使外层函数已经执行完毕。经典例子是计数器：通过闭包让 count 变量只能通过返回的 increment/decrement 函数修改，实现私有状态。防抖和节流都依赖闭包保存 timer 引用。闭包的问题是内存：只要闭包函数存活，它引用的外部变量就不会被 GC 回收，如果闭包被存储在全局或长生命周期对象中，可能造成内存泄漏。经典的 `for (var i = 0; i < 5; i++) setTimeout(() => console.log(i))` 输出 5 个 5，因为 var 声明的 i 被所有闭包共享；用 `let` 改成块级作用域，或用 IIFE 为每次循环创建独立作用域，可以正确输出 0-4。

---

<a id="q7"></a>

### Q7: `this` 的指向规则有哪些？箭头函数的 `this` 与普通函数有何不同？

**题目解析**：this 指向问题是 JavaScript 最容易出错的特性，也是面试高频考点。

**题目讲解**：
**普通函数 this 绑定规则（优先级从高到低）**：
1. **new 绑定**：new 调用时，this 指向新创建的对象
2. **显式绑定**：call/apply/bind 指定 this
3. **隐式绑定**：作为对象方法调用，this 指向该对象（`obj.fn()` → this=obj）
4. **默认绑定**：独立函数调用，严格模式下 undefined，非严格模式下 globalThis

**箭头函数**：
- 没有自己的 this，继承定义时外层作用域的 this（词法 this）
- 无法被 call/apply/bind 改变 this
- 不能用作构造函数

**常见陷阱**：
```javascript
const obj = {
  name: 'Alice',
  greet: function() { console.log(this.name); },  // this=obj（方法调用）
  greetArrow: () => { console.log(this.name); }   // this=外层（可能是 window）
};
const fn = obj.greet;
fn();  // 独立调用，this=undefined（严格模式）
```

**考察点**：
1. 四种绑定规则及优先级
2. 箭头函数的词法 this
3. 回调函数中的 this 丢失问题

**示例答案**：
this 的值在调用时决定，不在定义时。规则优先级：new > call/apply/bind 显式绑定 > 对象方法隐式绑定 > 默认绑定（严格模式 undefined，非严格 global）。经典陷阱是回调函数中 this 丢失：把 `obj.method` 传给 setTimeout，执行时是独立调用，this 变成 global；解决方案是用箭头函数包裹、或 `.bind(obj)`。箭头函数根本就没有自己的 this，它的 this 在定义时从外层词法作用域继承，之后无论怎么调用都不会变。这使箭头函数非常适合用作回调（保持外层 this），但不适合用作对象方法（会导致 this 不指向对象）。

---

<a id="q8"></a>

### Q8: Promise、async/await 的错误处理有哪些最佳实践？

**题目解析**：异步错误处理是生产代码质量的重要体现，考察候选人的工程规范意识。

**题目讲解**：
**Promise 错误处理**：
- `.catch()` 捕获 reject 和 then 回调中的抛出错误
- 未处理的 reject 会触发 `unhandledRejection` 事件

**async/await 错误处理**：
- try/catch 包裹 await 表达式
- 对多个 await，可以统一 try/catch，也可以分开
- `await Promise.allSettled()` 获取所有结果（含失败），不因一个失败而短路

**最佳实践**：
1. **不要丢失 catch**：Promise 链必须有 .catch，async 函数调用也要有 try/catch 或外层 catch
2. **Error 类型明确**：自定义 Error 子类，携带业务信息（ErrorCode、context）
3. **并发错误**：`Promise.all` 中任何一个 reject 会整体 reject，用 `Promise.allSettled` 获取全部结果
4. **统一错误边界**：在顶层（路由级别）设置错误处理，兜底未捕获错误
5. **避免 async 地狱**：不要为了简洁省略 await，未 await 的 Promise 错误会被吞

**考察点**：
1. Promise.all vs Promise.allSettled vs Promise.race 的区别
2. async 函数本身就返回 Promise，链式调用要注意
3. 在 React/Vue 中的错误边界设计

**示例答案**：
异步错误处理的核心是确保每个 Promise 链都有 catch，不能"fire and forget"。在 async/await 里，try/catch 包裹一个或多个 await 表达式，catch 块里处理统一的错误逻辑（上报、降级回显）。一个实用技巧是把 await 的返回和错误一起处理：封装 `const [data, err] = await to(promise)` 这样的 helper，避免 try/catch 嵌套过深。并发场景里，`Promise.all` 遇到一个失败就全部失败（适合"全成功才继续"的场景），`Promise.allSettled` 等所有完成后返回每个结果的状态（适合"批量操作，部分失败也要处理"）。自定义 Error 类要带上业务 code 和 context，方便日志排查。最后，在 Node.js 服务里设置 `process.on('unhandledRejection')` 全局兜底，在 React 里用 ErrorBoundary 捕获渲染错误。

---

## 三、浏览器原理

---

<a id="q9"></a>

### Q9: 浏览器从输入 URL 到页面渲染的完整过程是什么？

**题目解析**：这道经典题目考察候选人知识面的广度，从网络到渲染一网打尽。

**题目讲解**：
1. **DNS 解析**：域名 → IP，有多级缓存（浏览器缓存 → 系统 hosts → 本地 DNS → 递归解析）
2. **TCP 三次握手**：建立可靠连接
3. **TLS 握手**（HTTPS）：证书验证、协商加密套件、交换密钥
4. **HTTP 请求**：发送 GET 请求，含 Host、Cookie、Accept 等头部
5. **服务器处理**：路由、业务逻辑、数据库查询、生成响应
6. **HTTP 响应**：返回 HTML，包含状态码、Content-Type 等头部
7. **浏览器渲染**（关键路径）：
   - **解析 HTML** → 构建 DOM 树（遇到外链资源暂停 or 并行预加载）
   - **解析 CSS** → 构建 CSSOM 树（CSS 阻塞渲染但不阻塞 HTML 解析）
   - **执行 JS**（`<script>` 阻塞 HTML 解析，除非 async/defer）
   - **合并 DOM + CSSOM** → Render Tree（只包含可见节点）
   - **Layout（布局/Reflow）**：计算每个节点的几何信息（位置、大小）
   - **Paint（绘制/Repaint）**：将节点转为像素
   - **Composite（合成）**：将不同图层合并输出到屏幕

**考察点**：
1. DNS 的缓存层级
2. CSS 阻塞渲染 vs JS 阻塞解析的区别
3. async 和 defer 的区别

**示例答案**：
输入 URL 到渲染分几个阶段：首先 DNS 查询把域名解析为 IP（有多级缓存），然后 TCP 三次握手建连，HTTPS 还要 TLS 握手。HTTP 请求发出，服务器返回 HTML。浏览器开始渲染关键路径：解析 HTML 构建 DOM，解析 CSS 构建 CSSOM（CSS 会阻塞渲染，因为渲染需要完整 CSSOM），遇到 script 标签停止解析等待 JS 执行（除非 async/defer）。DOM 和 CSSOM 合并为 Render Tree，只包含实际渲染的节点（display:none 的不包含）。接着 Layout 计算元素位置大小，Paint 生成绘制指令，最后 Compositor 合并各图层输出画面。性能优化要关注缩短关键渲染路径：减少阻塞资源、CSS 放 head、script 放底部或用 defer、预加载关键资源。

---

<a id="q10"></a>

### Q10: 什么是重绘（Repaint）和回流（Reflow）？如何减少它们？

**题目解析**：重绘回流是前端性能优化的核心知识，也是面试高频题。

**题目讲解**：
- **回流（Reflow/Layout）**：元素的几何属性（位置、大小）发生变化，需要重新计算布局，代价极高，会影响整个文档
- **重绘（Repaint）**：元素外观（颜色、背景、visibility）发生变化，但位置大小不变，只需重新绘制，代价较低
- **关系**：回流必然触发重绘，重绘不一定触发回流

**触发回流的操作**：
- 改变 width/height/margin/padding/border
- 读取 `offsetWidth`/`scrollTop`/`clientHeight` 等（强制浏览器同步布局，flush）
- DOM 增删、字体大小变化

**优化策略**：
1. **批量 DOM 操作**：用 DocumentFragment 或先将元素 `display: none` 再操作
2. **避免强制同步布局**：不要在循环里交替读写 DOM 属性
3. **使用 transform/opacity**：这两个属性改变只需 Composite，不触发 Layout 和 Paint
4. **will-change**：提前告知浏览器元素将变化，提升到独立图层
5. **CSS 动画替代 JS 动画**：CSS transform 动画可以在 Compositor 线程执行，不阻塞主线程
6. **虚拟 DOM**：React/Vue 的 vDOM diff 批量更新，减少实际 DOM 操作次数

**考察点**：
1. 哪些 CSS 属性只触发 Composite（transform/opacity）
2. 读写 DOM 的强制同步布局问题
3. 浏览器图层（compositing layer）的概念

**示例答案**：
回流是最昂贵的渲染操作，当元素的几何属性（位置、大小）改变时触发，浏览器需要重新计算整个或部分布局树。重绘只更新外观（颜色等），不重新计算布局，开销相对小。最有效的优化是使用 `transform` 和 `opacity` 做动画——这两个属性的变化只需要 Composite 合成阶段，完全跳过 Layout 和 Paint，且在 GPU Compositor 线程处理，不阻塞主线程，动画非常流畅。代码层面要避免强制同步布局（Forced Synchronous Layout）：在 JavaScript 里先读 DOM 属性（`offsetWidth`）再写，浏览器被迫立刻 flush 布局计算，如果在循环里这样做会导致每次迭代都回流，性能极差。正确做法是"读完再批量写"。批量 DOM 更新可以用 DocumentFragment，或先 `display:none` 再操作、再显示。React 的虚拟 DOM diff 本质也是为了减少不必要的真实 DOM 操作，批量 patch。

---

## 四、网络

---

<a id="q11"></a>

### Q11: HTTP/1.1、HTTP/2、HTTP/3 的主要区别是什么？

**题目解析**：HTTP 协议演进是前端网络知识的重要考察点，理解它有助于性能优化决策。

**题目讲解**：
**HTTP/1.1 痛点**：
- 队头阻塞（Head-of-Line Blocking）：同一连接下请求必须串行，前一个响应未完成后续请求等待
- 虽支持持久连接（keep-alive），但浏览器限制对同一域名只建 6 个连接
- 头部冗余：每个请求携带完整头部信息，无压缩

**HTTP/2 改进**：
- **多路复用（Multiplexing）**：同一 TCP 连接上多个请求并行，用流（Stream）标识
- **头部压缩（HPACK）**：维护头部字典，避免重复发送相同头部
- **服务端推送（Server Push）**：服务端主动推送资源（实践中问题多，现已不推荐）
- **二进制分帧**：HTTP 消息分为帧（Frame），更高效
- **局限**：底层仍是 TCP，TCP 层的队头阻塞仍然存在（一个包丢失影响所有流）

**HTTP/3 改进**：
- 基于 **QUIC 协议**（UDP 之上实现可靠传输），彻底解决 TCP 队头阻塞
- 每个流独立，一个流的包丢失不影响其他流
- 0-RTT 重连（TLS 1.3 内嵌，可以在首次握手后 0 RTT 恢复连接）
- 连接迁移（切换网络时连接不中断）

**考察点**：
1. HTTP/2 的多路复用 vs HTTP/1.1 的并行连接
2. TCP 队头阻塞 vs HTTP 队头阻塞的区别
3. QUIC 基于 UDP 的原因

**示例答案**：
HTTP/1.1 的核心问题是队头阻塞：虽然支持 keep-alive 复用连接，但同一连接上请求必须等前一个响应完成才能发后一个（应用层队头阻塞）。浏览器用多开连接（6个/域名）绕开这个问题。HTTP/2 引入多路复用，一个 TCP 连接上多个 Stream 并行传输，配合头部压缩（HPACK）大幅提升效率，这也是现代网站大多使用 HTTP/2 的原因。但 HTTP/2 的底层 TCP 层面仍有队头阻塞：任何一个 TCP 分包丢失，整个连接的所有流都得等待重传。HTTP/3 用 QUIC 解决了这个问题——QUIC 跑在 UDP 上，自己实现可靠传输，每个流独立，一个流丢包不阻塞其他流，同时 TLS 内嵌支持 0-RTT 重连，在弱网环境（移动网络频繁切换）有显著优势。

---

<a id="q12"></a>

### Q12: 浏览器缓存机制是怎样的？强缓存和协商缓存有什么区别？

**题目解析**：HTTP 缓存是前端性能优化的基础，也是面试常考知识。

**题目讲解**：
**强缓存（不发请求）**：
- `Cache-Control: max-age=3600`：资源在 3600 秒内有效，直接用本地缓存（200 from cache）
- `Expires: Thu, 01 Jan 2026 00:00:00 GMT`：HTTP/1.0 方式，绝对时间，受本地时钟影响，已基本废弃
- `Cache-Control: no-cache`：不是不缓存，而是每次都需协商缓存验证
- `Cache-Control: no-store`：完全不缓存

**协商缓存（发请求，服务端决定）**：
- `Last-Modified / If-Modified-Since`：文件最后修改时间，秒级精度，有精度问题
- `ETag / If-None-Match`：文件内容哈希，更精确。服务端比较 ETag，若相同返回 304 Not Modified，客户端使用缓存；若不同返回 200 + 新资源

**优先级**：`Cache-Control` > `Expires`；`ETag` > `Last-Modified`

**实践策略**：
- HTML：`Cache-Control: no-cache`（每次协商，保证能更新）
- JS/CSS（带 hash 名）：`Cache-Control: max-age=31536000, immutable`（永久缓存，更新靠改文件名）
- API 接口：`Cache-Control: no-store`（不缓存敏感数据）

**考察点**：
1. 强缓存命中时完全不发请求（状态码 200 from disk/memory cache）
2. 304 Not Modified 的触发条件
3. 实际项目中不同资源的缓存策略

**示例答案**：
浏览器缓存分两层：强缓存不发任何网络请求，直接用本地缓存，由 `Cache-Control: max-age` 控制有效期，命中时状态码是 200 from cache；协商缓存每次都发请求到服务端，但携带缓存标识（ETag 或 Last-Modified），服务端判断资源是否变化，未变化返回 304，变化了返回 200 + 新资源。工程实践中，HTML 文件设 `no-cache`（每次协商，保证及时更新），JS/CSS 文件名带内容哈希（如 `main.abc123.js`）设 `max-age=31536000, immutable`（永久缓存），更新时改文件名即可让旧缓存自动失效。ETag 比 Last-Modified 更精确（文件内容哈希 vs 修改时间秒级），对于频繁更新但内容可能相同的场景，ETag 能更准确判断是否真正变化。

---

<a id="q13"></a>

### Q13: 什么是跨域？有哪些解决方案？CORS 的预检请求是什么？

**题目解析**：跨域是前后端联调的常见问题，理解其原理能帮助候选人更快定位和解决问题。

**题目讲解**：
**同源策略（Same-Origin Policy）**：浏览器安全策略，只有协议+域名+端口全部相同才算同源，不同源的 XMLHttpRequest 请求会被浏览器拦截（注意：是浏览器拦截响应，而非服务端拒绝请求）。

**解决方案**：
1. **CORS（Cross-Origin Resource Sharing）**：服务端在响应头设置 `Access-Control-Allow-Origin`，告诉浏览器允许跨域。最正规的方案
2. **代理服务器**：Nginx 反向代理，让前端请求同域代理服务器，代理再转发给目标服务器（同域内无同源限制）
3. **JSONP**：利用 `<script>` 标签不受同源限制，GET 请求，只支持 GET，已逐渐废弃
4. **postMessage**：跨窗口通信，不用于 HTTP 接口
5. **Websocket**：协议本身无同源限制

**CORS 预检请求（Preflight）**：
- **简单请求**（GET/POST，Content-Type 为 form/text/json）：直接发请求
- **复杂请求**（PUT/DELETE、自定义 Header、特殊 Content-Type）：浏览器先发 OPTIONS 预检请求询问服务端是否允许，服务端返回 `Access-Control-Allow-Methods`、`Access-Control-Allow-Headers` 等，预检通过后才发实际请求
- 预检可以缓存：服务端设置 `Access-Control-Max-Age` 减少重复预检

**考察点**：
1. 同源策略的三要素（协议+域名+端口）
2. 预检请求的触发条件
3. 代理方案的工作原理

**示例答案**：
跨域是浏览器的同源策略限制，不同源（协议、域名、端口任意不同）的 AJAX 请求响应会被浏览器拦截。注意：请求已经发出并到达服务端，只是浏览器拦截了响应——所以跨域不能防 CSRF。最常用的解决方案是 CORS：服务端在响应头加 `Access-Control-Allow-Origin: *`（或具体域名），浏览器看到后允许前端代码读取响应。前端开发时更常用代理：Vite/Webpack 的 devServer proxy 把 /api 请求转发给后端，因为代理到同域就没有跨域问题。CORS 的预检请求发生在"复杂请求"（如带自定义 header 的 POST），浏览器先发 OPTIONS 请求，服务端返回允许的方法和头部，浏览器确认允许后才发实际请求。可以通过 `Access-Control-Max-Age` 缓存预检结果，减少请求数。

---

## 五、React

---

<a id="q14"></a>

### Q14: React Fiber 架构是什么？它解决了什么问题？

**题目解析**：Fiber 是 React 16 的核心重构，理解它体现候选人对 React 架构的深度认知。

**题目讲解**：
**React 15 的问题（Stack Reconciler）**：
- 渲染使用递归遍历组件树，一旦开始无法中断
- 大型组件树渲染时占用主线程过长，导致页面卡顿（动画掉帧、交互延迟）

**Fiber 架构解决方案**：
- 将渲染工作拆分为可中断的"单元"（Fiber 节点），每个 Fiber 对应一个组件
- 用循环代替递归，每处理完一个 Fiber 单元，检查是否有更高优先级的任务（用户交互等）
- 如果有，暂停当前工作，先处理高优任务，之后再恢复

**Fiber 的两个阶段**：
1. **Render/Reconciliation 阶段**（可中断）：计算哪些组件需要更新（Diff 算法），产生 Effect List
2. **Commit 阶段**（不可中断）：将 Effect List 实际应用到 DOM（分三个子阶段：BeforeMutation/Mutation/Layout）

**Concurrent Mode 特性**（Fiber 的进阶应用）：
- `startTransition`：将低优先级更新标记为可打断的 transition
- `useDeferredValue`：延迟非紧急值的更新
- `Suspense`：优雅处理异步组件/数据加载

**考察点**：
1. Fiber 节点的数据结构（链表，child/sibling/return 指针）
2. 时间切片（Time Slicing）的实现原理
3. Render 阶段 vs Commit 阶段的可中断性

**示例答案**：
React 15 的 Stack Reconciler 用递归遍历组件树，一旦开始就无法中断，大型应用渲染时主线程被长期占用，造成卡顿。Fiber 把渲染工作转成链表结构的 Fiber 节点树，用迭代代替递归，每处理完一个节点就通过 `requestIdleCallback` 类似机制检查是否有更高优先级工作需要处理，如有则暂停当前渲染，让出主线程。Fiber 的渲染分两大阶段：Reconciliation 阶段（可中断）做 Diff 计算，得出需要更新的 Effect List；Commit 阶段（不可中断，确保 UI 一致性）将变更同步应用到 DOM。Concurrent Mode 建立在 Fiber 之上，提供 `startTransition` 标记低优先级更新，让用户输入等高优任务能及时响应，搜索过滤这类耗时更新不阻塞 UI。

---

<a id="q15"></a>

### Q15: React Hooks 的设计原理是什么？为什么 Hooks 不能在条件语句中使用？

**题目解析**：Hooks 原理是 React 面试的必考点，理解它才能真正用好 Hooks。

**题目讲解**：
**Hooks 的存储机制**：
- 每个组件实例在 Fiber 节点上维护一个"Hooks 链表"
- Hooks 按照调用顺序，依次存储在链表节点中
- 每次重新渲染时，React 按相同顺序遍历链表，将 Hook 与其对应的 state/effect 关联

**为什么不能在条件语句中**：
- 如果某次渲染时因为条件判断跳过了某个 Hook，链表的顺序就会错乱
- 后续 Hook 会错误地读取到前一个 Hook 的 state
- React 依赖调用顺序固定来保证状态正确关联

**常用 Hooks 原理**：
- **useState**：在链表节点存储 state 和 dispatch 函数，每次调用 dispatch 触发重新渲染
- **useEffect**：存储副作用函数和依赖数组，Commit 阶段后异步执行，依赖变化时重新调度
- **useRef**：存储一个 `{current: value}` 对象，不触发重渲染
- **useMemo/useCallback**：存储缓存值和依赖数组，依赖不变时直接返回缓存

**考察点**：
1. Hooks 链表的存储和读取机制
2. useEffect 的执行时机（Commit 后异步 vs useLayoutEffect 同步）
3. 自定义 Hook 的封装原则

**示例答案**：
Hooks 的魔法在于 React 用一个链表在每个组件的 Fiber 节点上存储 Hook 的状态，链表节点按 Hook 的调用顺序排列。每次渲染时，React 按照固定顺序读取链表节点来恢复各个 Hook 的状态。这就是为什么 Hooks 必须在顶层无条件调用——如果某次渲染因为条件跳过了一个 Hook，后续所有 Hook 读取的链表节点都会错位，状态就对不上了。useState 在链表节点存储当前值和更新函数，useEffect 存储副作用函数和依赖数组，每次渲染时对比依赖数组是否变化决定是否重新调度 effect。useEffect 是异步的，在浏览器绘制完成后执行，不阻塞渲染；useLayoutEffect 是同步的，在 DOM 更新后、浏览器绘制前执行，适合需要同步读取 DOM 的场景。

---

<a id="q16"></a>

### Q16: 如何优化 React 应用的渲染性能？

**题目解析**：React 性能优化是工程实践中的高频需求，考察候选人的实战经验。

**题目讲解**：
**不必要的重渲染来源**：
- 父组件重渲染导致子组件 props 未变也重渲染
- Context 值变化导致所有消费者重渲染
- 每次渲染创建新的对象/函数引用导致子组件无法避免重渲染

**优化手段**：

1. **React.memo**：对纯组件进行浅比较 props，props 不变则跳过重渲染
2. **useMemo**：缓存计算结果，依赖不变时不重新计算
3. **useCallback**：缓存函数引用，避免子组件因函数 prop 变化重渲染
4. **组件拆分**：将不需要重渲染的部分下沉为独立组件
5. **Context 优化**：将 Context 按关注点拆分（value 不变的放一起），或用 `useContextSelector`
6. **虚拟化长列表**：react-window / react-virtualized，只渲染可见区域
7. **代码分割**：`React.lazy` + `Suspense` + 动态 import，按需加载

**使用 React DevTools Profiler**：录制渲染，找出重渲染频繁的组件。

**考察点**：
1. memo/useMemo/useCallback 的适用场景和滥用问题
2. 虚拟列表的实现原理
3. Concurrent Mode 的 startTransition 对性能的影响

**示例答案**：
React 性能优化的核心是"减少不必要的重渲染"。首先用 React DevTools Profiler 录制找出渲染热点，然后针对性优化。对纯展示组件用 `React.memo` 避免父组件重渲染时不必要的子组件重渲染；给子组件传递的函数用 `useCallback` 缓存引用，传递的计算结果用 `useMemo` 缓存，否则每次渲染都创建新引用，memo 形同虚设。Context 粒度要细，一个 Context 里有多个不相关的值，任何一个变化都会触发所有消费者重渲染；拆分成多个 Context 或用 zustand 这类订阅式状态管理。长列表必须虚拟化（react-window），只渲染可视区域内的 DOM 节点。代码分割用 `React.lazy + Suspense`，路由级别懒加载，首屏 bundle 大小从几 MB 降到几百 KB。最后，搜索/过滤等即时响应但计算量大的场景用 `startTransition` 标记为低优先级，优先保证输入框响应流畅。

---

## 六、Vue

---

<a id="q17"></a>

### Q17: Vue 2 和 Vue 3 的响应式原理有什么区别？

**题目解析**：Vue 响应式原理是 Vue 框架的核心，也是面试必考知识。

**题目讲解**：
**Vue 2：Object.defineProperty**
- 遍历对象每个属性，用 `Object.defineProperty` 将其改为 getter/setter
- 依赖收集：getter 中记录依赖（Dep/Watcher），setter 中通知更新
- **局限性**：
  - 无法检测属性的新增/删除（需要 `Vue.set`/`Vue.delete`）
  - 无法检测数组通过索引的直接修改（`arr[0] = val`），需重写数组方法
  - 初始化时需要递归遍历整个对象，性能代价大

**Vue 3：ES6 Proxy**
- 用 `new Proxy(target, handler)` 代理整个对象，拦截所有操作（get/set/deleteProperty/has 等）
- **优势**：
  - 懒代理（lazy）：子对象在访问时才代理，而不是初始化时全部遍历
  - 天然支持属性新增/删除、数组下标修改
  - 可以拦截更多操作（in 操作符、for...in 等）
  - 性能更好，代码更简洁

**Vue 3 的 Ref 与 Reactive**：
- `reactive`：Proxy 代理对象，深度响应
- `ref`：将值包裹为 `{value: T}`，value 被 Proxy 代理（基本类型也能响应式）

**考察点**：
1. Object.defineProperty 的三大局限
2. Proxy 的 handler 拦截机制
3. Vue 3 的 ref vs reactive 选择

**示例答案**：
Vue 2 用 Object.defineProperty 把对象每个属性转为 getter/setter，getter 里收集依赖（哪些组件用了这个属性），setter 里触发更新通知。这个方案有三个已知缺陷：不能检测属性新增/删除（必须用 Vue.set）、数组下标直接修改不触发更新（Vue 2 重写了 push/pop 等方法绕过）、初始化时递归遍历整个对象开销大。Vue 3 换成 ES6 Proxy，对整个对象做代理，get/set/deleteProperty 等操作都能被拦截，天然支持属性新增删除和数组下标修改，还支持懒代理（嵌套对象在访问时才创建 Proxy）。响应式系统内部用 `WeakMap<target, Map<key, Set<effect>>>` 的三层结构追踪依赖，WeakMap 保证对象被 GC 时自动清理依赖。

---

<a id="q18"></a>

### Q18: Vue 3 的 `setup()` 和 Composition API 的优势是什么？

**题目解析**：Composition API 是 Vue 3 最大的变化，考察候选人对其设计理念的理解。

**题目讲解**：
**Options API 的问题**：
- 同一业务逻辑分散在 data/methods/computed/watch 各处，难以维护
- 代码复用只能用 Mixin，Mixin 有命名冲突和来源不透明问题

**Composition API 的优势**：
1. **逻辑组织**：相关逻辑集中在一起（不按选项类型分散），大型组件可读性大幅提升
2. **逻辑复用**：自定义 Composable（`use*` 函数），完全可组合、类型安全、来源清晰
3. **TypeScript 支持**：Options API 的 `this` 类型推断较难，Composition API 是普通函数，TS 支持天然
4. **更好的 Tree Shaking**：按需引入 `ref/computed/watch`，未用的不打包

**`<script setup>` 语法糖**：
- 自动暴露顶层变量到模板
- 使用 `defineProps/defineEmits` 替代 options
- 编译后比手写 `setup()` 性能略好（减少代理）

**考察点**：
1. Mixin vs Composable 的核心差别（来源透明、无命名冲突）
2. `<script setup>` 的编译优化
3. setup 执行时机（比 created 更早，无 this）

**示例答案**：
Composition API 解决了 Options API 的两个核心问题：逻辑分散和复用困难。Options API 强制把同一功能的代码按类型拆分（data 里写状态、methods 写方法、watch 写监听），功能越复杂，同一 feature 的代码越分散。Composition API 允许把相关逻辑写在一起，还能抽取为 `useXxx` Composable 函数复用，相比 Mixin 来源完全透明、无命名冲突。我在项目里把用户权限逻辑封装为 `usePermission()`，返回 `{hasRole, canAccess, loading}`，多个组件直接 import 使用，比 Mixin 清晰多了。TypeScript 支持也更好，普通函数的类型推断比 Options API 的 this 容易多了。`<script setup>` 语法糖进一步减少样板代码，顶层定义的变量自动暴露给模板，`defineProps` 有类型推断，开发体验比手写 `setup()` 好很多。

---

## 七、性能优化

---

<a id="q19"></a>

<a id="review-frontend-q19"></a>

### Q19: 什么是 Web Vitals？LCP、INP、CLS 分别是什么？FID 有何变化？

> **核验日期**：2026-10-15
>
> **适用范围**：当前 Core Web Vitals 的 LCP / INP / CLS 定义与现场评估口径；工具版本和真实用户数据覆盖范围需另行确认。
>
> **技术参考**：[Web Vitals 总览](https://web.dev/articles/vitals)、[INP 定义](https://web.dev/articles/inp)、[CLS 定义](https://web.dev/articles/cls)
>
> **面经来源**：未提供可追溯面经。

**题目讲解**：
Web Vitals 是用户体验度量倡议，Core Web Vitals 是其中的核心指标集合。[INP 已于 2024-03-12 取代 FID](https://web.dev/blog/inp-cwv-march-12)。FID 只测首次交互的输入延迟；INP 还覆盖事件处理和到下一次绘制的等待，并观察页面访问期间的交互。

| 核心指标 | 衡量什么 | 良好阈值 |
|---|---|---|
| LCP | 视口中符合条件的最大内容元素的绘制时间，反映加载体验 | ≤ 2.5 秒 |
| INP | 点击、触摸、键盘交互的响应延迟；按规则排除异常值后取代表性的最慢交互 | ≤ 200 毫秒 |
| CLS | 整个页面生命周期内，意外布局偏移的最大 session window 得分 | ≤ 0.1 |

这些阈值应看真实用户页面访问的 **第 75 百分位**，移动端与桌面端分开评估，三个指标均达标才算通过。它们不是“超过这一数值每位用户都会感到卡顿”的绝对边界。

**容易混淆的口径**：
- CLS 不是只统计加载阶段，也不是把整个生命周期的偏移全部相加；一个 session window 内相邻偏移间隔小于 1 秒、总时长最多 5 秒，取累计得分最大的窗口。
- INP 不覆盖滚动、悬停等所有动作；没有符合条件的交互时，可能没有 INP 数据。
- Lighthouse 的单次加载实验不能代替真实用户的完整交互数据，应结合现场数据与交互诊断定位问题。

**优化思路**：
- LCP：先定位实际 LCP 元素与关键路径，再改善服务器响应、资源发现和下载；按需预加载关键资源，而非盲目预加载全部图片。
- INP：分别检查输入等待、事件处理、呈现等待，减少长任务与不必要的 DOM 工作；适合的计算可移到 Worker。
- CLS：为媒体与广告预留空间，减少内容插入造成的挤动，并匹配备用字体的尺寸。`font-display: swap` 本身不保证降低 CLS，字体替换也可能造成偏移；参见[官方 CLS 优化指南](https://web.dev/articles/optimize-cls#web_fonts)。

**示例答案**：
我会先确认是实验数据还是现场数据，再分别定位 LCP 的关键资源、INP 的慢交互和 CLS 的位移窗口。优化后比较相同设备分组与统计口径，不能仅凭一次 Lighthouse 分数就宣布所有真实用户体验已经改善。

---

<a id="q20"></a>

### Q20: 如何实现前端懒加载？路由懒加载和图片懒加载各是什么原理？

**题目解析**：懒加载是前端性能优化的核心手段，考察候选人的工程实践能力。

**题目讲解**：
**路由懒加载（代码分割）**：
- 原理：Webpack/Vite 的 Dynamic Import，`import('./Page.vue')` 会将该模块拆成独立 chunk，只在需要时加载
- React：`React.lazy(() => import('./Page'))` + `<Suspense fallback={...}>`
- Vue：`defineAsyncComponent(() => import('./Page.vue'))`，或路由配置中直接用动态 import
- 效果：首屏只加载 main chunk，其他路由的 JS 在导航时才加载

**图片懒加载**：
- **原生 loading 属性**：`<img loading="lazy">`，浏览器原生支持，图片进入视口附近时加载，现代浏览器全支持，推荐优先使用
- **Intersection Observer API**：监听元素是否进入视口
  ```javascript
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        observer.unobserve(img);
      }
    });
  });
  document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
  ```
- **scroll 事件**（老方案）：监听滚动事件，计算元素位置，性能差（需要节流），已不推荐

**考察点**：
1. Dynamic Import 的 Webpack 原理（魔法注释 webpackChunkName）
2. Intersection Observer 的性能优势（非主线程）
3. 预加载策略（prefetch vs preload）

**示例答案**：
路由懒加载利用 Webpack/Vite 的动态 import，`import('./Page')` 会在构建时把该页面的 JS 独立打包成 chunk，路由跳转时才异步加载，首屏 bundle 只包含当前路由的代码。React 用 `React.lazy + Suspense`，Vue Router 直接在路由配置里写 `component: () => import('./Page.vue')` 即可。图片懒加载最简单的方式是 HTML 原生的 `<img loading="lazy">`，浏览器自动处理，无需任何 JS，现代浏览器全支持，对于绝大多数场景已经足够。如果需要更细粒度的控制（自定义触发距离、动画效果），用 Intersection Observer：初始时 img 的 src 为空，data-src 存真实地址，Observer 检测到元素进入视口后把 data-src 赋值给 src，并取消观察。Intersection Observer 在 compositor 线程工作，不阻塞主线程，性能远好于 scroll 事件方案。

---

## 八、工程化

---

<a id="q21"></a>

### Q21: Webpack 和 Vite 的核心区别是什么？Vite 为什么在开发环境下更快？

**题目解析**：构建工具是前端工程化的基础，了解其原理有助于做正确的技术选型。

**题目讲解**：
**Webpack 开发模式**：
- 启动时打包所有模块（Bundle），生成 main.js
- 代码变更时，重新打包受影响的模块（HMR 部分更新）
- 项目越大，启动越慢（几十秒甚至更长）

**Vite 开发模式**：
- **ESM 原生支持**：浏览器原生支持 ES Modules，Vite 直接让浏览器按需请求各模块，不打包
- **启动时间**：只启动开发服务器，浏览器打开页面时按需请求，启动秒级
- **依赖预构建**：第三方依赖（node_modules）用 esbuild 预构建成 ESM（esbuild 是 Go 写的，比 JS 快 10-100 倍），缓存后复用
- **HMR（热更新）**：只更新变化的模块，通过 ESM 的 import 精确追踪依赖，HMR 速度快且稳定

**生产构建**：
- Vite 生产构建仍然用 Rollup 打包（浏览器兼容性、tree-shaking）
- Webpack 开发和生产都用 Webpack 打包

**考察点**：
1. No-Bundle 开发模式的优势和局限
2. esbuild 快的原因（Go + 并行）
3. Tree Shaking 的原理（ES Module 静态分析）

**示例答案**：
Webpack 的开发模式在启动时把所有文件打包成 bundle，项目大了启动要几十秒。Vite 利用浏览器对 ES Modules 的原生支持，开发时不打包——浏览器直接请求各个 `.js` 文件，Vite Dev Server 拦截请求、做必要的转换（TypeScript、JSX、CSS 等）后返回。只有真正用到的文件才被处理，所以启动时间与项目规模几乎无关。第三方依赖用 esbuild 预构建（Go 语言编写，比 babel 快 100 倍），结果缓存起来，不需要反复编译。HMR 也更精准，ESM 的 import 关系是静态的，变更一个模块只需更新它和依赖它的模块，浏览器快速接收新模块。生产构建 Vite 用 Rollup，其 Tree Shaking 依赖 ES Module 的静态分析（编译时就能确定哪些 export 被用），比 CommonJS 的动态 require 更彻底。

---

## 九、TypeScript

---

<a id="q22"></a>

### Q22: TypeScript 的泛型是什么？请举出实际使用场景

**题目解析**：泛型是 TypeScript 的核心特性，考察候选人的类型系统理解深度。

**题目讲解**：
**泛型定义**：类型参数化，让函数/类/接口能在保持类型安全的同时处理多种类型。

**基础用法**：
```typescript
function identity<T>(arg: T): T { return arg; }
identity<string>('hello');  // T = string
identity(42);  // T = number（类型推断）
```

**常用场景**：
1. **工具类型**：`Promise<T>`、`Array<T>`、`Map<K,V>`
2. **API 响应封装**：
   ```typescript
   interface ApiResponse<T> { code: number; data: T; message: string; }
   async function fetchUser(): Promise<ApiResponse<User>> { ... }
   ```
3. **通用 Hook**：
   ```typescript
   function useLocalStorage<T>(key: string, defaultValue: T): [T, (v: T) => void]
   ```
4. **泛型约束**：`<T extends { id: number }>` 约束 T 必须有 id 属性

**内置工具类型**（泛型实现的）：
- `Partial<T>`、`Required<T>`、`Readonly<T>`
- `Pick<T, K>`、`Omit<T, K>`
- `ReturnType<T>`、`Parameters<T>`
- `Record<K, V>`

**考察点**：
1. 泛型约束 extends 的用法
2. 常用内置工具类型
3. 条件类型（`T extends U ? X : Y`）

**示例答案**：
泛型让类型定义可以"参数化"，在保持类型安全的同时复用逻辑。最常见的场景是 API 请求的统一封装：定义 `ApiResponse<T>` 接口，T 是 data 的类型，这样 `fetchUserList` 返回 `Promise<ApiResponse<User[]>>`，调用者拿到 data 后 TypeScript 知道是 `User[]` 而不是 `any`，有完整的类型提示。React Hooks 里也常用泛型，比如 `useFormField<T>(initialValue: T)` 可以同时处理 string/number/boolean 类型的表单字段，类型推断完全自动。内置工具类型都是用泛型实现的，`Partial<User>` 把 User 所有字段变为可选，`Pick<User, 'id' | 'name'>` 取子集，`Omit<User, 'password'>` 排除敏感字段——这些在处理 DTO 和 UI 状态时非常实用，比手写各种部分类型省太多代码。

---

<a id="q23"></a>

<a id="review-frontend-q23"></a>

### Q23: TypeScript 中的 `type` 和 `interface` 有什么区别？何时该用哪个？

> **核验日期**：2026-10-15
>
> **适用范围**：TypeScript 5.x 的常见对象类型写法，按 `strict: true` 讨论；类型声明不提供运行时数据校验。
>
> **技术参考**：[类型别名与接口](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces)、[对象类型与扩展](https://www.typescriptlang.org/docs/handbook/2/objects.html#extending-types)、[结构类型兼容性](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)
>
> **面经来源**：未提供可追溯面经。

**题目讲解**：
两者都能描述对象与调用签名。普通对象的兼容性主要由结构决定，给对象起不同类型名不会自动产生名义类型隔离；但这不表示任何“看起来相似”的类型都可互换，新鲜对象字面量的多余属性检查、类的 private/protected 成员来源等仍有额外规则。

| 维度 | `interface` | `type` |
|---|---|---|
| 声明合并 | 同一声明空间内允许合并；成员冲突仍会报错 | 类型别名不能重新打开并合并 |
| 表达范围 | 声明对象形状，包括调用、构造、索引签名 | 可命名对象、联合、元组、基本类型及条件/映射类型等 |
| 组合方式 | `extends` 合适的对象类型；会检查继承冲突 | 使用交叉类型 `&` 等操作；冲突属性可能产生 `never` |

**扩展的边界**：
- interface 可以扩展成员静态已知的对象类型别名，不是只能扩展 interface。
- 类可以 `implements` 合适的对象接口或类型别名，但不能据此声称任意联合类型都可被实现；类的 `extends` 需要运行时基类，不能继承一个纯类型别名。
- `implements` 只检查类实例是否符合要求，不会自动生成属性或改变方法参数推断，参见[官方类文档](https://www.typescriptlang.org/docs/handbook/2/classes.html#implements-clauses)。

**使用建议**：
需要用户通过声明合并扩展公共对象契约时可选 interface；需要联合、条件或映射类型时选 type。Props、DTO、函数类型都不要求只能选其中一种；按表达需求与项目约定选择，两者并用本身不是错误。

**示例答案**：
我先看类型是否需要被重新打开扩展，还是需要组合成联合或计算类型，再选择 interface 或 type。两者都属于编译期工具，接受 JSON 或接口响应时仍需独立的运行时校验，不能仅靠类型名保证实际数据正确。

---

<a id="q24"></a>

### Q24: 如何解释 TypeScript 的类型守卫（Type Guard）？

**题目解析**：类型守卫是实际项目中处理联合类型的常用手段，考察候选人的 TS 实战能力。

**题目讲解**：
**问题**：处理联合类型时，需要判断变量是哪个具体类型才能安全访问其属性。

**类型守卫的几种方式**：

1. **typeof**：`typeof x === 'string'` → 块内 x 是 string
2. **instanceof**：`x instanceof Date` → 块内 x 是 Date
3. **in 操作符**：`'name' in x` → 块内 x 有 name 属性
4. **字面量判断**：联合类型有 discriminant（区分字段）：`if (shape.kind === 'circle')`
5. **自定义类型守卫**（User-Defined Type Guard）：
   ```typescript
   function isUser(obj: any): obj is User {
     return obj && typeof obj.name === 'string' && typeof obj.id === 'number';
   }
   ```

**可辨识联合（Discriminated Union）**：
```typescript
type Shape = { kind: 'circle'; radius: number } | { kind: 'rect'; width: number; height: number };
// kind 字段就是 discriminant，switch(shape.kind) 可以精确类型收窄
```

**考察点**：
1. 类型收窄（Type Narrowing）的原理
2. 自定义类型守卫 `is` 语法
3. Exhaustive Check（穷举检查）配合 `never` 类型

**示例答案**：
类型守卫是 TypeScript 在运行时类型判断后，自动收窄变量类型的机制。在 `if (typeof x === 'string')` 块内，TypeScript 知道 x 是 string 类型，可以安全调用 string 方法。自定义类型守卫用 `x is SomeType` 返回类型声明，函数返回 true 时告诉 TypeScript 参数是该类型。实际项目里最推荐的是可辨识联合：在联合类型的每个成员上加一个 `kind` 或 `type` 字段（字面量类型），然后 switch/if 判断这个字段，TS 能精确收窄到对应分支的类型，IDE 有完整补全。可辨识联合还能配合穷举检查：在 default 分支 `const _: never = shape` 如果忘记处理某个 case，TS 会报错（因为此时 shape 不是 never），非常适合处理枚举值和 API 响应的 kind 字段。

---

*本题库持续更新，当前版本涵盖 24 道核心前端面试题，覆盖 HTML/CSS / JS / 浏览器 / 网络 / React / Vue / 性能 / 工程化 / TypeScript。*

---

<!-- navigation:start -->
[↑ 回到本页题目目录](#question-index) · [返回前端目录](README.md)
<!-- navigation:end -->
