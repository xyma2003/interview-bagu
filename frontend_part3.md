# 前端面试八股 · 第三篇

> 覆盖：CSS 动画 / 状态管理 / 前端安全进阶 / 浏览器存储 / Web Workers / 性能进阶

---

### Q49: CSS 动画性能优化：transform 为什么比 top/left 更流畅？

**🏢 高频公司**：腾讯、字节、小红书

**题目解析**：CSS 动画性能是前端面试的高频考察点，理解渲染管线才能写出高性能动画。

**题目讲解**：
页面渲染分四阶段：**Layout（布局）→ Paint（绘制）→ Composite（合成）**

- **top/left**：改变元素几何位置，触发 **Layout → Paint → Composite**（完整三阶段），影响周围元素，代价极高
- **opacity**：只影响透明度，只需 **Composite**（跳过 Layout 和 Paint）
- **transform**：在 Compositor 线程处理，**只需 Composite**，完全不经过主线程

**为什么 transform 不触发 Layout**：
浏览器会把 `will-change: transform` 或 transform 动画的元素提升为独立的合成层（Compositing Layer），这个层的变换（平移/缩放/旋转）只需要 GPU 矩阵运算合成，不影响文档流。

```css
/* ❌ 性能差，触发 Layout + Repaint */
@keyframes bad {
  from { left: 0; }
  to { left: 200px; }
}

/* ✅ 性能好，只触发 Composite */
@keyframes good {
  from { transform: translateX(0); }
  to { transform: translateX(200px); }
}
```

**will-change 的使用**：
```css
.animated-element {
  will-change: transform, opacity;  /* 提前提升为合成层 */
}
/* ⚠️ 不要滥用！每个合成层消耗显存，过多会适得其反 */
```

**考察点**：
1. 三个渲染阶段（Layout/Paint/Composite）各触发条件
2. 合成层的显存代价（不要所有元素都 will-change）
3. Chrome DevTools Performance 面板分析帧率

**示例答案**：
浏览器渲染管线是 Layout → Paint → Composite。top/left 改变几何属性，触发整条管线，还可能影响相邻元素，代价最高。transform 被提升到 Compositor 线程，完全跳过 Layout 和 Paint，GPU 直接做矩阵运算，即使主线程被 JS 阻塞，transform 动画也不受影响，这是为什么 CSS transform 动画比 JS 的 setInterval 动画流畅的根本原因。will-change 告诉浏览器提前提升元素为合成层，可以消除首帧的"提升开销"，但每个合成层消耗显存，不能滥用（只对真正需要动画的元素加）。

---

### Q50: 前端状态管理：Redux vs Zustand vs Jotai，如何选型？

**🏢 高频公司**：字节、阿里、小红书

**题目讲解**：

**Redux（经典 Flux 架构）**：
- 单一 Store，Action → Reducer → State 的严格单向数据流
- 可预测性强，DevTools 支持时间旅行调试
- 缺点：模板代码多（action types / action creators / reducers）
- Redux Toolkit (RTK) 大幅减少样板，是现代 Redux 的标准写法

**Zustand（轻量）**：
```javascript
import { create } from 'zustand'

const useStore = create((set, get) => ({
  count: 0,
  increment: () => set(state => ({ count: state.count + 1 })),
  double: () => set({ count: get().count * 2 }),
}))

// 组件中
const { count, increment } = useStore()
```
- 无 Provider、无模板代码、自动处理不必要重渲染
- 支持 immer、devtools、persist 中间件
- 适合中小型应用，上手 5 分钟

**Jotai（原子化）**：
```javascript
import { atom, useAtom } from 'jotai'

const countAtom = atom(0)
const doubleAtom = atom(get => get(countAtom) * 2)  // derived atom

function Counter() {
  const [count, setCount] = useAtom(countAtom)
  const double = useAtomValue(doubleAtom)
}
```
- 原子化状态，按需订阅，不存在"全局重渲染"问题
- 适合细粒度状态（表单、UI 局部状态）

**选型建议**：
- 大型团队、需要严格规范、复杂状态逻辑 → **Redux Toolkit**
- 中小项目、团队偏好简洁 API → **Zustand**（推荐）
- 细粒度原子状态、与 React Suspense 深度集成 → **Jotai**
- 服务端状态（API 数据缓存）→ **React Query / TanStack Query**（专门的服务器状态库）

**考察点**：
1. 服务器状态 vs 客户端状态的区分（不要用 Redux 管理 API 响应数据）
2. Zustand 的 selector 优化（精细化订阅防止不必要重渲染）
3. React Query 的 cache / stale-while-revalidate 机制

**示例答案**：
状态管理的选型先问"什么类型的状态"。服务端数据（API 响应、分页列表）推荐 React Query，它专门处理缓存、失效、后台同步，省掉大量手写的 loading/error/cache 逻辑。客户端 UI 状态，中小型项目 Zustand 是最佳选择，代码量极少（一个 create() 调用），没有 Redux 的 boilerplate，性能又好（基于 selector 精细订阅）。全局复杂状态 + 大团队规范需求才考虑 Redux Toolkit（RTK），它的 createSlice + createAsyncThunk 已经大幅减少样板。Jotai 适合原子化的局部状态，如表单的每个字段独立 atom，互不影响，重渲染最少。

---

### Q51: IndexedDB vs LocalStorage vs SessionStorage vs Cookie 的区别和适用场景

**🏢 高频公司**：腾讯、字节

**题目讲解**：

| 特性 | Cookie | LocalStorage | SessionStorage | IndexedDB |
|------|--------|--------------|----------------|-----------|
| 存储大小 | 4KB | 5-10MB | 5-10MB | 无限制（受磁盘）|
| 生命周期 | 可设置 | 永久 | Tab 关闭即清除 | 永久 |
| 与服务端 | 每次请求自动携带 | 纯客户端 | 纯客户端 | 纯客户端 |
| 数据类型 | 字符串 | 字符串 | 字符串 | 结构化数据 |
| 异步 | 同步 | 同步 | 同步 | 异步 |
| 索引/查询 | ❌ | ❌ | ❌ | ✅ |
| 事务 | ❌ | ❌ | ❌ | ✅ |

