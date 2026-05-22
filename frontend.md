# 前端开发面试八股题库

> 覆盖：HTML/CSS / JavaScript核心 / ES6+ / 浏览器原理 / 网络 / React / Vue / 性能优化 / 工程化 / TypeScript

---

## 一、HTML / CSS

### Q1: 什么是 BFC（块级格式化上下文）？如何创建 BFC？有哪些应用场景？

**题目解析**：BFC 是 CSS 布局的核心概念，理解它能解释很多"神奇"的 CSS 行为，是高频面试题。

**题目讲解**：
BFC（Block Formatting Context）是页面上的一个独立渲染区域，内部元素的布局不受外部影响，外部也不受内部影响。

**创建 BFC 的方式**：
- `overflow: hidden / auto / scroll`（不是 visible）
- `display: flex / inline-flex / grid / inline-grid`
- `display: flow-root`（最语义化的方式）
- `position: absolute / fixed`
- `float: left / right`
- `contain: layout / content / paint`

**BFC 的特性**：
1. 内部 box 垂直排列
2. 同一 BFC 内相邻 margin 会合并，不同 BFC 不会
3. BFC 区域不会与 float 元素重叠
4. BFC 计算高度时包含内部浮动子元素

**应用场景**：
- **清除浮动**：父容器设 `overflow: hidden` 创建 BFC，让父容器包住浮动子元素（解决高度塌陷）
- **避免 margin 合并**：父子 margin 合并时，给父元素创建 BFC
- **自适应两栏布局**：左 float，右 `overflow: hidden` 创建 BFC，右侧不与左侧重叠

**考察点**：
1. BFC 的创建方式（至少说出 3 种）
2. 解决浮动高度塌陷的原理
3. Margin Collapse 的触发条件和解决方案

**面试官更想听**：
能解释 `display: flow-root` 为什么是最佳实践（语义明确，无副作用），以及 margin 合并只发生在垂直方向、同一 BFC 内相邻块级元素。

**示例答案**：
BFC 是 CSS 渲染中一块独立的格式化区域，内部元素按块级规则排列，且这个区域不会与外部浮动元素重叠，计算高度时也会包含内部浮动子元素。创建 BFC 最常用的方式是 `overflow: hidden` 或 `display: flow-root`（flow-root 是最语义化的，没有副作用）；`flex/grid` 容器本身也是 BFC。实际应用中，BFC 主要解决三个问题：1）清除浮动高度塌陷——给浮动元素的父容器设 `overflow: hidden`，父容器变为 BFC 后会将内部浮动纳入高度计算；2）阻止 margin 合并——父子元素 margin 合并时，给父元素创建 BFC 即可隔断；3）两栏自适应布局——左栏 float，右栏创建 BFC，右栏不会被浮动元素覆盖。

---

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

### Q4: JavaScript 的事件循环（Event Loop）是如何工作的？宏任务和微任务有什么区别？

**题目解析**：Event Loop 是 JavaScript 异步机制的核心，是前端面试的必考题。

**题目讲解**：
JavaScript 是单线程语言，通过 Event Loop 实现非阻塞异步。

**执行栈（Call Stack）**：同步代码直接在栈上执行。

**任务队列**：
- **宏任务（MacroTask）**：setTimeout、setInterval、I/O、UI 渲染、postMessage、MessageChannel
- **微任务（MicroTask）**：Promise.then/catch/finally、MutationObserver、queueMicrotask

**Event Loop 流程**：
1. 执行完当前宏任务（初始时是整个脚本）
2. 清空所有微任务队列（微任务执行过程中产生的新微任务也会立即加入并清空）
3. 如果需要，执行 UI 渲染
4. 取出下一个宏任务执行
5. 重复

**关键规则**：每个宏任务执行完后，立即清空所有微任务，然后才执行下一个宏任务。

```javascript
console.log('1');                    // 同步
setTimeout(() => console.log('2'));  // 宏任务
Promise.resolve().then(() => console.log('3')); // 微任务
console.log('4');                    // 同步
// 输出: 1, 4, 3, 2
```

**考察点**：
1. 微任务比宏任务优先执行
2. async/await 的微任务本质
3. Node.js 的 process.nextTick 优先级

**面试官更想听**：
能举出代码例子，说明微任务队列在每个宏任务后清空的机制；能分析 async/await 的实际执行顺序。

**示例答案**：
JavaScript 单线程通过 Event Loop 实现异步。执行栈处理同步代码，遇到异步操作（setTimeout、Promise 等）将回调分别注册到宏任务队列或微任务队列。Event Loop 的关键规则是：每执行完一个宏任务，立即清空全部微任务（包括微任务执行中新产生的微任务），然后才执行下一个宏任务。宏任务包括：script（整体代码）、setTimeout、setInterval、I/O；微任务包括：Promise 回调、MutationObserver、queueMicrotask。所以 Promise.then 总比 setTimeout 先执行，不管 setTimeout 的延迟设为多少。async/await 的本质是 Promise 的语法糖，await 后面的代码等价于 .then() 回调，即微任务，理解这一点就能正确分析 async 函数的执行顺序。

---

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

