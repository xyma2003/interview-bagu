# 后端面试八股 · 第三篇

> 覆盖：微服务 / 安全 / 高并发 / Python 进阶 / 数据库进阶 / K8s/Docker

---

### Q42: 什么是 JWT？它和 Session 认证有什么区别？JWT 的安全问题有哪些？

**🏢 高频公司**：字节、腾讯、小红书

**题目讲解**：

**Session 认证（有状态）**：
- 登录时服务端生成 session，存储在 Redis/DB，返回 session_id（存 Cookie）
- 每次请求携带 session_id，服务端查 Redis 验证
- 优点：可以随时使 session 失效（直接删 Redis）
- 缺点：服务端需要存储状态，多节点需要 Redis 共享 session

**JWT 认证（无状态）**：
- 登录时服务端生成 JWT（Header.Payload.Signature），返回给客户端
- 客户端每次请求携带 JWT（通常在 Authorization: Bearer 头）
- 服务端只需验证签名，无需查存储
- 优点：无状态，天然支持横向扩展
- 缺点：无法主动使 token 失效（需要额外机制）

**JWT 结构**：
```
Header: {"alg": "HS256", "typ": "JWT"}
Payload: {"sub": "user123", "exp": 1716451200, "iat": 1716364800}
Signature: HMACSHA256(base64(header) + "." + base64(payload), secret)
```

**JWT 安全问题**：
1. **Algorithm None 攻击**：修改 alg=none，签名变空，某些库会通过验证 → 验证时必须指定允许的算法
2. **密钥泄漏**：JWT 的安全完全依赖 secret，secret 泄漏则所有 token 被伪造
3. **无法吊销**：token 有效期内无法使其失效（解决：黑名单列表存 Redis，每次验证时检查）
4. **Payload 可见**：base64 不是加密，payload 内容任何人都能解码看到（不要存敏感信息）
5. **Refresh Token 滚动**：access_token 短期（15min），refresh_token 长期（7天），refresh 时轮换 refresh_token（Rotation），防止 refresh_token 被盗用

**考察点**：
1. JWT 用 base64url 编码（非加密），Payload 对任何人可见
2. RS256 vs HS256（非对称 vs 对称）
3. Refresh Token Rotation 的安全性

**示例答案**：
Session 是有状态的，服务端存 session 数据；JWT 是无状态的，状态编码在 token 里。JWT 的优势是横向扩展友好（任何节点都能验证，不需要共享存储），缺点是无法主动吊销。解决方案：短期 access_token（15分钟）+ 长期 refresh_token（7天），access_token 过期用 refresh_token 换新的同时使旧 refresh_token 失效（Rotation），如果旧 refresh_token 被重用则检测到盗用，使所有该用户的 token 失效。安全上，alg 必须在服务端强制指定，不接受客户端传来的 alg 值（防 Algorithm None 攻击）；Payload 不存密码、身份证号等敏感信息（因为 base64 不是加密，任何人都能解码）。

---

### Q43: SQL 注入原理和防御方法是什么？ORM 为什么能防止 SQL 注入？

**🏢 高频公司**：阿里、字节、腾讯

**题目讲解**：
**SQL 注入原理**：
用户输入被拼接到 SQL 语句中，恶意输入改变了 SQL 的逻辑：
```python
# ❌ 危险：字符串拼接
username = request.args.get('username')  # 输入: ' OR '1'='1
sql = f"SELECT * FROM users WHERE username = '{username}'"
# 实际执行: SELECT * FROM users WHERE username = '' OR '1'='1'
# 返回所有用户！
```

**防御方法**：

**1. 参数化查询（Parameterized Query / Prepared Statement）**：
```python
# ✅ 安全：参数与 SQL 分离
cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
# 数据库先编译 SQL，再绑定参数（参数被当作数据，不被解析为 SQL）
```

**2. ORM 自动参数化**：
```python
# SQLAlchemy ORM（自动参数化）
user = session.query(User).filter(User.username == username).first()
# 生成的 SQL: SELECT * FROM users WHERE username = ? 参数: (username,)
```

**3. 输入验证**（辅助，不是主要防御）：
```python
import re
if not re.match(r'^[a-zA-Z0-9_]+$', username):
    raise ValueError("Invalid username")
```

**4. 最小权限原则**：数据库账号只给必要的权限（SELECT 账号不给 DROP/UPDATE）

**ORM 为什么安全**：
ORM 在底层总是使用参数化查询，用户输入作为参数传递而非拼接到 SQL 字符串，数据库驱动在协议层区分"查询模板"和"参数值"。

**考察点**：
1. 二阶 SQL 注入（First-Order vs Second-Order）
2. NoSQL 注入（MongoDB 的 $where、$gt 注入）
3. 存储过程的安全性（也需要参数化）

**示例答案**：
SQL 注入的根本原因是把用户数据和 SQL 代码混在一起。参数化查询把两者分离：数据库先解析 SQL 模板（固定结构），再绑定参数（用户输入当数据），无论用户输入什么都不会改变 SQL 结构。ORM 框架（SQLAlchemy/Django ORM）底层总是用参数化查询，只要不手写 `text()` 拼接 SQL，就不会有注入风险。二阶注入是个进阶陷阱：第一步存储用户输入（存储时安全，没有执行），第二步读出来后拼接到 SQL 里执行（这时才注入）——所以从 DB 读出来再拼 SQL 也是危险的，始终要参数化。