**适用场景**：
- **Cookie**：身份认证 token（HttpOnly + Secure + SameSite），极小量需要服务端读取的数据
- **LocalStorage**：用户偏好设置、主题、表单草稿（不敏感、不频繁读写）
- **SessionStorage**：单页流程的临时数据（购物流程中间状态）
- **IndexedDB**：离线数据缓存、大量结构化数据、需要查询的本地数据库（PWA 核心）

**考察点**：
1. Cookie 的 HttpOnly/Secure/SameSite 安全属性
2. LocalStorage 的同步阻塞问题（大量数据时）
3. IndexedDB 的事务机制

**示例答案**：
选存储先看三个维度：数据大小、是否需要服务端访问、生命周期。Session token 用 Cookie（HttpOnly 防 XSS 读取，SameSite=Strict 防 CSRF）；用户主题/偏好用 LocalStorage（简单、永久）；单次会话临时状态用 SessionStorage（Tab 关闭自动清除）；大量结构化数据（离线缓存的商品列表、聊天记录）用 IndexedDB（支持索引和查询，不受 5MB 限制）。PWA 的离线能力完全依赖 IndexedDB + Cache API，而不是 LocalStorage（太小且无查询）。

---

### Q52: Web Workers 的用途是什么？SharedArrayBuffer 和 Atomics 解决什么问题？

**🏢 高频公司**：字节

**题目讲解**：
**Web Workers**：在独立线程里运行 JS，不阻塞主线程（UI 渲染、事件处理）。

**适用场景**：
- 大型数据处理（CSV 解析、图片压缩、加密计算）
- 复杂算法（路径规划、图形渲染计算）
- Service Worker（特殊的 Worker，拦截网络请求）

**基本用法**：
```javascript
// main.js
const worker = new Worker('./worker.js')
worker.postMessage({ data: largeArray })  // 结构化克隆传递（拷贝）
worker.onmessage = e => console.log('结果:', e.data)

// worker.js
self.onmessage = e => {
  const result = heavyComputation(e.data.data)
  self.postMessage(result)
}
```

**Transferable Objects（零拷贝传递）**：
```javascript
// ArrayBuffer 可以转让所有权（不拷贝，main 线程失去访问权）
worker.postMessage({ buffer: arrayBuffer }, [arrayBuffer])
```

**SharedArrayBuffer（真正共享内存）**：
```javascript
// main.js
const sab = new SharedArrayBuffer(1024)
worker.postMessage({ buffer: sab })

// worker.js（两边访问同一块内存）
const arr = new Int32Array(e.data.buffer)
Atomics.add(arr, 0, 1)  // 原子加法，线程安全
```

**Atomics 解决什么问题**：
多线程共享内存时的竞态条件——`arr[0]++` 读-改-写不是原子操作，Atomics.add 保证原子性。Atomics.wait/notify 实现互斥锁。

**考察点**：
1. postMessage 的结构化克隆 vs Transferable（性能差异）
2. SharedArrayBuffer 被 Spectre 攻击限制，需要 COOP/COEP 响应头
3. Worker 无法操作 DOM

**示例答案**：
Web Worker 把 CPU 密集型任务移到独立线程，主线程专注 UI 交互。postMessage 默认做结构化克隆（深拷贝），大数据时开销大，用 Transferable 转让 ArrayBuffer 所有权实现零拷贝。SharedArrayBuffer 让多个 Worker 和主线程共享同一块内存，用 Atomics API 做原子操作保证线程安全，适合需要高频通信的并行计算（图像处理、WebAssembly 计算密集任务）。注意 SharedArrayBuffer 需要页面设置 COOP/COEP 安全头（Spectre 漏洞导致被浏览器限制，加响应头后解除）。

---

### Q53: 前端如何实现大文件分片上传？断点续传的原理是什么？

**🏢 高频公司**：字节、腾讯、阿里

**题目讲解**：
```javascript
async function uploadLargeFile(file: File) {
  const CHUNK_SIZE = 5 * 1024 * 1024  // 5MB 每片
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
  const fileHash = await calculateHash(file)  // 文件唯一标识
  
  // 1. 检查服务端已上传的分片（断点续传）
  const { uploadedChunks } = await api.checkUploadStatus(fileHash)
  
  // 2. 并发上传缺失的分片
  const tasks = []
  for (let i = 0; i < totalChunks; i++) {
    if (uploadedChunks.includes(i)) continue  // 已上传，跳过
    const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
    tasks.push(uploadChunk(chunk, i, fileHash))
  }
  
  // 控制并发数（最多 3 个同时上传）
  await runWithConcurrency(tasks, 3)
  
  // 3. 通知服务端合并
  await api.mergeChunks(fileHash, totalChunks)
}

async function runWithConcurrency(tasks, limit) {
  const pool = new Set()
  for (const task of tasks) {
    const p = task().finally(() => pool.delete(p))
    pool.add(p)
    if (pool.size >= limit) await Promise.race(pool)
  }
  await Promise.all(pool)
}
```

**文件 Hash 计算（Web Worker 异步）**：
```javascript
// 大文件 MD5 计算放到 Worker，防止主线程卡顿
async function calculateHash(file: File): Promise<string> {
  return new Promise(resolve => {
    const worker = new Worker('./hash-worker.js')
    worker.postMessage(file)
    worker.onmessage = e => resolve(e.data.hash)
  })
}
```

**服务端合并（Node.js）**：
```javascript
// 按分片序号顺序合并
async function mergeChunks(fileHash, totalChunks) {
  const ws = fs.createWriteStream(`./uploads/${fileHash}`)
  for (let i = 0; i < totalChunks; i++) {
    const chunk = fs.readFileSync(`./temp/${fileHash}-${i}`)
    ws.write(chunk)
  }
  ws.end()
}
```

**考察点**：
1. 并发控制（p-limit 库或手写 concurrency pool）
2. 文件 hash 计算（MD5/spark-md5，用 Worker 避免主线程阻塞）
3. 断点续传的服务端状态记录（Redis 存已上传分片列表）

