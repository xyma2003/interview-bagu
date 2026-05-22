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

