# 前端面试八股 · 第四篇

---

### Q61: CSS Container Queries 是什么？它和 Media Queries 有什么区别？

**🏢 高频公司**：字节、小红书

**题目解析**：Container Queries 是 CSS 现代化的重要特性，考察候选人对最新规范的跟进。

**题目讲解**：
**Media Queries 的局限**：基于视口（viewport）尺寸，不能根据组件所在容器的大小响应。

**Container Queries**：组件根据其父容器大小响应变化，实现真正的"组件级响应式"：
```css
/* 定义容器 */
.card-wrapper {
  container-type: inline-size;  /* 监听内联方向尺寸 */
  container-name: card;
}

/* 根据容器宽度响应 */
@container card (min-width: 400px) {
  .card {
    display: flex;           /* 容器宽时：横向布局 */
    flex-direction: row;
  }
}

@container card (max-width: 399px) {
  .card {
    display: block;          /* 容器窄时：纵向布局 */
  }
}
```

**与 Media Queries 的对比**：
```css
/* Media Query：基于视口 */
@media (min-width: 768px) { .card { ... } }

/* Container Query：基于父容器 */
@container (min-width: 400px) { .card { ... } }
```

**适用场景**：
- 同一组件在侧边栏（窄）和主内容区（宽）需要不同布局
- 设计系统中的自适应组件（不依赖页面上下文）
- 复杂仪表板中的可拖拽 widget

**浏览器支持**：Chrome 105+、Safari 16+、Firefox 110+，已可以生产使用。

**考察点**：
1. `container-type` 的三种值（inline-size/size/normal）
2. 命名容器（container-name）用于多层嵌套
3. Container Style Queries（根据 CSS 变量值响应，更新特性）

**示例答案**：
Container Queries 解决了 Media Queries 最大的痛点——组件不应该依赖视口大小来响应，而应该根据自身所在容器响应。一个卡片组件放在宽容器里横向展示，放在窄侧边栏里纵向展示，用 Media Queries 根本做不到（不知道父容器多宽），但 Container Queries 完美解决。实现上给父容器加 `container-type: inline-size`，子组件用 `@container` 响应，语法和 Media Queries 几乎一致。这是设计系统的革命性特性，组件可以完全自给自足，不再依赖外部页面宽度。

---