---

### Q44: 分布式系统中如何保证接口幂等性？

**🏢 高频公司**：阿里、字节

**题目讲解**：
**幂等性定义**：同一操作执行多次与执行一次的效果相同。

**为什么需要幂等**：
- 网络重试（客户端超时后重发）
- 消息队列重复消费（At-Least-Once 语义）
- 用户重复提交（点击两次按钮）

**幂等性实现方案**：

**1. 唯一请求 ID（Idempotency Key）**：
```python
# 客户端生成唯一 ID，每次请求携带
# 服务端用 Redis SETNX 保证只处理一次
def create_order(idempotency_key: str, order_data: dict):
    # NX: 不存在才设置，EX: 过期时间（防永久占用）
    if not redis.set(f"idem:{idempotency_key}", "1", nx=True, ex=3600):
        # 已处理过，返回上次的结果
        return redis.get(f"idem_result:{idempotency_key}")
    result = _do_create_order(order_data)
    redis.setex(f"idem_result:{idempotency_key}", 3600, json.dumps(result))
    return result
```

**2. 数据库唯一约束**：
```sql
-- 对业务唯一字段加唯一索引
CREATE UNIQUE INDEX idx_order_no ON orders(order_no);
-- 重复插入会抛 DuplicateKeyError，业务层 catch 后返回已有订单
```

**3. 乐观锁版本号**：
```sql
UPDATE inventory SET stock = stock - 1, version = version + 1
WHERE product_id = 1 AND version = {expected_version}
-- 同一 version 只能有一个请求成功，重试时 version 已变更会失败
```

**4. Token 机制（表单防重复提交）**：
- 打开表单时服务端生成 token 存 Redis
- 提交时带上 token，服务端 delete 后处理（Redis GETDEL）
- 重复提交时 token 已不存在，直接拒绝

**考察点**：
1. 幂等 key 的 TTL 设计（过期时间 vs 业务完成时间）
2. 分布式 SETNX 的原子性（Lua 脚本保证 set + get 原子）
3. 哪些操作天然幂等（GET/DELETE 幂等，POST 不幂等）

**示例答案**：
幂等实现的核心思路是"同一请求只处理一次"。最通用的方案是 Idempotency Key：客户端请求时生成唯一 ID（UUID），服务端用 Redis SETNX 以这个 ID 为 key 原子地"占位"，占到的处理并缓存结果，没占到的直接返回已有结果，实现完全幂等。电商订单场景通常组合使用：Idempotency Key 防重试，数据库唯一索引防并发重复下单（兜底），乐观锁防止库存超卖。Kafka 消费者的幂等靠消息 ID：消费前检查 Redis 是否已有该消息 ID 的处理记录，有则 skip，无则处理并记录，形成"恰好一次"语义（At-Least-Once + 幂等 = Exactly-Once）。

---

### Q45: 如何设计一个秒杀系统？应对瞬时高并发的核心手段？

**🏢 高频公司**：阿里（双十一）、字节、腾讯

**题目讲解**：
**核心挑战**：
- 读多写少（99% 是查库存）：读操作用缓存承接
- 瞬时峰值（10万QPS → 0.1秒内卖出1000件）：写操作要防超卖

**分层设计**：

**1. 前端限流（用户侧）**：
- 点击秒杀按钮后 disable（防重复提交）
- 加 CDN 缓存静态页面（不打到源站）

**2. 网关限流**：
- 令牌桶限流，控制进入系统的 QPS
- 对同一用户限频（每人每秒最多1次请求）

**3. 库存预热（Redis）**：
```python
# 秒杀开始前，库存写入 Redis
redis.set("seckill:product:1001:stock", 1000)

# 秒杀时原子扣减（Lua 脚本保证原子性）
lua_script = """
local stock = tonumber(redis.call('get', KEYS[1]))
if stock > 0 then
    redis.call('decr', KEYS[1])
    return 1  -- 成功
else
    return 0  -- 库存不足
end
"""
result = redis.eval(lua_script, 1, "seckill:product:1001:stock")
```

**4. 异步落库（MQ 削峰）**：
```python
if result == 1:
    # 秒杀成功，发 MQ 消息，异步创建订单
    kafka.send("seckill_orders", {
        "user_id": user_id, "product_id": 1001
    })
    return "秒杀成功，订单处理中"
```

**5. 数据库层保障（兜底防超卖）**：
```sql
-- 即使 Redis 出错，数据库的 CHECK 约束兜底
UPDATE products SET stock = stock - 1
WHERE product_id = 1001 AND stock > 0
-- 影响行数为 0 则超卖，回滚
```

**6. 订单去重（用户只能买一件）**：
- 数据库联合唯一索引：`(user_id, product_id, seckill_activity_id)`

**考察点**：
1. Redis 扣减库存后 DB 扣减失败的一致性问题（最终一致性方案）
2. 热 key 问题（同一商品的 Redis key 被所有节点请求）
3. 消息队列的背压机制（下游处理不过来时如何保护）

