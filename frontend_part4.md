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

### Q62: 前端国际化（i18n）的实现原理是什么？如何处理复数和日期格式？

**🏢 高频公司**：阿里、字节

**题目讲解**：

**基础实现（react-i18next）**：
```javascript
// i18n.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: { greeting: 'Hello, {{name}}!', item_count: '{{count}} item' } },
    zh: { translation: { greeting: '你好，{{name}}！', item_count: '{{count}} 个项目' } }
  },
  lng: navigator.language,  // 自动检测浏览器语言
  fallbackLng: 'en',
})

// 组件中使用
const { t } = useTranslation()
t('greeting', { name: 'Alice' })  // "Hello, Alice!" 或 "你好，Alice！"
```

**复数处理（Plural Rules）**：
```javascript
// 英语：1 item, 2 items（两种）
// 俄语：1 предмет, 2 предмета, 5 предметов（三种）
// 阿拉伯语：0/1/2/3-10/11+（六种）

// react-i18next 支持 ICU 复数
{ 
  "cart": "{count, plural, =0 {空购物车} one {# 件商品} other {# 件商品}}"
}
t('cart', { count: 5 })   // "5 件商品"
```

**日期/货币格式（Intl API）**：
```javascript
// 不需要第三方库，浏览器原生支持
const formatDate = (date: Date, locale: string) => 
  new Intl.DateTimeFormat(locale, { 
    year: 'numeric', month: 'long', day: 'numeric' 
  }).format(date)

formatDate(new Date(), 'zh-CN')  // "2026年5月22日"
formatDate(new Date(), 'en-US')  // "May 22, 2026"
formatDate(new Date(), 'de-DE')  // "22. Mai 2026"

// 货币
new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(1234.5)
// "¥1,234.50"
```

**RTL 语言支持**（阿拉伯语/希伯来语）：
```css
[dir='rtl'] .navbar {
  flex-direction: row-reverse;
}
/* 或者用 CSS 逻辑属性 */
.element {
  margin-inline-start: 16px;  /* 自动适应 LTR/RTL */
}
```

**考察点**：
1. 翻译文件的懒加载（按语言分包，首屏只加载当前语言）
2. ICU Message Format 复数规则
3. CSS 逻辑属性（margin-inline/padding-block）支持 RTL

**示例答案**：
i18n 的核心是文本外化（把硬编码字符串替换为 key）+ 动态加载对应语言包。react-i18next 是 React 最主流的方案，`t('key', vars)` 函数在运行时根据当前语言返回翻译文本。复数是 i18n 最复杂的部分，不同语言的复数规则截然不同（中文只有一种，英语两种，俄语三种，阿拉伯语六种），用 ICU Message Format 处理最标准。日期、数字、货币格式直接用浏览器原生的 `Intl` API，支持所有语言的本地化格式，不需要额外库。工程上翻译文件要按语言懒加载（`import('./en.json')`），不然所有语言包都打入 bundle 浪费流量。

---