**示例答案**：
大文件上传核心是切片 + 并发 + 断点续传。先计算文件内容的 Hash（用 spark-md5 按分片逐步计算，放 Worker 里避免 UI 卡顿），用 Hash 作为文件唯一标识。上传前先问服务端"已经上传了哪些分片"，跳过已上传的，只传缺失部分（断点续传）。并发控制很关键，太少慢、太多占带宽，一般 3-5 个并发是最优区间，用 p-limit 或手写 concurrency pool 控制。所有分片上传完后通知服务端合并，服务端按序号拼接文件流。进度展示实时更新（已上传分片数 / 总分片数），用 onprogress 事件追踪每个分片的上传进度。

---

### Q54: requestAnimationFrame vs setTimeout 实现动画的区别？

**🏢 高频公司**：腾讯、字节

**题目讲解**：
- **setTimeout(fn, 16)**：在指定时间后将回调加入宏任务队列，但实际执行时间不精确（受主线程阻塞影响），可能跳帧或与浏览器刷新不同步
- **requestAnimationFrame（rAF）**：在浏览器下次绘制前调用回调，与屏幕刷新率同步（60Hz → 16.7ms），由浏览器调度，Tab 切换到后台时自动暂停（节省电量）

```javascript
// ❌ setTimeout 动画：时机不精确，可能掉帧
function animate() {
  box.style.left = (parseInt(box.style.left) + 1) + 'px'
  setTimeout(animate, 16)
}

// ✅ rAF 动画：与屏幕刷新同步
function animate(timestamp) {
  const elapsed = timestamp - startTime
  box.style.transform = `translateX(${elapsed * 0.1}px)`
  if (elapsed < 1000) requestAnimationFrame(animate)
}
requestAnimationFrame(animate)
```

**性能差异**：
- rAF 回调在 Paint 之前执行，更改 DOM/CSS 会合并到当前帧
- setTimeout 是宏任务，执行后浏览器才会 Paint，如果每帧有多次 setTimeout 会有多次 Paint

**微任务 vs 宏任务 vs rAF 执行顺序**：
```
宏任务 → 清空微任务 → rAF 回调 → Layout → Paint → Composite → 下一帧
```

**考察点**：
1. rAF 的"下一帧"语义 vs setTimeout 的"定时"语义
2. rAF 在后台标签页自动暂停
3. 高精度时间戳（DOMHighResTimeStamp，微秒级精度）

---

### Q55: 前端监控 SDK 如何设计？如何采集 Core Web Vitals？

**🏢 高频公司**：字节、阿里

**题目讲解**：

**监控 SDK 的采集点**：
```javascript
class Monitor {
  init() {
    this._collectWebVitals()
    this._collectErrors()
    this._collectResourceTiming()
    this._collectUserBehavior()
  }
  
  // 1. Web Vitals（LCP/INP/CLS）
  _collectWebVitals() {
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          this.report('LCP', entry.startTime)
        }
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true })
    
    // 使用 web-vitals 库更简便
    import { onLCP, onINP, onCLS } from 'web-vitals'
    onLCP(metric => this.report('LCP', metric.value))
  }
  
  // 2. JS 错误
  _collectErrors() {
    window.addEventListener('error', e => {
      this.report('js_error', {
        message: e.message, source: e.filename,
        lineno: e.lineno, stack: e.error?.stack
      })
    })
    window.addEventListener('unhandledrejection', e => {
      this.report('promise_error', { reason: String(e.reason) })
    })
  }
  
  // 3. 上报
  report(type, data) {
    const payload = { type, data, url: location.href, ts: Date.now() }
    // 使用 sendBeacon 在页面关闭时也能可靠上报
    navigator.sendBeacon('/api/monitor', JSON.stringify(payload))
  }
}
```

**资源加载时序（PerformanceResourceTiming）**：
```javascript
const entries = performance.getEntriesByType('resource')
entries.forEach(e => {
  console.log(e.name, e.duration, e.transferSize)
})
```

**用户行为采集（无痕埋点）**：
```javascript
// 事件委托，采集所有点击的元素路径
document.addEventListener('click', e => {
  const path = getElementPath(e.target)  // 元素 CSS 选择器路径
  monitor.report('click', { path, x: e.clientX, y: e.clientY })
})
```

**考察点**：
1. PerformanceObserver API 的 buffered 选项（采集历史条目）
2. sendBeacon 的可靠性（页面关闭不丢失）
3. Source Map 上传与错误还原

---

### Q56: 如何实现虚拟滚动中的动态高度（Variable Height Virtual List）？

**🏢 高频公司**：字节、小红书

**题目讲解**：

动态高度虚拟列表的关键问题：不知道每项高度，无法预先计算 offsetTop。

**解决方案：预估 + 实测修正**：
```javascript
class VirtualList {
  constructor(items, estimatedItemHeight = 50) {
    this.items = items
    this.estimatedItemHeight = estimatedItemHeight
    this.heightCache = new Map()  // index → 实际高度
    this.offsetCache = [0]        // index → offsetTop（前缀和）
  }
  
  // 获取第 i 项的 offsetTop（前缀和）
  getItemOffset(index) {
    let offset = this.offsetCache[index] || 0
    if (!this.offsetCache[index + 1]) {
      for (let i = index; i < this.items.length; i++) {
        const h = this.heightCache.get(i) || this.estimatedItemHeight
        this.offsetCache[i + 1] = (this.offsetCache[i] || 0) + h
      }
    }
    return this.offsetCache[index]
  }
  
  // 二分查找当前 scrollTop 对应的 startIndex
  getStartIndex(scrollTop) {
    let lo = 0, hi = this.items.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (this.getItemOffset(mid) <= scrollTop) lo = mid + 1
      else hi = mid
    }
    return lo - 1
  }
  
  // DOM 渲染后用 ResizeObserver 修正高度
  observeItem(el, index) {
    const ro = new ResizeObserver(entries => {
      const newHeight = entries[0].contentRect.height
      const oldHeight = this.heightCache.get(index) || this.estimatedItemHeight
      if (newHeight !== oldHeight) {
        this.heightCache.set(index, newHeight)
        // 更新 index 之后的所有偏移量
        this.invalidateOffsetCache(index)
        this.forceUpdate()
      }
    })
    ro.observe(el)
  }
}
```