**示例答案**：
秒杀的核心是"把 DB 压力转移到缓存"和"把同步变异步"。读操作全走 Redis 库存缓存（秒杀前预热）；写操作用 Redis Lua 脚本原子扣减库存，成功的发 Kafka 消息异步创建订单，失败的直接返回。DB 只承接 Kafka 消费者的异步写入，QPS 从峰值的十万降到稳定的几千，可以从容处理。防超卖三重保障：Redis 原子扣减（第一道关）、Kafka 幂等消费（第二道）、DB 的 `stock > 0` 条件更新（第三道兜底）。热 key 问题：对热门商品的 Redis key 做 sharding（`seckill:1001:0`、`seckill:1001:1`...N 个 key，分散到不同节点），请求按 hash 路由，N 倍分散热点。

---

### Q46: 什么是服务网格（Service Mesh）？Istio 的 Sidecar 模式解决了什么问题？

**🏢 高频公司**：腾讯、字节、阿里

**题目讲解**：
**微服务的通信痛点**：
每个服务都要实现：服务发现、负载均衡、熔断限流、链路追踪、mTLS 加密... 这些横切关注点让每个服务都很重，且难以统一。

**Service Mesh（服务网格）**：
把网络通信逻辑下沉到基础设施层，应用代码只关注业务逻辑。

**Istio Sidecar 模式**：
每个 Pod 注入一个 Envoy Proxy 容器（Sidecar），所有进出该 Pod 的网络流量经过 Proxy 处理：
```
Service A → [Envoy Sidecar A] → [Envoy Sidecar B] → Service B
                ↓ 上报                    ↑
           Control Plane (Istiod)
```

**Sidecar 提供的功能**（无需修改应用代码）：
- **服务发现 + 负载均衡**：Envoy 知道所有服务实例
- **熔断 + 限流**：在 Proxy 层面自动实现
- **mTLS**：服务间通信自动加密，证书由 Istiod 管理
- **链路追踪**：自动在请求头注入 trace ID
- **流量管理**：灰度发布、A/B 测试（控制 10% 流量到新版本）

**代价**：
- 每个 Pod 多一个 Sidecar 容器（CPU + 内存开销）
- 链路多一跳（延迟增加约 1-5ms）
- 运维复杂度增加

**考察点**：
1. Service Mesh vs API Gateway 的区别（东西向 vs 南北向）
2. eBPF 模式（Cilium）替代 Sidecar（无注入，内核层处理）
3. Sidecar 的控制平面（Istiod）和数据平面（Envoy）分离

**示例答案**：
Service Mesh 解决微服务通信的横切关注点问题——服务发现、熔断、链路追踪等每个服务都要写一遍，而且各语言的实现可能不一致。Istio 的 Sidecar 方案是每个 Pod 注入 Envoy Proxy，所有流量经过 Proxy，功能在基础设施层统一实现，应用代码完全不感知。控制平面（Istiod）管理配置和证书，数据平面（Envoy）执行规则和加密。代价是多一个 Sidecar 的资源开销和额外延迟，对延迟敏感的服务要权衡。新兴的 eBPF 方案（Cilium）把网络处理下沉到 Linux 内核，不需要 Sidecar，性能更好，是 Service Mesh 的未来方向。

---

### Q47: Docker 和 K8s 的核心概念是什么？Pod、Deployment、Service 的关系？

**🏢 高频公司**：字节、阿里、腾讯（运维必考）

**题目讲解**：

**Docker 核心概念**：
- **Image（镜像）**：只读的应用快照（代码 + 依赖 + 运行时），Dockerfile 定义
- **Container（容器）**：镜像的运行实例，隔离的进程（namespace + cgroups）
- **Registry**：镜像仓库（Docker Hub / 阿里云 ACR）

**K8s 核心概念**：

**Pod**（最小调度单位）：
- 一个或多个共享网络和存储的容器
- 有唯一 IP，容器间通过 localhost 通信
- Pod 是临时的，宕机不会自动重建

**Deployment**（无状态服务管理）：
- 声明"我需要 3 个 Pod 副本"
- 自动创建/删除 Pod 保持副本数
- 支持滚动更新和回滚

**Service**（稳定访问入口）：
- Pod IP 会变，Service 提供稳定的虚拟 IP（ClusterIP）
- 通过 Label Selector 关联后端 Pod
- kube-proxy 实现负载均衡（iptables / ipvs）

**三者关系**：
```
Deployment → 管理 → Pod Pod Pod
                          ↓  ↓  ↓
Service → 负载均衡访问 →  Pod Pod Pod
                ↑
  外部请求通过 Service 访问（ClusterIP / NodePort / LoadBalancer）
```

**StatefulSet**（有状态服务）：
- Pod 有稳定的名字（pod-0, pod-1, pod-2）和持久化存储（PVC）
- 适合 MySQL、Redis、Kafka 等有状态应用

**考察点**：
1. Pod 重启后 IP 变化，为什么 Service 能稳定路由
2. Deployment 的滚动更新策略（maxSurge / maxUnavailable）
3. ConfigMap / Secret 的使用场景

