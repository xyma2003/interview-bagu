# 后端面试八股 · 第四篇

---

### Q51: Go 语言的 goroutine 和 channel 是什么？与 Python 协程有什么区别？

**🏢 高频公司**：字节（Go 岗）、腾讯

**题目讲解**：

**Goroutine（Go 的协程）**：
- 由 Go 运行时调度的轻量线程，栈初始大小 2-4KB（线程 8MB）
- 可以创建百万个 goroutine，自动伸缩栈
- M:N 调度（多个 goroutine 映射到多个 OS 线程），真正并行 CPU 密集型任务（无 GIL）

```go
// 创建 goroutine
go func() {
    fmt.Println("goroutine running")
}()

// Channel：goroutine 间通信
ch := make(chan int, 10)  // 带缓冲 channel

go func() {
    ch <- 42  // 发送
}()
val := <-ch  // 接收
```

**Channel 模式**：
```go
// Fan-Out（一发多收）
func fanOut(in <-chan int, n int) []<-chan int {
    outs := make([]<-chan int, n)
    for i := 0; i < n; i++ {
        out := make(chan int)
        outs[i] = out
        go func(out chan<- int) {
            for v := range in { out <- v }
            close(out)
        }(out)
    }
    return outs
}

// Select：多路复用
select {
case v := <-ch1:
    fmt.Println("from ch1:", v)
case v := <-ch2:
    fmt.Println("from ch2:", v)
case <-time.After(time.Second):
    fmt.Println("timeout")
}
```

**与 Python asyncio 的对比**：
| | Go goroutine | Python asyncio |
|---|---|---|
| 线程模型 | M:N（多 OS 线程）| 1:1（单 OS 线程）|
| CPU 并行 | ✅ 真正并行 | ❌ 单线程（GIL）|
| 调度方式 | 抢占式（Go 1.14+）| 协作式（await 让出）|
| 通信方式 | Channel | Queue/Event |
| 并发量 | 百万 goroutine | 数万协程 |

**考察点**：
1. `make(chan int)` vs `make(chan int, 10)`（无缓冲 vs 有缓冲，同步 vs 异步）
2. 关闭 channel 的信号传递（`close(ch)` 让接收方退出 for-range）
3. goroutine 泄漏（channel 没有 sender，receiver 永久阻塞）

**示例答案**：
Go 的 goroutine 是真正的轻量并发，Go 运行时内置调度器，在多个 OS 线程上调度大量 goroutine，实现真正的多核并行（无 GIL）。Channel 是 goroutine 间通信的推荐方式，遵循 CSP 模型——"不要通过共享内存通信，而是通过通信共享内存"。无缓冲 channel 是同步的（发送方等接收方就绪），有缓冲 channel 允许一定量的异步（缓冲满才阻塞）。相比 Python asyncio 的单线程协作式调度，goroutine 的 M:N 调度可以真正利用多核，CPU 密集型任务也能并行。Go 1.14 引入了抢占式调度（不需要显式 yield），解决了长 goroutine 占用线程的问题。

---

### Q52: 什么是 OpenTelemetry？如何在服务中实现链路追踪（Distributed Tracing）？

**🏢 高频公司**：字节、阿里、腾讯

**题目讲解**：
**问题**：微服务架构中，一个用户请求经过多个服务，出现问题时难以定位是哪个服务的哪个环节出了故障。

**链路追踪核心概念**：
- **Trace**：一次完整请求的全链路记录（全局唯一 trace_id）
- **Span**：一次操作（RPC 调用、DB 查询），有 start_time/end_time/attributes
- **Context Propagation**：trace_id 通过 HTTP Header 在服务间传递

**OpenTelemetry（OTEL）Python 示例**：
```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

# 初始化
provider = TracerProvider()
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://jaeger:4317"))
)
trace.set_tracer_provider(provider)
tracer = trace.get_tracer(__name__)

# 使用
@app.post("/order")
async def create_order(order: OrderRequest):
    with tracer.start_as_current_span("create_order") as span:
        span.set_attribute("user.id", order.user_id)
        span.set_attribute("order.total", order.total)
        
        with tracer.start_as_current_span("validate_inventory"):
            await check_inventory(order.items)
        
        with tracer.start_as_current_span("charge_payment"):
            await charge(order.payment)
        
        return {"order_id": "..."}
```

**自动埋点（Zero-Code Instrumentation）**：
```python
# OTEL 提供 auto-instrumentation，无需修改代码
# pip install opentelemetry-instrumentation-fastapi
opentelemetry-instrument --traces_exporter otlp \
    --service_name order-service \
    python app.py
```

