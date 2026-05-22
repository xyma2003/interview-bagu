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

### Q63: 如何实现前端无感刷新 Token（Silent Refresh）？

**🏢 高频公司**：腾讯、阿里

**题目讲解**：

**问题**：Access Token 有效期短（15 分钟），用户长时间操作时 Token 过期，体验差。

**解决方案：Silent Refresh**：
```javascript
class TokenManager {
  private refreshTimer: number | null = null
  
  setToken(accessToken: string, expiresIn: number, refreshToken: string) {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
    
    // 在过期前 60 秒自动刷新
    const refreshAt = (expiresIn - 60) * 1000
    this.refreshTimer = setTimeout(() => this.doRefresh(), refreshAt)
  }
  
  async doRefresh() {
    try {
      const { access_token, expires_in } = await api.refreshToken(this.refreshToken)
      this.setToken(access_token, expires_in, this.refreshToken)
    } catch (err) {
      // Refresh Token 也过期了，强制重新登录
      this.logout()
    }
  }
  
  // 请求拦截器：Token 过期时自动刷新后重试
  async request(config: RequestConfig) {
    if (this.isExpired()) {
      await this.doRefresh()
    }
    return fetch(config.url, { 
      ...config, 
      headers: { Authorization: `Bearer ${this.accessToken}` }
    })
  }
}
```

**并发请求的 Token 刷新（防止多次刷新）**：
```javascript
private refreshPromise: Promise<void> | null = null

async ensureValidToken() {
  if (!this.isExpired()) return
  
  // 如果已有刷新请求，等待它完成（不重复刷新）
  if (!this.refreshPromise) {
    this.refreshPromise = this.doRefresh().finally(() => {
      this.refreshPromise = null
    })
  }
  return this.refreshPromise
}
```

**考察点**：
1. 定时刷新（提前 60s）vs 失败重试（401 时刷新）
2. 并发请求时只刷新一次的实现
3. Refresh Token 本身过期的处理（静默登出）

---

### Q64: Web 无障碍（Accessibility）的核心标准是什么？ARIA 属性怎么用？

**🏢 高频公司**：阿里（大厂有无障碍要求）

**题目讲解**：

**WCAG 核心原则（POUR）**：
- **Perceivable**：可感知（图片 alt、视频字幕）
- **Operable**：可操作（键盘可访问、足够点击区域）
- **Understandable**：可理解（清晰的错误提示、一致的导航）
- **Robust**：健壮（兼容辅助技术如屏幕阅读器）

**常用 ARIA 属性**：
```html
<!-- 角色（role）：告诉屏幕阅读器这是什么 -->
<div role="button" tabindex="0">自定义按钮</div>

<!-- 状态（aria-*）：描述当前状态 -->
<button aria-expanded="false" aria-controls="menu">菜单</button>
<div id="menu" hidden>...</div>

<!-- 标签（aria-label / aria-labelledby）：为元素命名 -->
<button aria-label="关闭对话框">✕</button>
<input aria-labelledby="username-label" />
<label id="username-label">用户名</label>

<!-- 动态区域（aria-live）：通知内容变化 -->
<div aria-live="polite" aria-atomic="true">
  <!-- 屏幕阅读器会朗读这里的变化 -->
  {searchResultsCount} 个搜索结果
</div>
```

**实际检测工具**：
- Chrome DevTools → Accessibility 面板（查看可访问性树）
- axe-core（自动检测，Storybook 集成）
- Lighthouse Accessibility 评分

**考察点**：
1. 语义化 HTML 优于 ARIA（`<button>` 好过 `<div role="button">`）
2. 键盘焦点管理（Modal 打开时焦点移入，关闭时移回）
3. 颜色对比度要求（WCAG AA：4.5:1）