**示例答案**：
Docker 提供轻量级容器化（镜像打包 + 隔离运行），K8s 是容器编排系统，管理大量容器的部署、扩缩容、服务发现。核心三层：Pod 是最小单位（一个或多个容器共享网络），Deployment 管理 Pod 的声明式部署（"始终保持 3 个副本"，有挂立即重建），Service 提供稳定访问入口（Pod IP 会变，Service IP 不变，通过 Label Selector 找到后端 Pod 并负载均衡）。实际部署：Dockerfile 打镜像 → 推 Registry → K8s 通过 Deployment yaml 拉镜像启动 Pod → Service 暴露端口供外部/内部访问。配置用 ConfigMap（非敏感）和 Secret（敏感，Base64 编码），挂载到 Pod 里，修改 ConfigMap 不需要重建 Pod。

---

### Q48: Python 的 `__slots__` 是什么？它如何节省内存？

**🏢 高频公司**：小红书、字节（Python 深度题）

**题目讲解**：

**默认情况（`__dict__`）**：
每个 Python 实例都有一个 `__dict__` 字典存储属性，字典本身有较大内存开销（约 200+ 字节/实例）。

**`__slots__` 的作用**：
```python
# 普通类
class Normal:
    def __init__(self, x, y):
        self.x = x
        self.y = y
# 每个实例有 __dict__，约 250 字节

# 使用 __slots__
class Slotted:
    __slots__ = ('x', 'y')   # 声明允许的属性名
    def __init__(self, x, y):
        self.x = x
        self.y = y
# 每个实例约 80 字节（节省 ~60%）
```

**原理**：
`__slots__` 把属性存储从字典改为固定大小的数组（类似 C struct），消除了字典的 hash 表开销。

**代价（限制）**：
- 不能动态添加未在 `__slots__` 中声明的属性
- 继承时子类若没声明 `__slots__` 会自动有 `__dict__`（失去效果）
- 不支持弱引用（除非在 `__slots__` 里加 `'__weakref__'`）

**适用场景**：
- 需要创建大量实例（百万级）的轻量数据类
- 性能敏感的内存密集场景
- 游戏中的粒子系统、数值计算中的向量类

**现代替代**：
- `@dataclass(slots=True)`（Python 3.10+）：更方便地使用 slots

```python
from dataclasses import dataclass

@dataclass(slots=True)
class Point:
    x: float
    y: float
```

**考察点**：
1. `__slots__` 的内存原理（描述符 vs 字典）
2. 与 `__dict__` 同时存在时的行为
3. NamedTuple / dataclass 的 slots 参数

**示例答案**：
Python 对象默认用 `__dict__` 存属性，字典是哈希表结构，内存开销大（约 200 字节以上）。`__slots__` 把属性存储改为固定偏移量的内存块（类似 C 的 struct），消除哈希表开销，每个实例内存减少约 50-70%。百万级实例时节省数百 MB 显著。代价是属性列表固定，不能动态添加，在灵活性和性能之间取舍。Python 3.10+ 推荐用 `@dataclass(slots=True)`，语义更清晰，比手写 `__slots__` 更不容易出错（自动处理继承场景）。

---

### Q49: 什么是 Python 的描述符（Descriptor）？`@property` 的底层实现是什么？

**🏢 高频公司**：字节、小红书

**题目讲解**：
**描述符协议**：实现了 `__get__`、`__set__`、`__delete__` 方法的对象。

```python
class Descriptor:
    def __get__(self, obj, objtype=None):
        print(f"Getting {self.name}")
        return obj.__dict__[self.name]
    
    def __set__(self, obj, value):
        print(f"Setting {self.name} = {value}")
        obj.__dict__[self.name] = value
    
    def __set_name__(self, owner, name):  # Python 3.6+
        self.name = name

class MyClass:
    attr = Descriptor()

m = MyClass()
m.attr = 42   # 调用 Descriptor.__set__
print(m.attr)  # 调用 Descriptor.__get__
```

**`@property` 的本质**：
```python
# @property 的等价实现（简化版）
class property:
    def __init__(self, fget=None, fset=None):
        self.fget = fget; self.fset = fset
    
    def __get__(self, obj, objtype=None):
        if obj is None: return self   # 类级访问返回描述符本身
        if self.fget is None: raise AttributeError
        return self.fget(obj)
    
    def __set__(self, obj, value):
        if self.fset is None: raise AttributeError("can't set attribute")
        self.fset(obj, value)
    
    def setter(self, fset):
        return property(self.fget, fset)

class Circle:
    def __init__(self, radius):
        self._radius = radius
    
    @property
    def radius(self) -> float:
        return self._radius
    
    @radius.setter
    def radius(self, value: float):
        if value < 0: raise ValueError("Radius must be non-negative")
        self._radius = value
```

**描述符查找顺序（MRO）**：
1. 数据描述符（有 `__set__`）优先级最高
2. 实例 `__dict__`
3. 非数据描述符（只有 `__get__`）

**考察点**：
1. 数据描述符 vs 非数据描述符的优先级
2. `__get__(obj=None)` 时是类级访问（返回描述符本身）
3. ORM 的 Column 定义本质是描述符

