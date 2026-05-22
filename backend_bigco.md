# 后端面试专项 · 大厂高频题

> 来源：字节跳动 / 腾讯 / 小红书 / 阿里 真实面经整理
> 每题标注高频出现公司

---

## 字节跳动高频（算法 + 系统设计）

### Q32: 字节 面试：设计一个高并发的短链接系统（TinyURL）

**🏢 高频公司**：字节（高频系统设计）、腾讯、阿里

**题目解析**：
短链接是经典系统设计题，覆盖 ID 生成、缓存、存储、高可用等核心知识点。

**题目讲解**：
**核心功能**：
- 将长 URL 转换为短链接（例：`https://bit.ly/3xK9Zp`）
- 访问短链接 302/301 重定向到原始 URL

**规模估计**（字节级别）：
- 每天 1 亿次新建短链请求
- 每天 10 亿次访问（读写比 10:1）
- 短链存储：100 亿条 × 500 字节 ≈ 5TB

**核心设计**：

**1. 短码生成**：
- **方案一：自增 ID → Base62 编码**
  - `10亿` → Base62 6位字符（62^6 ≈ 568亿，够用）
  - ID 由发号器（Snowflake / 数据库自增）生成
  - 问题：自增 ID 可以枚举（遍历所有短链）

- **方案二：MD5/哈希取前 N 位**
  - 对长 URL 取 MD5，取前 8 位
  - 存在哈希碰撞，需要检测冲突

- **方案三：Snowflake ID → Base62（推荐）**
  - 全局唯一，趋势递增，不可枚举

**2. 存储设计**：
```
数据库表: url_mapping
  short_code  VARCHAR(8) PRIMARY KEY
  long_url    TEXT
  user_id     BIGINT
  created_at  TIMESTAMP
  expires_at  TIMESTAMP (可选)
  click_count BIGINT

索引: short_code (主键), long_url (唯一索引，防重复创建)
```

**3. 缓存设计**：
- Redis 缓存热点短链：`short_code → long_url`，TTL 24h
- Cache-Aside：查缓存 miss 后查 DB，回填缓存
- LRU 淘汰策略（20% 的短链产生 80% 的访问）

**4. 301 vs 302 重定向**：
- **301（永久重定向）**：浏览器缓存，下次不再请求短链服务器
  - 优点：减轻服务器压力
  - 缺点：无法统计点击量（浏览器直接跳转）
- **302（临时重定向）**：每次都请求短链服务器
  - 优点：可以统计点击量、支持短链失效
  - 推荐：用 302，统计价值更高

**5. 防滥用**：
- 单 IP 限流（令牌桶）
- 黑名单 URL 检测（已知钓鱼/恶意网站）
- 短链有效期（可设置过期时间）

**考察点**：
1. 哈希碰撞的处理策略
2. 读多写少的缓存优化
3. 分库分表（按 short_code 哈希分片）

**示例答案**：
短链系统的核心是 ID 生成 + 缓存。ID 选用 Snowflake 生成全局唯一 64 位 ID，转 Base62 得到 7-8 位短码，不可枚举且趋势递增（对 DB 写入友好）。存储用 MySQL，short_code 作主键，long_url 加唯一索引防重复生成（同一长链多次请求返回同一短码）。缓存是关键：读写比 10:1，热点短链用 Redis LRU 缓存，命中率轻松 >95%，每天 10 亿次访问里 9.5 亿走缓存，数据库只承接 5000 万次。重定向用 302 而非 301，每次访问都到我们服务器，可以统计点击量（存 ClickHouse 做分析）、实现短链失效（设 expires_at 字段）。大规模场景下 MySQL 按 short_code 哈希分 64 片，每片 ~1.5 亿条，单表 B+ 树索引压力不大。访问统计用异步写（访问先响应重定向，后台异步 incr click_count），避免统计成为性能瓶颈。

---

### Q33: 字节 面试：实现一个 LFU（Least Frequently Used）缓存

**🏢 高频公司**：字节（算法题）

**题目解析**：
LFU 比 LRU 更复杂，需要同时追踪访问频次，考察候选人的数据结构设计能力。

**题目讲解**：

**LFU 的关键数据结构**：
- `key → (value, freq)` 映射
- `freq → LinkedHashSet[keys]`（相同频次的 key，按访问时间 LRU 淘汰）
- `minFreq`：当前最小频次（淘汰时用）

