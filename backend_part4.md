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

### Q54: 什么是数据库连接池？HikariCP 和 SQLAlchemy Pool 的关键参数是什么？

**🏢 高频公司**：阿里（Java/Python 必考）

**题目讲解**：

**连接池解决的问题**：
- 每次查询新建 TCP 连接代价大（三次握手 + MySQL 认证，约 10-100ms）
- 连接池维护一批预建连接，查询时借用，完成后归还，消除建连代价

**HikariCP（Java 最快连接池）关键参数**：
```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 20        # 最大连接数（CPU核心数×2+磁盘数 经验值）
      minimum-idle: 5              # 最小空闲连接数
      connection-timeout: 30000    # 等待连接超时（30s）
      idle-timeout: 600000         # 空闲连接最长保留时间（10min）
      max-lifetime: 1800000        # 连接最大生命周期（30min，防止 MySQL 主动断连）
      keepalive-time: 30000        # 保活心跳间隔
```

**SQLAlchemy Pool（Python）关键参数**：
```python
from sqlalchemy import create_engine

engine = create_engine(
    "mysql+pymysql://user:pass@host/db",
    pool_size=10,         # 连接池大小
    max_overflow=20,      # 超出 pool_size 后最多额外创建的连接数
    pool_timeout=30,      # 等待可用连接的超时时间（秒）
    pool_recycle=3600,    # 连接最大复用时间（1小时，防止 MySQL 8h 超时断连）
    pool_pre_ping=True,   # 使用前 ping 测试连接是否有效（防止使用已断开的连接）
)
```

**pool_pre_ping 的重要性**：
MySQL 默认 8 小时无活动断开连接，但连接池不知道，会把"已断开的连接"给应用用，导致 `MySQL server has gone away` 错误。`pool_pre_ping=True` 在使用连接前先发一个 ping，断开则重建。

**连接数配置原则**：
- `pool_size = CPU 核心数 × 2`（I/O 等待时 CPU 可以运行其他线程）
- 不宜过大：连接数过多 MySQL 压力大，且内存开销大
- 监控：连接等待时间（`pool_timeout` 被触发频率）是连接数是否需要扩充的信号

**考察点**：
1. `pool_recycle` 和 MySQL 的 `wait_timeout` 的关系
2. 连接泄漏（不归还连接池）的排查
3. 读写分离时的多连接池配置

**示例答案**：
连接池通过预建并复用 TCP 连接，把每次查询的连接建立开销从 10-100ms 降到接近 0。`pool_size` 决定"同时可活跃的最大连接数"，设为 CPU 核心数 × 2 是经验值（线程等待 DB I/O 时 CPU 可处理其他请求）；不能设太大，MySQL 端每个连接耗约 200KB 内存。`pool_recycle` 是最重要的生产参数：必须小于 MySQL 的 `wait_timeout`（默认 28800s/8h），否则空闲太久的连接被 MySQL 关闭，应用还以为有效，使用时报错。`pool_pre_ping=True`（SQLAlchemy）或 `keepalive-time`（HikariCP）都是解决这个问题的方法。生产中监控连接池的 `waiting` 指标，长时间 waiting 说明连接数不足，需要扩充或优化查询时间。

---

### Q55: Python 的 `dataclass` 和 `pydantic` 有什么区别？各自的适用场景是什么？

**🏢 高频公司**：小红书、字节（Python 岗）

**题目讲解**：

**dataclass（Python 3.7+，标准库）**：
```python
from dataclasses import dataclass, field
from typing import List

@dataclass
class User:
    id: int
    name: str
    email: str
    tags: List[str] = field(default_factory=list)
    
    def greet(self) -> str:
        return f"Hello, {self.name}!"

# 自动生成 __init__, __repr__, __eq__
u = User(id=1, name="Alice", email="alice@example.com")
```

**Pydantic（第三方库，运行时数据验证）**：
```python
from pydantic import BaseModel, EmailStr, validator
from typing import List

class UserRequest(BaseModel):
    id: int
    name: str
    email: EmailStr          # 验证 email 格式
    tags: List[str] = []
    
    @validator('name')
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError("姓名不能为空")
        return v.strip()

# 自动验证和转换类型
try:
    u = UserRequest(id="1", name="Alice", email="invalid")  # 会抛 ValidationError
except ValidationError as e:
    print(e.errors())  # 详细的错误信息

# 从 dict 创建（API 请求解析）
u = UserRequest(**request_body)

# 序列化为 dict/json
u.model_dump()       # Pydantic v2
u.model_dump_json()
```

**核心区别**：
| | dataclass | Pydantic BaseModel |
|---|---|---|
| 类型验证 | 无（仅类型提示）| ✅ 运行时验证 |
| 类型转换 | 无 | ✅ 自动转换（"1" → 1）|
| JSON 序列化 | 需要 dataclasses.asdict | ✅ 内置 |
| 性能 | 更快 | 稍慢（v2 用 Rust 实现后性能大幅提升）|
| 嵌套模型 | 手动处理 | ✅ 自动递归验证 |
| 适用场景 | 内部数据传输、不需要验证 | API 输入/输出，需要严格验证 |

**FastAPI 中的使用**：
- Request Body → Pydantic Model（自动验证输入）
- Response → Pydantic Model（自动生成 OpenAPI 文档）
- 内部业务逻辑 → dataclass 或普通类（不需要序列化的地方）

**考察点**：
1. Pydantic v1 vs v2 的主要区别（v2 用 Rust 重写，速度快 5-50x）
2. `dataclass(frozen=True)` 实现不可变对象
3. Pydantic 的 `model_config`（配置别名、禁止额外字段等）

**示例答案**：
dataclass 是标准库提供的轻量数据类，自动生成 `__init__/__repr__/__eq__`，无运行时开销，适合内部数据结构（不需要验证和序列化）。Pydantic 在数据边界处（API 输入输出、配置加载）更合适，它做运行时类型验证和转换——`id="123"` 会自动转为 `int(123)`，email 字段传入非法格式会抛 ValidationError 并给出清晰的错误描述。FastAPI 深度整合 Pydantic，Request Body 和 Response 都用 Pydantic Model，自动生成 OpenAPI 文档。Pydantic v2 用 Rust 重写了核心，比 v1 快 5-17 倍，生产中没有理由不升级。原则：不需要验证的内部数据用 dataclass，与外部系统交互（API/DB/配置）的数据用 Pydantic。

---