**示例答案**：
描述符是实现了 `__get__/__set__/__delete__` 的对象，当它作为类属性时，属性访问会触发这些方法。`@property` 就是内置描述符，把方法伪装成属性访问，在 getter/setter 里可以做验证和计算。数据描述符（有 `__set__`）优先级高于实例 `__dict__`，所以 `@property` 的 setter 能正确拦截赋值；非数据描述符（如普通函数，只有 `__get__`）优先级低于实例 `__dict__`，所以实例属性可以 shadow 方法（虽然不推荐）。SQLAlchemy 的 Column 定义就是描述符，`User.name == 'Alice'` 触发 `Column.__eq__`，返回 SQL 表达式而非布尔值，这是 ORM 魔法的底层原理。

---

### Q50: 谈谈 MySQL 的 EXPLAIN 输出，如何定位慢查询的根本原因？

**🏢 高频公司**：所有大厂（必考 SQL 优化）

**题目讲解**：
```sql
EXPLAIN SELECT u.name, o.total 
FROM users u 
JOIN orders o ON u.id = o.user_id 
WHERE u.city = 'Beijing' 
ORDER BY o.created_at DESC 
LIMIT 10;
```

**EXPLAIN 关键字段详解**：
```
id   | select_type | table | type   | key         | key_len | rows  | Extra
1    | SIMPLE      | u     | ref    | idx_city    | 132     | 5000  | Using index condition
1    | SIMPLE      | o     | ref    | idx_user_id | 8       | 3     | Using filesort
```

- **type（最重要）**：
  - `ALL` → 全表扫描（必须优化）
  - `index` → 全索引扫描（好一点但仍可能慢）
  - `range` → 索引范围扫描（可接受）
  - `ref` → 非唯一索引等值查询（好）
  - `eq_ref` → 唯一索引等值查询（JOIN 时最好）
  - `const/system` → 主键等值（最快）

- **Extra 关键信息**：
  - `Using filesort` → 排序没走索引（额外排序操作，可能很慢）
  - `Using temporary` → 用了临时表（GROUP BY / DISTINCT 时常见，很慢）
  - `Using index` → 覆盖索引（只读索引不读行，很快）
  - `Using index condition` → 索引条件下推（ICP）
  - `Backward index scan` → 逆序索引扫描

**慢查询定位流程**：
```sql
-- 1. 开启 slow_query_log，找出 > 1s 的查询
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;

-- 2. EXPLAIN 分析执行计划，看 type 和 Extra
EXPLAIN SELECT ...;

-- 3. SHOW WARNINGS (MySQL 8.0) 看优化后的 SQL
EXPLAIN SELECT ...; SHOW WARNINGS;

-- 4. 针对性优化
-- type=ALL → 加索引
-- Using filesort → ORDER BY 字段加到索引
-- Using temporary → 考虑 GROUP BY 优化
```

**索引失效常见原因**：
```sql
WHERE YEAR(created_at) = 2024      -- 函数包裹索引列，失效
WHERE username != 'admin'          -- 不等于，通常失效（走全表更快）
WHERE phone LIKE '%1234'           -- 前缀模糊，失效
WHERE age + 1 = 18                 -- 表达式，失效
WHERE phone = 13812345678          -- 类型不匹配（字符串列传数字），失效
```

**考察点**：
1. `Using filesort` 不一定在文件系统排序（内存也是 filesort）
2. `rows` 是估计值，不是精确值
3. 覆盖索引（Using index）是最高效的查询方式

**示例答案**：
定位慢查询的标准流程：slow_query_log 找出慢 SQL → EXPLAIN 看执行计划 → 重点看 type（是否全表扫描）、key（是否走了预期索引）、Extra（是否有 filesort/temporary）。最常见的问题是 type=ALL（没有合适索引），加索引后看 type 变成 ref/range。Using filesort 表示 ORDER BY 没有用上索引，通常是排序字段不在索引里，或者 ORDER BY 和 WHERE 条件的联合索引顺序不对。Using temporary 通常出现在 GROUP BY 字段没索引的情况，非常慢，解决方案是给 GROUP BY 字段加索引或者改写查询。EXPLAIN ANALYZE（MySQL 8.0.18+）能看到实际执行时间，比 EXPLAIN 的估算更准确，是性能调优的利器。

---

*本篇共 9 题（Q42-Q50），与前两篇合计 50 道后端面试题。*
### Q42: 什么是 JWT？它和 Session 认证有什么区别？JWT 的安全问题有哪些？

**🏢 高频公司**：字节、腾讯、小红书

**题目讲解**：

**Session 认证（有状态）**：
- 登录时服务端生成 session，存储在 Redis/DB，返回 session_id（存 Cookie）
- 每次请求携带 session_id，服务端查 Redis 验证
- 优点：可以随时使 session 失效（直接删 Redis）
- 缺点：服务端需要存储状态，多节点需要 Redis 共享 session

