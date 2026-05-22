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