**示例答案**：
无障碍的第一原则是"先用正确的 HTML 语义标签"——`<button>` 自带键盘访问和屏幕阅读器支持，不需要任何 ARIA；`<img alt="描述">` 让屏幕阅读器能理解图片。ARIA 是补丁，用于原生 HTML 无法表达的交互（如自定义下拉、Tab 切换）。实践上最重要的是：所有交互元素必须能键盘操作（Tab 可达，Enter/Space 可激活）；动态内容变化用 `aria-live="polite"` 通知屏幕阅读器；Modal 打开时把焦点陷入其中（防止 Tab 跑到背后的内容）。axe-core 可以在 CI 中自动扫描无障碍问题，能发现约 57% 的自动可检测的无障碍缺陷。

---

### Q65: 浏览器的 Performance API 有哪些常用方法？如何精确测量页面性能？

**🏢 高频公司**：字节、腾讯

**题目讲解**：

**Navigation Timing（页面加载时序）**：
```javascript
const timing = performance.getEntriesByType('navigation')[0]
const metrics = {
  DNS:        timing.domainLookupEnd - timing.domainLookupStart,
  TCP:        timing.connectEnd - timing.connectStart,
  TTFB:       timing.responseStart - timing.requestStart,
  Download:   timing.responseEnd - timing.responseStart,
  DOMParse:   timing.domContentLoadedEventEnd - timing.responseEnd,
  Total:      timing.loadEventEnd - timing.startTime,
}
```

**User Timing（自定义测量）**：
```javascript
// 标记时间点
performance.mark('hero-image-start')
await loadHeroImage()
performance.mark('hero-image-end')

// 测量两点间的时间
performance.measure('hero-image-load', 'hero-image-start', 'hero-image-end')

const measure = performance.getEntriesByName('hero-image-load')[0]
console.log(`图片加载: ${measure.duration.toFixed(2)}ms`)
```

**PerformanceObserver（实时监听）**：
```javascript
// 监听 LCP
new PerformanceObserver(list => {
  const entries = list.getEntries()
  const lcp = entries[entries.length - 1]
  console.log('LCP:', lcp.startTime, 'ms', '元素:', lcp.element)
}).observe({ type: 'largest-contentful-paint', buffered: true })

// 监听长任务（>50ms 阻塞主线程）
new PerformanceObserver(list => {
  for (const entry of list.getEntries()) {
    console.warn(`长任务: ${entry.duration.toFixed(0)}ms`, entry)
  }
}).observe({ entryTypes: ['longtask'] })
```

**考察点**：
1. `buffered: true` 获取已发生的历史性能条目
2. 长任务对 INP（交互响应）的影响
3. `performance.now()` vs `Date.now()`（前者微秒精度，后者毫秒）

---

### Q66: 什么是渐进式增强（Progressive Enhancement）和优雅降级（Graceful Degradation）？

**🏢 高频公司**：阿里、腾讯

**题目讲解**：

**渐进式增强（Progressive Enhancement）**：
从最基础的功能开始构建，逐层添加增强特性：
1. HTML 语义结构（所有浏览器可用）
2. CSS 样式增强（支持 CSS 的浏览器）
3. JavaScript 交互（支持 JS 的浏览器）
4. 高级 API（支持最新特性的浏览器）

**优雅降级（Graceful Degradation）**：
先针对现代浏览器开发完整功能，再为旧浏览器提供兜底方案。

**现代实践（CSS Feature Detection）**：
```css
/* @supports 检测特性支持 */
@supports (display: grid) {
  .container { display: grid; }
}

@supports not (display: grid) {
  .container { display: flex; }
}

/* CSS 自定义属性（变量）降级 */
.element {
  color: #007bff;                    /* 旧浏览器 fallback */
  color: var(--primary-color, #007bff);  /* 现代浏览器用变量 */
}
```

**JavaScript 特性检测**：
```javascript
// 不要用浏览器嗅探，要用特性检测
if ('IntersectionObserver' in window) {
  // 使用 IO
} else {
  // 降级到 scroll 事件
}

// 或者动态加载 polyfill
if (!window.ResizeObserver) {
  await import('resize-observer-polyfill')
}
```

**考察点**：
1. 两种策略的选择依据（新项目 PE，老项目 GD）
2. Can I Use 检查特性支持
3. Babel 和 PostCSS 的自动降级

---