**考察点**：
1. 前缀和数组存储 offsetTop（避免每次 O(N) 遍历求位置）
2. ResizeObserver 实测高度后修正缓存
3. react-virtuoso 的实现思路（自带动态高度支持）

---

### Q57: React Query 的核心原理是什么？它如何管理缓存和后台更新？

**🏢 高频公司**：阿里、字节、小红书

**题目讲解**：
React Query（TanStack Query）专门解决"服务端状态"管理问题，核心是三个机制：

**1. 缓存（QueryCache）**：
- 每个 query 有唯一 key，结果存入内存缓存
- `staleTime`：多久内数据是新鲜的（默认 0）
- `gcTime`：数据不被使用后多久从缓存删除（默认 5 分钟）

```javascript
const { data, isLoading, isFetching } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  staleTime: 1000 * 60 * 5,  // 5分钟内不重新请求
  gcTime: 1000 * 60 * 10,    // 10分钟未使用后删除缓存
})
```

**2. 后台更新（Stale-While-Revalidate）**：
- 数据超过 staleTime 后标记为 stale
- 下次组件 mount 或窗口 focus 时，先返回旧数据（不阻塞渲染），同时后台重新请求
- 新数据返回后更新 UI（用户感知不到等待）

**3. 自动重试和失效**：
- `useMutation` 的 `onSuccess` 可调用 `queryClient.invalidateQueries` 使相关缓存失效
- 失败自动重试 3 次

**与 Redux 的对比**：
- Redux 存储状态逻辑（客户端 UI 状态）
- React Query 存储服务端数据（网络请求结果）
- 两者不冲突，搭配使用

**示例答案**：
React Query 的核心是"服务端状态的本地缓存管理"。每个请求用唯一 queryKey 标识，结果缓存到内存，staleTime 控制数据新鲜度（0 = 每次都认为过期，需要后台刷新）。关键机制是 SWR：先返回缓存数据让页面立刻可用，同时后台静默发起更新请求，新数据来了再刷新。比手动写 loading/error/data state + useEffect 请求干净很多，还自动处理重试、竞态条件、重复请求合并。数据失效通过 `invalidateQueries` 触发，mutation 成功后调一下，相关页面自动重新拉取，不需要手动管理缓存一致性。

---

### Q58: 前端如何实现 OAuth 2.0 登录流程？PKCE 解决了什么问题？

**🏢 高频公司**：阿里、腾讯

**题目讲解**：
**Authorization Code Flow**（服务端有 server）：
```
1. 前端跳转到授权服务器（携带 client_id + redirect_uri）
2. 用户登录授权，授权服务器回跳 redirect_uri + code
3. 后端用 code 换 access_token（携带 client_secret，不暴露给前端）
4. 后端返回 token 给前端（Set-Cookie HttpOnly）
```

**PKCE（Proof Key for Code Exchange）**：
解决 SPA/移动端（无 server，无法保护 client_secret）的安全问题：
```javascript
// 1. 生成 code_verifier（随机字符串）
const codeVerifier = crypto.randomUUID() + crypto.randomUUID()

// 2. 计算 code_challenge = BASE64URL(SHA256(code_verifier))
const challenge = btoa(String.fromCharCode(...new Uint8Array(
  await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier))
))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

// 3. 授权请求携带 code_challenge
const authUrl = `${authServer}/authorize?code_challenge=${challenge}&code_challenge_method=S256&...`

// 4. 换 token 时携带 code_verifier（授权服务器验证 SHA256(verifier) === challenge）
const tokenResponse = await fetch(`${authServer}/token`, {
  method: 'POST',
  body: new URLSearchParams({
    code, code_verifier: codeVerifier, ...
  })
})
```

**PKCE 的安全性**：即使 code 被中间人截获，没有 code_verifier 也无法换 token（verifier 只存在客户端，从未传输到授权服务器，只传了它的哈希）。

**考察点**：
1. Authorization Code Flow vs Implicit Flow（后者直接返回 token，已废弃）
2. PKCE 的 code_verifier 和 code_challenge 的关系
3. Token 存储（不建议 LocalStorage，推荐 HttpOnly Cookie 或 refresh token rotation）

---

### Q59: 如何检测页面的内存泄漏？常见的内存泄漏场景有哪些？

**🏢 高频公司**：字节、腾讯

**题目讲解**：

**常见内存泄漏场景**：
1. **未移除的事件监听**：`addEventListener` 后组件销毁没有 `removeEventListener`
2. **未清除的 Timer**：setInterval/setTimeout 持有外部对象引用
3. **全局变量积累**：不小心挂载到 window 上的对象
4. **闭包引用**：闭包持有大对象引用，闭包本身被长期持有
5. **DOM 引用**：JS 里保存了 DOM 元素的引用，DOM 从页面移除后引用仍在
6. **React 组件**：useEffect 里的订阅/监听没有在 cleanup 函数里取消

**检测方法**：

**Chrome DevTools Memory 面板**：
1. Performance → Record → 操作页面 → Stop → 查看 Memory 曲线是否下降（GC 后）
2. Memory → Heap Snapshot（快照）→ 对比前后快照看增量对象
3. Memory → Allocation instrumentation on timeline（实时追踪分配）

**代码层检测（弱引用追踪）**：
```javascript
const weakRef = new WeakRef(myObject)
// 如果 GC 回收了 myObject，weakRef.deref() 返回 undefined
setInterval(() => {
  if (weakRef.deref() === undefined) console.log('已被 GC 回收')
}, 1000)
```

**React 最佳实践**：
```javascript
useEffect(() => {
  const handler = () => { /* ... */ }
  window.addEventListener('resize', handler)
  const timer = setInterval(fetchData, 5000)
  
  return () => {                         // ✅ cleanup
    window.removeEventListener('resize', handler)
    clearInterval(timer)
  }
}, [])
```

**考察点**：
1. WeakMap/WeakRef 的 GC 友好性
2. Chrome Heap Snapshot 的分析方法
3. 全局对象泄漏的检测（window 属性数量变化）

---

### Q60: Webpack 的 Tree Shaking 为什么只对 ES Module 有效？

**🏢 高频公司**：字节、阿里