**常用后端（Trace 存储与查询）**：
- **Jaeger**：开源，OTEL 原生支持
- **Zipkin**：老牌开源方案
- **Tempo（Grafana）**：与 Prometheus/Loki 深度集成
- **DataDog / Dynatrace**：商业方案

**考察点**：
1. Trace ID 在 HTTP Header 中的标准字段（`traceparent`，W3C Trace Context）
2. Span 的父子关系（树形结构）
3. 采样策略（全量 vs 基于尾部的采样）

**示例答案**：
OpenTelemetry 是链路追踪、指标、日志三合一的可观测性标准框架，各大云厂商和监控产品都支持。核心是 Span 的父子关系：HTTP 请求进来创建根 Span，调用其他服务创建子 Span，子 Span 通过 HTTP Header（traceparent）传递 trace_id，在 Jaeger 里就能看到完整的调用链树，哪个 Span 耗时最长、在哪出错一目了然。Python 里 OTEL auto-instrumentation 能自动给 FastAPI/Flask/aiohttp/SQLAlchemy 等常用库埋点，不需要改业务代码，启动时加个命令行参数就完成。生产中重要的是采样策略——全量追踪成本太高，通常对出错的请求全量采样，正常请求按 1-5% 采样，重要业务（支付）可以单独提高采样率。

---

### Q53: 如何设计 API 的版本管理策略？RESTful API 最佳实践有哪些？

**🏢 高频公司**：阿里、腾讯

**题目讲解**：

**API 版本管理方案**：
```
1. URL Path 版本（最直观）
   GET /v1/users/123
   GET /v2/users/123

2. Query Parameter
   GET /users/123?version=2

3. HTTP Header
   GET /users/123
   Accept: application/vnd.myapi.v2+json

4. 子域名
   https://v2.api.example.com/users/123
```

**推荐方案**：URL Path（简单直观，方便 CDN 缓存和日志分析）

**RESTful 最佳实践**：
```
资源命名（名词，复数）：
  ✅ GET    /users              - 获取用户列表
  ✅ POST   /users              - 创建用户
  ✅ GET    /users/123          - 获取用户详情
  ✅ PUT    /users/123          - 全量更新
  ✅ PATCH  /users/123          - 部分更新
  ✅ DELETE /users/123          - 删除用户
  ✅ GET    /users/123/orders   - 用户的订单

  ❌ GET /getUser/123
  ❌ POST /deleteUser/123

HTTP 状态码：
  200 OK          - 成功
  201 Created     - 创建成功（POST 后）
  204 No Content  - 成功但无响应体（DELETE）
  400 Bad Request - 参数错误
  401 Unauthorized - 未认证
  403 Forbidden   - 无权限
  404 Not Found   - 资源不存在
  409 Conflict    - 资源冲突（如重复创建）
  422 Unprocessable Entity - 业务逻辑校验失败
  429 Too Many Requests    - 限流
  500 Internal Server Error - 服务端错误

分页：
  GET /users?page=1&size=20&sort=created_at:desc
  响应头携带：Link: <...>; rel="next"
  或：{"data": [...], "pagination": {"total": 100, "page": 1}}
```

**HATEOAS（超媒体）**：
```json
{
  "id": 123,
  "name": "Alice",
  "_links": {
    "self": {"href": "/users/123"},
    "orders": {"href": "/users/123/orders"},
    "delete": {"href": "/users/123", "method": "DELETE"}
  }
}
```

**考察点**：
1. PUT vs PATCH 的语义区别（全量 vs 部分更新）
2. 幂等性（GET/PUT/DELETE 是幂等的，POST 不是）
3. GraphQL vs REST 的选择

**示例答案**：
API 版本管理首选 URL Path（`/v1/`, `/v2/`），简单直观，文档好写，CDN 可以按路径缓存不同版本。版本迭代原则：新增字段向后兼容（旧客户端忽略新字段），破坏性修改（删字段、改类型）才升版本号。RESTful 最重要的是正确使用 HTTP 语义：资源用名词（`/users`），动作体现在 HTTP 方法里；状态码要精确（别什么错误都返回 200，把错误放 body 里）；GET 必须幂等（可缓存），POST 创建资源、PUT 全量替换、PATCH 部分更新。分页用 `page+size` 或 cursor（`?after=xxx`），cursor 分页对大数据更高效。

---