```python
from collections import defaultdict, OrderedDict

class LFUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.min_freq = 0
        self.key_to_val = {}          # key → value
        self.key_to_freq = {}         # key → freq
        self.freq_to_keys = defaultdict(OrderedDict)  # freq → {key: None} (有序)
    
    def get(self, key: int) -> int:
        if key not in self.key_to_val:
            return -1
        self._increase_freq(key)
        return self.key_to_val[key]
    
    def put(self, key: int, value: int) -> None:
        if self.capacity <= 0:
            return
        if key in self.key_to_val:
            self.key_to_val[key] = value
            self._increase_freq(key)
        else:
            if len(self.key_to_val) >= self.capacity:
                self._remove_min_freq()
            self.key_to_val[key] = value
            self.key_to_freq[key] = 1
            self.freq_to_keys[1][key] = None
            self.min_freq = 1
    
    def _increase_freq(self, key):
        freq = self.key_to_freq[key]
        self.key_to_freq[key] = freq + 1
        del self.freq_to_keys[freq][key]
        if not self.freq_to_keys[freq]:
            del self.freq_to_keys[freq]
            if self.min_freq == freq:
                self.min_freq += 1
        self.freq_to_keys[freq + 1][key] = None
    
    def _remove_min_freq(self):
        keys = self.freq_to_keys[self.min_freq]
        # OrderedDict 删除最早插入的（LRU 兜底）
        oldest_key = next(iter(keys))
        del keys[oldest_key]
        if not keys:
            del self.freq_to_keys[self.min_freq]
        del self.key_to_val[oldest_key]
        del self.key_to_freq[oldest_key]
```

**时间复杂度**：get 和 put 均 O(1)。

**考察点**：
1. freq_to_keys 用 OrderedDict（频次相同时按 LRU 淘汰）
2. min_freq 的维护时机（新 key 插入时 min_freq = 1；删除 min_freq 对应的最后一个 key 后更新）
3. 边界：capacity=0 时直接 return

**示例答案**：
LFU 的难点是同时维护"访问频次"和"相同频次下按 LRU 淘汰"两个维度。关键数据结构是 `freq → OrderedDict[key]`：相同频次的 key 放在一个 OrderedDict 里，最早访问的在头部（淘汰时删头部）。min_freq 追踪当前最小频次，淘汰时直接取 `freq_to_keys[min_freq]` 的最早 key。每次访问后，把该 key 从 freq N 的桶移到 freq N+1 的桶，如果 freq N 桶空了且 N == min_freq，则 min_freq 加一。插入新 key 时，其 freq=1，min_freq 强制设为 1（因为新 key 频次最低）。全部操作 O(1)，但实现比 LRU 复杂很多，面试时先确认数据结构设计，再写代码。

---

### Q34: 字节 面试：MySQL 有一张 10 亿行的大表，如何查询最近 7 天的数据并保持性能？

**🏢 高频公司**：字节、阿里（数据库优化题）

**题目解析**：
大表查询优化是后端工程实践中的核心问题，考察候选人对索引、分区、归档的实际经验。

**题目讲解**：
**问题分析**：
```sql
-- 慢查询：全表扫描或索引扫描 10 亿行
SELECT * FROM events 
WHERE created_at > NOW() - INTERVAL 7 DAY 
ORDER BY created_at DESC LIMIT 20;
```

**解决方案（由简到复杂）**：

**1. 正确索引（最基础）**：
```sql
-- 确保 created_at 有索引，且查询能走索引
CREATE INDEX idx_created_at ON events(created_at);
-- 如果有用户维度过滤，用复合索引
CREATE INDEX idx_user_created ON events(user_id, created_at);
```
- 查询条件 `created_at > NOW()-7天` 走范围扫描，若 7 天数据占总数据的 1%，扫描 1000 万行

**2. 分区表（Partitioning）**：
```sql
CREATE TABLE events (
  id BIGINT,
  user_id BIGINT,
  created_at DATETIME,
  ...
) PARTITION BY RANGE (TO_DAYS(created_at)) (
  PARTITION p2026_01 VALUES LESS THAN (TO_DAYS('2026-02-01')),
  PARTITION p2026_02 VALUES LESS THAN (TO_DAYS('2026-03-01')),
  ...
);
```
- 按月分区，7 天查询只扫描 1-2 个分区（而非全表）
- 分区修剪（Partition Pruning）让 MySQL 跳过不相关分区
- 老分区可以 `ALTER TABLE DROP PARTITION` 快速删除（而非 DELETE 亿行）

**3. 数据冷热分离**：
- 热数据（近 3 个月）存 MySQL，走分区索引
- 冷数据（3 个月前）归档到 TiDB/ClickHouse/S3
- 查询路由：按时间范围判断走热库还是冷库

**4. 读写分离 + 缓存**：
- 聚合统计结果缓存 Redis（比如"最近 7 天活跃用户数"每 5 分钟算一次，缓存结果）
- 明细数据走从库，避免影响主库写入