**题目讲解**：
**Tree Shaking 原理**：在打包时静态分析代码，删除未被使用的 export，减小 bundle 体积。

**为什么需要 ES Module**：
- **CommonJS**：`require()` 是动态的，运行时才知道导入了什么（`require(condition ? 'a' : 'b')`），静态分析无法确定哪些代码被用到
- **ES Module**：`import/export` 是静态的，编译时就能确定依赖关系，工具可以构建完整的引用图

**必要条件**：
1. 源码用 ES Module（`import/export`）
2. package.json 有 `"sideEffects": false`（告诉 Webpack 没有副作用的文件可以安全删除）
3. 不要用 Babel 把 ESM 编译成 CommonJS（`modules: false`）
4. 生产模式（`mode: 'production'`，启用 Terser 删除死代码）

**副作用（sideEffects）**：
```json
{
  "sideEffects": ["./src/polyfill.js", "*.css"]
}
```
有副作用的文件即使没有被 import，也不能被删除（如全局 polyfill、CSS）。

**考察点**：
1. `sideEffects: false` 的作用（允许未用 export 的文件整体被删除）
2. 为什么 Lodash 默认无法 Tree Shake（CommonJS）→ 用 lodash-es
3. Rollup 的 Tree Shaking 比 Webpack 更彻底（最初的 Tree Shaking 实现者）

**示例答案**：
Tree Shaking 依赖静态分析——编译时就能确定哪些代码用到了，哪些没用。ES Module 的 import/export 是静态声明，编译器可以构建完整的依赖图，找出未被任何入口引用的 export 标记为 dead code，再由 Terser 删除。CommonJS 的 require 是函数调用，执行时才知道参数，静态分析无法处理。所以用 lodash 时，`import { debounce } from 'lodash'` 无法 Tree Shake（lodash 是 CJS），应该改用 `import debounce from 'lodash-es/debounce'` 或 `import { debounce } from 'lodash-es'`（ESM 版本）。sideEffects 字段是 Tree Shaking 的"安全声明"，`false` 表示所有文件都没有副作用，Webpack 可以大胆删除未用的模块；对于有副作用的文件（全局 CSS、polyfill）要在数组里声明，避免被误删。

---

*本篇共 12 题（Q49-Q60），与前两篇合计 60 道前端面试题。*
### Q49: CSS 动画性能优化：transform 为什么比 top/left 更流畅？

**🏢 高频公司**：腾讯、字节、小红书

**题目解析**：CSS 动画性能是前端面试的高频考察点，理解渲染管线才能写出高性能动画。

**题目讲解**：
页面渲染分四阶段：**Layout（布局）→ Paint（绘制）→ Composite（合成）**

- **top/left**：改变元素几何位置，触发 **Layout → Paint → Composite**（完整三阶段），影响周围元素，代价极高
- **opacity**：只影响透明度，只需 **Composite**（跳过 Layout 和 Paint）
- **transform**：在 Compositor 线程处理，**只需 Composite**，完全不经过主线程

**为什么 transform 不触发 Layout**：
浏览器会把 `will-change: transform` 或 transform 动画的元素提升为独立的合成层（Compositing Layer），这个层的变换（平移/缩放/旋转）只需要 GPU 矩阵运算合成，不影响文档流。

```css
/* ❌ 性能差，触发 Layout + Repaint */
@keyframes bad {
  from { left: 0; }
  to { left: 200px; }
}

/* ✅ 性能好，只触发 Composite */
@keyframes good {
  from { transform: translateX(0); }
  to { transform: translateX(200px); }
}
```

**will-change 的使用**：
```css
.animated-element {
  will-change: transform, opacity;  /* 提前提升为合成层 */
}
/* ⚠️ 不要滥用！每个合成层消耗显存，过多会适得其反 */
```

**考察点**：
1. 三个渲染阶段（Layout/Paint/Composite）各触发条件
2. 合成层的显存代价（不要所有元素都 will-change）
3. Chrome DevTools Performance 面板分析帧率

**示例答案**：
浏览器渲染管线是 Layout → Paint → Composite。top/left 改变几何属性，触发整条管线，还可能影响相邻元素，代价最高。transform 被提升到 Compositor 线程，完全跳过 Layout 和 Paint，GPU 直接做矩阵运算，即使主线程被 JS 阻塞，transform 动画也不受影响，这是为什么 CSS transform 动画比 JS 的 setInterval 动画流畅的根本原因。will-change 告诉浏览器提前提升元素为合成层，可以消除首帧的"提升开销"，但每个合成层消耗显存，不能滥用（只对真正需要动画的元素加）。

---

### Q50: 前端状态管理：Redux vs Zustand vs Jotai，如何选型？

**🏢 高频公司**：字节、阿里、小红书

**题目讲解**：

**Redux（经典 Flux 架构）**：
- 单一 Store，Action → Reducer → State 的严格单向数据流
- 可预测性强，DevTools 支持时间旅行调试
- 缺点：模板代码多（action types / action creators / reducers）
- Redux Toolkit (RTK) 大幅减少样板，是现代 Redux 的标准写法

**Zustand（轻量）**：
```javascript
import { create } from 'zustand'

const useStore = create((set, get) => ({
  count: 0,
  increment: () => set(state => ({ count: state.count + 1 })),
  double: () => set({ count: get().count * 2 }),
}))

// 组件中
const { count, increment } = useStore()
```
- 无 Provider、无模板代码、自动处理不必要重渲染
- 支持 immer、devtools、persist 中间件
- 适合中小型应用，上手 5 分钟

**Jotai（原子化）**：
```javascript
import { atom, useAtom } from 'jotai'

const countAtom = atom(0)
const doubleAtom = atom(get => get(countAtom) * 2)  // derived atom

function Counter() {
  const [count, setCount] = useAtom(countAtom)
  const double = useAtomValue(doubleAtom)
}
```
- 原子化状态，按需订阅，不存在"全局重渲染"问题
- 适合细粒度状态（表单、UI 局部状态）

**选型建议**：
- 大型团队、需要严格规范、复杂状态逻辑 → **Redux Toolkit**
- 中小项目、团队偏好简洁 API → **Zustand**（推荐）
- 细粒度原子状态、与 React Suspense 深度集成 → **Jotai**
- 服务端状态（API 数据缓存）→ **React Query / TanStack Query**（专门的服务器状态库）