**JWT 认证（无状态）**：
- 登录时服务端生成 JWT（Header.Payload.Signature），返回给客户端
- 客户端每次请求携带 JWT（通常在 Authorization: Bearer 头）
- 服务端只需验证签名，无需查存储
- 优点：无状态，天然支持横向扩展
- 缺点：无法主动使 token 失效（需要额外机制）

**JWT 结构**：
```
Header: {"alg": "HS256", "typ": "JWT"}
Payload: {"sub": "user123", "exp": 1716451200, "iat": 1716364800}
Signature: HMACSHA256(base64(header) + "." + base64(payload), secret)
```

**JWT 安全问题**：
1. **Algorithm None 攻击**：修改 alg=none，签名变空，某些库会通过验证 → 验证时必须指定允许的算法
2. **密钥泄漏**：JWT 的安全完全依赖 secret，secret 泄漏则所有 token 被伪造
3. **无法吊销**：token 有效期内无法使其失效（解决：黑名单列表存 Redis，每次验证时检查）
4. **Payload 可见**：base64 不是加密，payload 内容任何人都能解码看到（不要存敏感信息）
5. **Refresh Token 滚动**：access_token 短期（15min），refresh_token 长期（7天），refresh 时轮换 refresh_token（Rotation），防止 refresh_token 被盗用

**考察点**：
1. JWT 用 base64url 编码（非加密），Payload 对任何人可见
2. RS256 vs HS256（非对称 vs 对称）
3. Refresh Token Rotation 的安全性

**示例答案**：
Session 是有状态的，服务端存 session 数据；JWT 是无状态的，状态编码在 token 里。JWT 的优势是横向扩展友好（任何节点都能验证，不需要共享存储），缺点是无法主动吊销。解决方案：短期 access_token（15分钟）+ 长期 refresh_token（7天），access_token 过期用 refresh_token 换新的同时使旧 refresh_token 失效（Rotation），如果旧 refresh_token 被重用则检测到盗用，使所有该用户的 token 失效。安全上，alg 必须在服务端强制指定，不接受客户端传来的 alg 值（防 Algorithm None 攻击）；Payload 不存密码、身份证号等敏感信息（因为 base64 不是加密，任何人都能解码）。

---

### Q43: SQL 注入原理和防御方法是什么？ORM 为什么能防止 SQL 注入？

**🏢 高频公司**：阿里、字节、腾讯

**题目讲解**：
**SQL 注入原理**：
用户输入被拼接到 SQL 语句中，恶意输入改变了 SQL 的逻辑：
```python
# ❌ 危险：字符串拼接
username = request.args.get('username')  # 输入: ' OR '1'='1
sql = f"SELECT * FROM users WHERE username = '{username}'"
# 实际执行: SELECT * FROM users WHERE username = '' OR '1'='1'
# 返回所有用户！
```

**防御方法**：

**1. 参数化查询（Parameterized Query / Prepared Statement）**：
```python
# ✅ 安全：参数与 SQL 分离
cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
# 数据库先编译 SQL，再绑定参数（参数被当作数据，不被解析为 SQL）
```

**2. ORM 自动参数化**：
```python
# SQLAlchemy ORM（自动参数化）
user = session.query(User).filter(User.username == username).first()
# 生成的 SQL: SELECT * FROM users WHERE username = ? 参数: (username,)
```

**3. 输入验证**（辅助，不是主要防御）：
```python
import re
if not re.match(r'^[a-zA-Z0-9_]+$', username):
    raise ValueError("Invalid username")
```

**4. 最小权限原则**：数据库账号只给必要的权限（SELECT 账号不给 DROP/UPDATE）

**ORM 为什么安全**：
ORM 在底层总是使用参数化查询，用户输入作为参数传递而非拼接到 SQL 字符串，数据库驱动在协议层区分"查询模板"和"参数值"。

**考察点**：
1. 二阶 SQL 注入（First-Order vs Second-Order）
2. NoSQL 注入（MongoDB 的 $where、$gt 注入）
3. 存储过程的安全性（也需要参数化）

**示例答案**：
SQL 注入的根本原因是把用户数据和 SQL 代码混在一起。参数化查询把两者分离：数据库先解析 SQL 模板（固定结构），再绑定参数（用户输入当数据），无论用户输入什么都不会改变 SQL 结构。ORM 框架（SQLAlchemy/Django ORM）底层总是用参数化查询，只要不手写 `text()` 拼接 SQL，就不会有注入风险。二阶注入是个进阶陷阱：第一步存储用户输入（存储时安全，没有执行），第二步读出来后拼接到 SQL 里执行（这时才注入）——所以从 DB 读出来再拼 SQL 也是危险的，始终要参数化。

---

### Q44: 分布式系统中如何保证接口幂等性？

**🏢 高频公司**：阿里、字节

**题目讲解**：
**幂等性定义**：同一操作执行多次与执行一次的效果相同。

**为什么需要幂等**：
- 网络重试（客户端超时后重发）
- 消息队列重复消费（At-Least-Once 语义）
- 用户重复提交（点击两次按钮）

**幂等性实现方案**：