**5. 异步预计算（ClickHouse）**：
- 实时流数据写入 ClickHouse（列式存储，聚合查询极快）
- 报表类查询走 ClickHouse，而非 MySQL
- MySQL 只承担事务性读写

**考察点**：
1. 分区表的分区裁剪（MySQL EXPLAIN 里看 partitions 字段）
2. 归档策略（按时间归档，不影响热数据查询）
3. 为什么不建议 `LIMIT 100000, 20` 深分页（走完整索引扫描）

**示例答案**：
10 亿行大表的查询优化要分步骤。第一步确认索引：`created_at` 字段必须有索引，查询 7 天数据约扫描 700 万行（假设均匀分布），有索引能走范围扫描。第二步分区表：按月分区，7 天查询只需扫描 1-2 个分区，MySQL 分区裁剪直接跳过其他 9.x 亿行，效果最显著。第三步冷热分离：超过 6 个月的历史数据归档到 ClickHouse 或对象存储，MySQL 只保留热数据，表从 10 亿行缩到 5000 万行，所有操作都快很多。查询路由层（中间件或应用层）根据时间范围决定走 MySQL 热库还是 ClickHouse 冷库。对于高频聚合查询（昨日 PV/UV），用 Flink 实时计算结果写入 Redis，前端直接读缓存，完全不查 MySQL。深分页（LIMIT 100000, 20）是另一个坑，要用游标分页替代，`WHERE id > last_id LIMIT 20`，把 O(N) 的 offset 扫描变成 O(1) 的范围查找。

---

## 腾讯高频

---

### Q35: 腾讯 面试：如何设计一个消息推送系统（支持千万在线用户）？

**🏢 高频公司**：腾讯（微信/QQ 业务）、字节

**题目解析**：
消息推送是腾讯的核心业务场景，考察候选人对 IM 系统架构的理解。

**题目讲解**：
**系统规模**：
- 1000 万在线用户，每秒 100 万条消息，消息延迟 < 100ms

**架构设计**：

**1. 长连接层（Gateway）**：
- 用户通过 WebSocket 或 TCP 长连接保持在线
- 每台 Gateway 服务器维护 10 万个长连接（epoll IO 多路复用）
- 100 台 Gateway = 1000 万连接
- Gateway 无状态，只负责连接维持和消息路由

**2. 用户路由（Route Table）**：
- `user_id → gateway_ip:port` 的映射
- 存 Redis（毫秒级查询）
- 用户上线时写入，下线时删除（携带过期时间防止 crash 后残留）

**3. 消息队列（Kafka）**：
- 消息先写 Kafka（持久化，削峰）
- Push Service 消费 Kafka，根据 Route Table 找到 Gateway，通过内部 RPC 推送

**4. 消息可靠性**：
- **At-Least-Once 投递**：消息 ID + 接收方 ACK
- 未 ACK 的消息：Push Service 定时重试（最多 3 次，间隔指数退避）
- 消息离线存储：用户不在线时存入"离线消息队列"，上线后拉取

**5. 消息 ID 生成**：
- Snowflake 生成消息 ID（趋势递增 + 机器标识）
- 接收方用消息 ID 去重（防止重复推送）

**6. 群消息（Fan-out）**：
- 小群（<100人）：直接 fan-out 到每个成员的 Gateway
- 大群（>1000人）：写扩散（每个成员自己拉取）+ Push 通知有新消息
- 超大群（微信大群）：时间线模型，成员按游标拉取

**7. 状态同步（多端）**：
- 用户在手机 + PC 同时登录
- 消息要推送到所有在线设备（Route Table 支持一个 user_id → 多个 device）

**考察点**：
1. 长连接的 epoll 模型（单机 10 万+ 连接）
2. Fan-out 读写扩散的选择依据（群大小）
3. 离线消息和在线推送的统一设计

**示例答案**：
千万在线 IM 系统的核心是两点：高效维持长连接 + 精准路由投递。Gateway 层用 epoll IO 多路复用，单机 10 万长连接没问题（Nginx 单机处理 5 万并发是基准），100 台 Gateway 足够。路由表存 Redis，`user_id:device_id → gateway_addr`，上线时写入（10s TTL 防崩溃残留，心跳续期），一个 user_id 可以对应多个设备地址（多端同步）。消息流：发送方 → 写 Kafka（削峰持久化）→ Push Service 消费 → 查 Route Table → 找到 Gateway → Gateway 推送到对应长连接。可靠性靠 ACK + 重试：Push Service 发完消息等接收方 ACK，超时重试最多 3 次；接收方用消息 ID 幂等去重。群消息是最大挑战：百人以下群直接 fan-out 推送，几千人的群用"推通知（有新消息）+ 拉内容"分离，避免单条消息触发几千次推送把系统打垮。

---