**考察点**：
1. 服务器状态 vs 客户端状态的区分（不要用 Redux 管理 API 响应数据）
2. Zustand 的 selector 优化（精细化订阅防止不必要重渲染）
3. React Query 的 cache / stale-while-revalidate 机制

**示例答案**：
状态管理的选型先问"什么类型的状态"。服务端数据（API 响应、分页列表）推荐 React Query，它专门处理缓存、失效、后台同步，省掉大量手写的 loading/error/cache 逻辑。客户端 UI 状态，中小型项目 Zustand 是最佳选择，代码量极少（一个 create() 调用），没有 Redux 的 boilerplate，性能又好（基于 selector 精细订阅）。全局复杂状态 + 大团队规范需求才考虑 Redux Toolkit（RTK），它的 createSlice + createAsyncThunk 已经大幅减少样板。Jotai 适合原子化的局部状态，如表单的每个字段独立 atom，互不影响，重渲染最少。

---

### Q51: IndexedDB vs LocalStorage vs SessionStorage vs Cookie 的区别和适用场景

**🏢 高频公司**：腾讯、字节

**题目讲解**：

| 特性 | Cookie | LocalStorage | SessionStorage | IndexedDB |
|------|--------|--------------|----------------|-----------|
| 存储大小 | 4KB | 5-10MB | 5-10MB | 无限制（受磁盘）|
| 生命周期 | 可设置 | 永久 | Tab 关闭即清除 | 永久 |
| 与服务端 | 每次请求自动携带 | 纯客户端 | 纯客户端 | 纯客户端 |
| 数据类型 | 字符串 | 字符串 | 字符串 | 结构化数据 |
| 异步 | 同步 | 同步 | 同步 | 异步 |
| 索引/查询 | ❌ | ❌ | ❌ | ✅ |
| 事务 | ❌ | ❌ | ❌ | ✅ |

**适用场景**：
- **Cookie**：身份认证 token（HttpOnly + Secure + SameSite），极小量需要服务端读取的数据
- **LocalStorage**：用户偏好设置、主题、表单草稿（不敏感、不频繁读写）
- **SessionStorage**：单页流程的临时数据（购物流程中间状态）
- **IndexedDB**：离线数据缓存、大量结构化数据、需要查询的本地数据库（PWA 核心）

**考察点**：
1. Cookie 的 HttpOnly/Secure/SameSite 安全属性
2. LocalStorage 的同步阻塞问题（大量数据时）
3. IndexedDB 的事务机制

**示例答案**：
选存储先看三个维度：数据大小、是否需要服务端访问、生命周期。Session token 用 Cookie（HttpOnly 防 XSS 读取，SameSite=Strict 防 CSRF）；用户主题/偏好用 LocalStorage（简单、永久）；单次会话临时状态用 SessionStorage（Tab 关闭自动清除）；大量结构化数据（离线缓存的商品列表、聊天记录）用 IndexedDB（支持索引和查询，不受 5MB 限制）。PWA 的离线能力完全依赖 IndexedDB + Cache API，而不是 LocalStorage（太小且无查询）。

---

### Q52: Web Workers 的用途是什么？SharedArrayBuffer 和 Atomics 解决什么问题？

**🏢 高频公司**：字节

**题目讲解**：
**Web Workers**：在独立线程里运行 JS，不阻塞主线程（UI 渲染、事件处理）。

**适用场景**：
- 大型数据处理（CSV 解析、图片压缩、加密计算）
- 复杂算法（路径规划、图形渲染计算）
- Service Worker（特殊的 Worker，拦截网络请求）

**基本用法**：
```javascript
// main.js
const worker = new Worker('./worker.js')
worker.postMessage({ data: largeArray })  // 结构化克隆传递（拷贝）
worker.onmessage = e => console.log('结果:', e.data)

// worker.js
self.onmessage = e => {
  const result = heavyComputation(e.data.data)
  self.postMessage(result)
}
```

**Transferable Objects（零拷贝传递）**：
```javascript
// ArrayBuffer 可以转让所有权（不拷贝，main 线程失去访问权）
worker.postMessage({ buffer: arrayBuffer }, [arrayBuffer])
```

**SharedArrayBuffer（真正共享内存）**：
```javascript
// main.js
const sab = new SharedArrayBuffer(1024)
worker.postMessage({ buffer: sab })

// worker.js（两边访问同一块内存）
const arr = new Int32Array(e.data.buffer)
Atomics.add(arr, 0, 1)  // 原子加法，线程安全
```

**Atomics 解决什么问题**：
多线程共享内存时的竞态条件——`arr[0]++` 读-改-写不是原子操作，Atomics.add 保证原子性。Atomics.wait/notify 实现互斥锁。

**考察点**：
1. postMessage 的结构化克隆 vs Transferable（性能差异）
2. SharedArrayBuffer 被 Spectre 攻击限制，需要 COOP/COEP 响应头
3. Worker 无法操作 DOM

**示例答案**：
Web Worker 把 CPU 密集型任务移到独立线程，主线程专注 UI 交互。postMessage 默认做结构化克隆（深拷贝），大数据时开销大，用 Transferable 转让 ArrayBuffer 所有权实现零拷贝。SharedArrayBuffer 让多个 Worker 和主线程共享同一块内存，用 Atomics API 做原子操作保证线程安全，适合需要高频通信的并行计算（图像处理、WebAssembly 计算密集任务）。注意 SharedArrayBuffer 需要页面设置 COOP/COEP 安全头（Spectre 漏洞导致被浏览器限制，加响应头后解除）。

---

### Q53: 前端如何实现大文件分片上传？断点续传的原理是什么？

**🏢 高频公司**：字节、腾讯、阿里