**1. 唯一请求 ID（Idempotency Key）**：
```python
# 客户端生成唯一 ID，每次请求携带
# 服务端用 Redis SETNX 保证只处理一次
def create_order(idempotency_key: str, order_data: dict):
    # NX: 不存在才设置，EX: 过期时间（防永久占用）
    if not redis.set(f"idem:{idempotency_key}", "1", nx=True, ex=3600):
        # 已处理过，返回上次的结果
        return redis.get(f"idem_result:{idempotency_key}")
    result = _do_create_order(order_data)
    redis.setex(f"idem_result:{idempotency_key}", 3600, json.dumps(result))
    return result
```

**2. 数据库唯一约束**：
```sql
-- 对业务唯一字段加唯一索引
CREATE UNIQUE INDEX idx_order_no ON orders(order_no);
-- 重复插入会抛 DuplicateKeyError，业务层 catch 后返回已有订单
```

**3. 乐观锁版本号**：
```sql
UPDATE inventory SET stock = stock - 1, version = version + 1
WHERE product_id = 1 AND version = {expected_version}
-- 同一 version 只能有一个请求成功，重试时 version 已变更会失败
```

**4. Token 机制（表单防重复提交）**：
- 打开表单时服务端生成 token 存 Redis
- 提交时带上 token，服务端 delete 后处理（Redis GETDEL）
- 重复提交时 token 已不存在，直接拒绝

**考察点**：
1. 幂等 key 的 TTL 设计（过期时间 vs 业务完成时间）
2. 分布式 SETNX 的原子性（Lua 脚本保证 set + get 原子）
3. 哪些操作天然幂等（GET/DELETE 幂等，POST 不幂等）

**示例答案**：
幂等实现的核心思路是"同一请求只处理一次"。最通用的方案是 Idempotency Key：客户端请求时生成唯一 ID（UUID），服务端用 Redis SETNX 以这个 ID 为 key 原子地"占位"，占到的处理并缓存结果，没占到的直接返回已有结果，实现完全幂等。电商订单场景通常组合使用：Idempotency Key 防重试，数据库唯一索引防并发重复下单（兜底），乐观锁防止库存超卖。Kafka 消费者的幂等靠消息 ID：消费前检查 Redis 是否已有该消息 ID 的处理记录，有则 skip，无则处理并记录，形成"恰好一次"语义（At-Least-Once + 幂等 = Exactly-Once）。

---

### Q45: 如何设计一个秒杀系统？应对瞬时高并发的核心手段？

**🏢 高频公司**：阿里（双十一）、字节、腾讯

**题目讲解**：
**核心挑战**：
- 读多写少（99% 是查库存）：读操作用缓存承接
- 瞬时峰值（10万QPS → 0.1秒内卖出1000件）：写操作要防超卖

**分层设计**：

**1. 前端限流（用户侧）**：
- 点击秒杀按钮后 disable（防重复提交）
- 加 CDN 缓存静态页面（不打到源站）

**2. 网关限流**：
- 令牌桶限流，控制进入系统的 QPS
- 对同一用户限频（每人每秒最多1次请求）

**3. 库存预热（Redis）**：
```python
# 秒杀开始前，库存写入 Redis
redis.set("seckill:product:1001:stock", 1000)

# 秒杀时原子扣减（Lua 脚本保证原子性）
lua_script = """
local stock = tonumber(redis.call('get', KEYS[1]))
if stock > 0 then
    redis.call('decr', KEYS[1])
    return 1  -- 成功
else
    return 0  -- 库存不足
end
"""
result = redis.eval(lua_script, 1, "seckill:product:1001:stock")
```

**4. 异步落库（MQ 削峰）**：
```python
if result == 1:
    # 秒杀成功，发 MQ 消息，异步创建订单
    kafka.send("seckill_orders", {
        "user_id": user_id, "product_id": 1001
    })
    return "秒杀成功，订单处理中"
```

**5. 数据库层保障（兜底防超卖）**：
```sql
-- 即使 Redis 出错，数据库的 CHECK 约束兜底
UPDATE products SET stock = stock - 1
WHERE product_id = 1001 AND stock > 0
-- 影响行数为 0 则超卖，回滚
```

**6. 订单去重（用户只能买一件）**：
- 数据库联合唯一索引：`(user_id, product_id, seckill_activity_id)`

**考察点**：
1. Redis 扣减库存后 DB 扣减失败的一致性问题（最终一致性方案）
2. 热 key 问题（同一商品的 Redis key 被所有节点请求）
3. 消息队列的背压机制（下游处理不过来时如何保护）

**示例答案**：
秒杀的核心是"把 DB 压力转移到缓存"和"把同步变异步"。读操作全走 Redis 库存缓存（秒杀前预热）；写操作用 Redis Lua 脚本原子扣减库存，成功的发 Kafka 消息异步创建订单，失败的直接返回。DB 只承接 Kafka 消费者的异步写入，QPS 从峰值的十万降到稳定的几千，可以从容处理。防超卖三重保障：Redis 原子扣减（第一道关）、Kafka 幂等消费（第二道）、DB 的 `stock > 0` 条件更新（第三道兜底）。热 key 问题：对热门商品的 Redis key 做 sharding（`seckill:1001:0`、`seckill:1001:1`...N 个 key，分散到不同节点），请求按 hash 路由，N 倍分散热点。