**题目讲解**：
```javascript
async function uploadLargeFile(file: File) {
  const CHUNK_SIZE = 5 * 1024 * 1024  // 5MB 每片
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
  const fileHash = await calculateHash(file)  // 文件唯一标识
  
  // 1. 检查服务端已上传的分片（断点续传）
  const { uploadedChunks } = await api.checkUploadStatus(fileHash)
  
  // 2. 并发上传缺失的分片
  const tasks = []
  for (let i = 0; i < totalChunks; i++) {
    if (uploadedChunks.includes(i)) continue  // 已上传，跳过
    const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
    tasks.push(uploadChunk(chunk, i, fileHash))
  }
  
  // 控制并发数（最多 3 个同时上传）
  await runWithConcurrency(tasks, 3)
  
  // 3. 通知服务端合并
  await api.mergeChunks(fileHash, totalChunks)
}

async function runWithConcurrency(tasks, limit) {
  const pool = new Set()
  for (const task of tasks) {
    const p = task().finally(() => pool.delete(p))
    pool.add(p)
    if (pool.size >= limit) await Promise.race(pool)
  }
  await Promise.all(pool)
}
```

**文件 Hash 计算（Web Worker 异步）**：
```javascript
// 大文件 MD5 计算放到 Worker，防止主线程卡顿
async function calculateHash(file: File): Promise<string> {
  return new Promise(resolve => {
    const worker = new Worker('./hash-worker.js')
    worker.postMessage(file)
    worker.onmessage = e => resolve(e.data.hash)
  })
}
```

**服务端合并（Node.js）**：
```javascript
// 按分片序号顺序合并
async function mergeChunks(fileHash, totalChunks) {
  const ws = fs.createWriteStream(`./uploads/${fileHash}`)
  for (let i = 0; i < totalChunks; i++) {
    const chunk = fs.readFileSync(`./temp/${fileHash}-${i}`)
    ws.write(chunk)
  }
  ws.end()
}
```

**考察点**：
1. 并发控制（p-limit 库或手写 concurrency pool）
2. 文件 hash 计算（MD5/spark-md5，用 Worker 避免主线程阻塞）
3. 断点续传的服务端状态记录（Redis 存已上传分片列表）

**示例答案**：
大文件上传核心是切片 + 并发 + 断点续传。先计算文件内容的 Hash（用 spark-md5 按分片逐步计算，放 Worker 里避免 UI 卡顿），用 Hash 作为文件唯一标识。上传前先问服务端"已经上传了哪些分片"，跳过已上传的，只传缺失部分（断点续传）。并发控制很关键，太少慢、太多占带宽，一般 3-5 个并发是最优区间，用 p-limit 或手写 concurrency pool 控制。所有分片上传完后通知服务端合并，服务端按序号拼接文件流。进度展示实时更新（已上传分片数 / 总分片数），用 onprogress 事件追踪每个分片的上传进度。

---

### Q54: requestAnimationFrame vs setTimeout 实现动画的区别？

**🏢 高频公司**：腾讯、字节

**题目讲解**：
- **setTimeout(fn, 16)**：在指定时间后将回调加入宏任务队列，但实际执行时间不精确（受主线程阻塞影响），可能跳帧或与浏览器刷新不同步
- **requestAnimationFrame（rAF）**：在浏览器下次绘制前调用回调，与屏幕刷新率同步（60Hz → 16.7ms），由浏览器调度，Tab 切换到后台时自动暂停（节省电量）

```javascript
// ❌ setTimeout 动画：时机不精确，可能掉帧
function animate() {
  box.style.left = (parseInt(box.style.left) + 1) + 'px'
  setTimeout(animate, 16)
}

// ✅ rAF 动画：与屏幕刷新同步
function animate(timestamp) {
  const elapsed = timestamp - startTime
  box.style.transform = `translateX(${elapsed * 0.1}px)`
  if (elapsed < 1000) requestAnimationFrame(animate)
}
requestAnimationFrame(animate)
```

**性能差异**：
- rAF 回调在 Paint 之前执行，更改 DOM/CSS 会合并到当前帧
- setTimeout 是宏任务，执行后浏览器才会 Paint，如果每帧有多次 setTimeout 会有多次 Paint

**微任务 vs 宏任务 vs rAF 执行顺序**：
```
宏任务 → 清空微任务 → rAF 回调 → Layout → Paint → Composite → 下一帧
```

**考察点**：
1. rAF 的"下一帧"语义 vs setTimeout 的"定时"语义
2. rAF 在后台标签页自动暂停
3. 高精度时间戳（DOMHighResTimeStamp，微秒级精度）

---

### Q55: 前端监控 SDK 如何设计？如何采集 Core Web Vitals？

**🏢 高频公司**：字节、阿里

**题目讲解**：

**监控 SDK 的采集点**：
```javascript
class Monitor {
  init() {
    this._collectWebVitals()
    this._collectErrors()
    this._collectResourceTiming()
    this._collectUserBehavior()
  }
  
  // 1. Web Vitals（LCP/INP/CLS）
  _collectWebVitals() {
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          this.report('LCP', entry.startTime)
        }
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true })
    
    // 使用 web-vitals 库更简便
    import { onLCP, onINP, onCLS } from 'web-vitals'
    onLCP(metric => this.report('LCP', metric.value))
  }
  
  // 2. JS 错误
  _collectErrors() {
    window.addEventListener('error', e => {
      this.report('js_error', {
        message: e.message, source: e.filename,
        lineno: e.lineno, stack: e.error?.stack
      })
    })
    window.addEventListener('unhandledrejection', e => {
      this.report('promise_error', { reason: String(e.reason) })
    })
  }
  
  // 3. 上报
  report(type, data) {
    const payload = { type, data, url: location.href, ts: Date.now() }
    // 使用 sendBeacon 在页面关闭时也能可靠上报
    navigator.sendBeacon('/api/monitor', JSON.stringify(payload))
  }
}
```

**资源加载时序（PerformanceResourceTiming）**：
```javascript
const entries = performance.getEntriesByType('resource')
entries.forEach(e => {
  console.log(e.name, e.duration, e.transferSize)
})
```

**用户行为采集（无痕埋点）**：
```javascript
// 事件委托，采集所有点击的元素路径
document.addEventListener('click', e => {
  const path = getElementPath(e.target)  // 元素 CSS 选择器路径
  monitor.report('click', { path, x: e.clientX, y: e.clientY })
})
```

**考察点**：
1. PerformanceObserver API 的 buffered 选项（采集历史条目）
2. sendBeacon 的可靠性（页面关闭不丢失）
3. Source Map 上传与错误还原

---

### Q56: 如何实现虚拟滚动中的动态高度（Variable Height Virtual List）？

**🏢 高频公司**：字节、小红书

**题目讲解**：

动态高度虚拟列表的关键问题：不知道每项高度，无法预先计算 offsetTop。

**解决方案：预估 + 实测修正**：
```javascript
class VirtualList {
  constructor(items, estimatedItemHeight = 50) {
    this.items = items
    this.estimatedItemHeight = estimatedItemHeight
    this.heightCache = new Map()  // index → 实际高度
    this.offsetCache = [0]        // index → offsetTop（前缀和）
  }
  
  // 获取第 i 项的 offsetTop（前缀和）
  getItemOffset(index) {
    let offset = this.offsetCache[index] || 0
    if (!this.offsetCache[index + 1]) {
      for (let i = index; i < this.items.length; i++) {
        const h = this.heightCache.get(i) || this.estimatedItemHeight
        this.offsetCache[i + 1] = (this.offsetCache[i] || 0) + h
      }
    }
    return this.offsetCache[index]
  }
  
  // 二分查找当前 scrollTop 对应的 startIndex
  getStartIndex(scrollTop) {
    let lo = 0, hi = this.items.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (this.getItemOffset(mid) <= scrollTop) lo = mid + 1
      else hi = mid
    }
    return lo - 1
  }
  
  // DOM 渲染后用 ResizeObserver 修正高度
  observeItem(el, index) {
    const ro = new ResizeObserver(entries => {
      const newHeight = entries[0].contentRect.height
      const oldHeight = this.heightCache.get(index) || this.estimatedItemHeight
      if (newHeight !== oldHeight) {
        this.heightCache.set(index, newHeight)
        // 更新 index 之后的所有偏移量
        this.invalidateOffsetCache(index)
        this.forceUpdate()
      }
    })
    ro.observe(el)
  }
}
```

**考察点**：
1. 前缀和数组存储 offsetTop（避免每次 O(N) 遍历求位置）
2. ResizeObserver 实测高度后修正缓存
3. react-virtuoso 的实现思路（自带动态高度支持）

---

### Q57: React Query 的核心原理是什么？它如何管理缓存和后台更新？

**🏢 高频公司**：阿里、字节、小红书

**题目讲解**：
React Query（TanStack Query）专门解决"服务端状态"管理问题，核心是三个机制：

**1. 缓存（QueryCache）**：
- 每个 query 有唯一 key，结果存入内存缓存
- `staleTime`：多久内数据是新鲜的（默认 0）
- `gcTime`：数据不被使用后多久从缓存删除（默认 5 分钟）

```javascript
const { data, isLoading, isFetching } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  staleTime: 1000 * 60 * 5,  // 5分钟内不重新请求
  gcTime: 1000 * 60 * 10,    // 10分钟未使用后删除缓存
})
```

**2. 后台更新（Stale-While-Revalidate）**：
- 数据超过 staleTime 后标记为 stale
- 下次组件 mount 或窗口 focus 时，先返回旧数据（不阻塞渲染），同时后台重新请求
- 新数据返回后更新 UI（用户感知不到等待）

**3. 自动重试和失效**：
- `useMutation` 的 `onSuccess` 可调用 `queryClient.invalidateQueries` 使相关缓存失效
- 失败自动重试 3 次

**与 Redux 的对比**：
- Redux 存储状态逻辑（客户端 UI 状态）
- React Query 存储服务端数据（网络请求结果）
- 两者不冲突，搭配使用

**示例答案**：
React Query 的核心是"服务端状态的本地缓存管理"。每个请求用唯一 queryKey 标识，结果缓存到内存，staleTime 控制数据新鲜度（0 = 每次都认为过期，需要后台刷新）。关键机制是 SWR：先返回缓存数据让页面立刻可用，同时后台静默发起更新请求，新数据来了再刷新。比手动写 loading/error/data state + useEffect 请求干净很多，还自动处理重试、竞态条件、重复请求合并。数据失效通过 `invalidateQueries` 触发，mutation 成功后调一下，相关页面自动重新拉取，不需要手动管理缓存一致性。

---

### Q58: 前端如何实现 OAuth 2.0 登录流程？PKCE 解决了什么问题？

**🏢 高频公司**：阿里、腾讯

**题目讲解**：
**Authorization Code Flow**（服务端有 server）：
```
1. 前端跳转到授权服务器（携带 client_id + redirect_uri）
2. 用户登录授权，授权服务器回跳 redirect_uri + code
3. 后端用 code 换 access_token（携带 client_secret，不暴露给前端）
4. 后端返回 token 给前端（Set-Cookie HttpOnly）
```

**PKCE（Proof Key for Code Exchange）**：
解决 SPA/移动端（无 server，无法保护 client_secret）的安全问题：
```javascript
// 1. 生成 code_verifier（随机字符串）
const codeVerifier = crypto.randomUUID() + crypto.randomUUID()

// 2. 计算 code_challenge = BASE64URL(SHA256(code_verifier))
const challenge = btoa(String.fromCharCode(...new Uint8Array(
  await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier))
))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

// 3. 授权请求携带 code_challenge
const authUrl = `${authServer}/authorize?code_challenge=${challenge}&code_challenge_method=S256&...`

// 4. 换 token 时携带 code_verifier（授权服务器验证 SHA256(verifier) === challenge）
const tokenResponse = await fetch(`${authServer}/token`, {
  method: 'POST',
  body: new URLSearchParams({
    code, code_verifier: codeVerifier, ...
  })
})
```

**PKCE 的安全性**：即使 code 被中间人截获，没有 code_verifier 也无法换 token（verifier 只存在客户端，从未传输到授权服务器，只传了它的哈希）。

**考察点**：
1. Authorization Code Flow vs Implicit Flow（后者直接返回 token，已废弃）
2. PKCE 的 code_verifier 和 code_challenge 的关系
3. Token 存储（不建议 LocalStorage，推荐 HttpOnly Cookie 或 refresh token rotation）

---