---

### Q46: 什么是服务网格（Service Mesh）？Istio 的 Sidecar 模式解决了什么问题？

**🏢 高频公司**：腾讯、字节、阿里

**题目讲解**：
**微服务的通信痛点**：
每个服务都要实现：服务发现、负载均衡、熔断限流、链路追踪、mTLS 加密... 这些横切关注点让每个服务都很重，且难以统一。

**Service Mesh（服务网格）**：
把网络通信逻辑下沉到基础设施层，应用代码只关注业务逻辑。

**Istio Sidecar 模式**：
每个 Pod 注入一个 Envoy Proxy 容器（Sidecar），所有进出该 Pod 的网络流量经过 Proxy 处理：
```
Service A → [Envoy Sidecar A] → [Envoy Sidecar B] → Service B
                ↓ 上报                    ↑
           Control Plane (Istiod)
```

**Sidecar 提供的功能**（无需修改应用代码）：
- **服务发现 + 负载均衡**：Envoy 知道所有服务实例
- **熔断 + 限流**：在 Proxy 层面自动实现
- **mTLS**：服务间通信自动加密，证书由 Istiod 管理
- **链路追踪**：自动在请求头注入 trace ID
- **流量管理**：灰度发布、A/B 测试（控制 10% 流量到新版本）

**代价**：
- 每个 Pod 多一个 Sidecar 容器（CPU + 内存开销）
- 链路多一跳（延迟增加约 1-5ms）
- 运维复杂度增加

**考察点**：
1. Service Mesh vs API Gateway 的区别（东西向 vs 南北向）
2. eBPF 模式（Cilium）替代 Sidecar（无注入，内核层处理）
3. Sidecar 的控制平面（Istiod）和数据平面（Envoy）分离

**示例答案**：
Service Mesh 解决微服务通信的横切关注点问题——服务发现、熔断、链路追踪等每个服务都要写一遍，而且各语言的实现可能不一致。Istio 的 Sidecar 方案是每个 Pod 注入 Envoy Proxy，所有流量经过 Proxy，功能在基础设施层统一实现，应用代码完全不感知。控制平面（Istiod）管理配置和证书，数据平面（Envoy）执行规则和加密。代价是多一个 Sidecar 的资源开销和额外延迟，对延迟敏感的服务要权衡。新兴的 eBPF 方案（Cilium）把网络处理下沉到 Linux 内核，不需要 Sidecar，性能更好，是 Service Mesh 的未来方向。

---

### Q47: Docker 和 K8s 的核心概念是什么？Pod、Deployment、Service 的关系？

**🏢 高频公司**：字节、阿里、腾讯（运维必考）

**题目讲解**：

**Docker 核心概念**：
- **Image（镜像）**：只读的应用快照（代码 + 依赖 + 运行时），Dockerfile 定义
- **Container（容器）**：镜像的运行实例，隔离的进程（namespace + cgroups）
- **Registry**：镜像仓库（Docker Hub / 阿里云 ACR）

**K8s 核心概念**：

**Pod**（最小调度单位）：
- 一个或多个共享网络和存储的容器
- 有唯一 IP，容器间通过 localhost 通信
- Pod 是临时的，宕机不会自动重建

**Deployment**（无状态服务管理）：
- 声明"我需要 3 个 Pod 副本"
- 自动创建/删除 Pod 保持副本数
- 支持滚动更新和回滚

**Service**（稳定访问入口）：
- Pod IP 会变，Service 提供稳定的虚拟 IP（ClusterIP）
- 通过 Label Selector 关联后端 Pod
- kube-proxy 实现负载均衡（iptables / ipvs）

**三者关系**：
```
Deployment → 管理 → Pod Pod Pod
                          ↓  ↓  ↓
Service → 负载均衡访问 →  Pod Pod Pod
                ↑
  外部请求通过 Service 访问（ClusterIP / NodePort / LoadBalancer）
```

**StatefulSet**（有状态服务）：
- Pod 有稳定的名字（pod-0, pod-1, pod-2）和持久化存储（PVC）
- 适合 MySQL、Redis、Kafka 等有状态应用

**考察点**：
1. Pod 重启后 IP 变化，为什么 Service 能稳定路由
2. Deployment 的滚动更新策略（maxSurge / maxUnavailable）
3. ConfigMap / Secret 的使用场景

**示例答案**：
Docker 提供轻量级容器化（镜像打包 + 隔离运行），K8s 是容器编排系统，管理大量容器的部署、扩缩容、服务发现。核心三层：Pod 是最小单位（一个或多个容器共享网络），Deployment 管理 Pod 的声明式部署（"始终保持 3 个副本"，有挂立即重建），Service 提供稳定访问入口（Pod IP 会变，Service IP 不变，通过 Label Selector 找到后端 Pod 并负载均衡）。实际部署：Dockerfile 打镜像 → 推 Registry → K8s 通过 Deployment yaml 拉镜像启动 Pod → Service 暴露端口供外部/内部访问。配置用 ConfigMap（非敏感）和 Secret（敏感，Base64 编码），挂载到 Pod 里，修改 ConfigMap 不需要重建 Pod。

---

