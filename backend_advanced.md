# 后端开发面试八股 · 进阶篇

> 接续基础篇，涵盖：MySQL进阶 / Redis进阶 / Elasticsearch / gRPC / Docker/K8s / Python高级 / Java JVM / 分布式进阶 / 算法

---

## 八、MySQL 进阶

### Q19: MySQL 的锁机制有哪些？间隙锁（Gap Lock）是什么？

**题目解析**：MySQL 锁机制是事务和并发控制的核心，深度考察候选人的数据库原理掌握。

**题目讲解**：
**锁的分类**：

1. **按粒度**：
   - 表锁（Table Lock）：开销小，并发低，MyISAM 默认
   - 行锁（Row Lock）：InnoDB 默认，并发高，开销大
   - 意向锁（Intention Lock）：表级锁，声明意图（IS/IX），兼容性检查用

2. **按模式**：
   - 共享锁（S Lock）：`SELECT ... LOCK IN SHARE MODE`，多个事务可同时持有，写会阻塞
   - 排他锁（X Lock）：`SELECT ... FOR UPDATE` 或 DML，独占，其他读写均阻塞

3. **InnoDB 行锁的三种形式**：
   - **Record Lock（记录锁）**：锁定单行记录
   - **Gap Lock（间隙锁）**：锁定索引间的"间隙"（不包含记录本身），防止其他事务在间隙中插入
   - **Next-Key Lock**：Record Lock + Gap Lock，锁定记录及其前面的间隙，InnoDB 在 RR 级别的默认锁

**Gap Lock 的作用**：
防止幻读。在 RR 级别下，`SELECT WHERE id BETWEEN 10 AND 20 FOR UPDATE` 会对 10-20 的间隙加间隙锁，其他事务无法在这个范围内插入新记录，避免了幻读。

**锁的升级（锁膨胀）**：
大量行锁时，MySQL 可能把行锁升级为表锁（节省内存），导致并发急剧下降。

**死锁检测**：
InnoDB 有死锁检测机制，发现等待环路后回滚代价最小的事务，应用层需要处理重试。

**考察点**：
1. Next-Key Lock 如何防止幻读（范围 + 间隙都锁住）
2. RC 级别下不需要 Gap Lock（RC 已经允许幻读）
3. INSERT INTENTION LOCK（插入意向锁）和 Gap Lock 的冲突

**示例答案**：
InnoDB 行锁有三种：Record Lock 锁单行，Gap Lock 锁间隙（范围内没有记录的空间），Next-Key Lock = Record + Gap，是 RR 级别的默认锁形式。Gap Lock 是防幻读的关键——`SELECT * FROM orders WHERE amount BETWEEN 100 AND 200 FOR UPDATE` 不只锁定这个范围内已存在的行，还锁定了这个范围的"间隙"，其他事务想在 100-200 里 INSERT 会被阻塞，直到当前事务提交，这样两次范围查询的结果集不会变，实现了 RR 的幻读防护。代价是间隙锁可能导致并发下降，因为插入操作可能被莫名阻塞（实际没有记录冲突）。RC 级别不需要 Gap Lock（它本来就允许幻读），并发更好，很多公司生产环境把隔离级别降到 RC。死锁常见于两个事务以相反顺序加锁，InnoDB 自动检测并回滚代价小的那个，代码里要捕获 `ER_LOCK_DEADLOCK` 错误并重试。

---

### Q20: 如何设计 MySQL 分库分表？有哪些拆分策略和中间件？

**题目解析**：分库分表是大数据量下的扩展方案，是大厂面试必考的系统设计题。

**题目讲解**：
**什么时候分库分表**：
- 单表数据量 > 1000万行，查询开始变慢
- 单库 QPS 超过瓶颈（通常 MySQL 单实例 5000-10000 QPS）
- 磁盘容量不足

**拆分维度**：
1. **垂直分库**：按业务拆分（用户库/订单库/商品库），服务化拆分
2. **垂直分表**：把大宽表按字段频率拆分（常用字段一张表，大字段/不常用字段另一张表）
3. **水平分库**：同一业务数据按某个 key 分散到多个库
4. **水平分表**：同一库内按 key 分散到多张表

**水平分片策略**：
- **Range 分片**：`user_id < 1000000` → shard0，按数字/时间范围。热点集中（新数据全到最新分片）
- **Hash 分片**：`shard = hash(user_id) % shardCount`。数据均匀，但扩容需要数据迁移
- **Range + Hash 组合**：先 Range 分出大区间（年份），再 Hash 均匀分布

**中间件**：
- **ShardingSphere（Apache）**：Java 生态最成熟，支持分片、读写分离、分布式事务
- **MyCAT**：早期国产方案，代理层
- **Vitess（YouTube）**：云原生 MySQL 扩展，支持 Kubernetes

**分表后的痛点**：
- 跨片 JOIN（无法直接，需要应用层聚合）
- 跨片分页（每个分片 LIMIT 后聚合，效率低）
- 分布式全局 ID（不能用自增，用 Snowflake）
- 扩容时数据迁移（双写 + 迁移 + 切流）

**考察点**：
1. Hash 分片的扩容问题（一致性哈希缓解）
2. 分页的解决方案（游标分页，避免大 offset）
3. 分布式事务的处理（Saga / XA）

**示例答案**：
分库分表要先考虑是否真的必要——读写分离 + 索引优化 + 缓存通常能支撑更大的量。真正需要分片时，第一步是垂直拆分（按业务域拆库），减少单库压力，同时实现服务隔离。水平分片的 sharding key 选择是关键：选择基数大、分布均匀、查询条件总带的字段（如 user_id、order_id）。Hash 分片数据均匀但扩容麻烦（增加分片需要重新哈希，要做数据迁移，用一致性哈希可以缓解），Range 分片扩容简单但有热点问题（新数据都在最新分片）。跨片 JOIN 和分页是最大的痛点：JOIN 在应用层做（分两次查询再合并）；分页用游标（记录最后一条的 ID/时间，下次用 WHERE id > last_id LIMIT N），避免大 offset。ShardingSphere 是 Java 生态里最成熟的方案，能透明地处理分片路由，应用层几乎不需要感知分片逻辑。

---

### Q21: MySQL 的读写分离是如何实现的？主从延迟怎么处理？

**题目解析**：读写分离是 MySQL 最常见的扩展方案，考察候选人的数据库高可用实践经验。

**题目讲解**：
**主从复制原理**：
1. 主库写操作产生 binlog（Binary Log）
2. 从库的 I/O 线程拉取 binlog，写入本地 relay log
3. 从库的 SQL 线程回放 relay log，执行写操作
4. 延迟 = 主库写入 → 从库执行完成的时间差

**读写分离实现方式**：
1. **代码层**：分别配置主库和从库数据源，写操作用主库，读操作用从库
2. **中间件代理**：MyCat / ProxySQL / MaxScale，客户端只连代理，代理自动路由
3. **Spring AbstractRoutingDataSource**：动态切换数据源，结合 `@ReadOnly` 注解

**主从延迟处理**：
- **延迟来源**：网络延迟、从库回放速度跟不上（单线程回放 → MySQL 5.6+ 并行复制）
- **延迟监控**：`SHOW SLAVE STATUS` 的 `Seconds_Behind_Master` 字段
- **应用策略**：
  1. **强一致读走主库**：写后读（Write-After-Read）场景强制路由到主库，或等待从库同步后再读
  2. **延迟容忍**：订单状态实时显示走主库，报表统计可以走从库（允许秒级延迟）
  3. **半同步复制**：主库等至少一个从库确认收到 binlog 才提交，减少数据丢失但增加写延迟
  4. **GTID（全局事务 ID）**：基于 GTID 的从库等待，确保特定事务已经在从库执行完

**考察点**：
1. 主从延迟的根本原因（异步复制）
2. 写后读一致性的解决方案
3. MySQL 8.0 的多源复制和增强并行复制

**示例答案**：
主从复制是异步的，主库 commit 就返回，从库拉 binlog 并回放，延迟可能从几十毫秒到几秒。读写分离下最常见的问题是"写完立刻读不到"——比如用户修改了密码，下一个请求读从库发现还是旧密码。解决方案分场景：对实时性要求高的读（刚写完立刻读）强制走主库，可以通过 ThreadLocal 标记"此次事务后的读也走主库"或者用 @Primary 注解；对实时性要求不高的读（列表页、报表）走从库。中间件方案（ProxySQL）可以根据 SQL 类型自动路由，还能做连接池复用，对应用透明。延迟监控要接入告警，`Seconds_Behind_Master > 10` 时告警，部分业务降级（全部走主库），防止用户看到脏旧数据。MySQL 5.7+ 的增强并行复制（基于 WRITESET）能让从库并行回放不冲突的事务，把延迟从秒级降到百毫秒级。

---

## 九、Redis 进阶

---

### Q22: Redis 的持久化方式有哪些？RDB 和 AOF 如何选择？

**题目解析**：Redis 持久化是生产环境数据安全的基础，考察候选人对 Redis 运维的理解。

**题目讲解**：
**RDB（Redis Database Snapshot）**：
- 定时/手动 BGSAVE，将内存数据快照序列化到 `.rdb` 文件
- `fork()` 子进程做 snapshot，主进程继续服务（COW - Copy-on-Write）
- **优点**：文件紧凑，恢复速度快；fork 时主进程基本不影响（COW）
- **缺点**：两次 snapshot 之间的数据丢失（通常 5-15 分钟一次）
- 适合：数据丢失可接受几分钟的场景（缓存数据、非核心业务）

**AOF（Append Only File）**：
- 每个写命令追加到 `.aof` 文件（可配置 always/everysec/no 三种 fsync 策略）
- `everysec`（默认）：每秒 fsync，最多丢 1 秒数据，性能影响小
- **AOF 重写**：定期压缩 AOF 文件（去除过期/冗余命令，等效为当前状态的最小命令集）
- **优点**：数据丢失少（最多 1 秒）；文件可读，可手动修复
- **缺点**：文件比 RDB 大；恢复速度慢（需要重放所有命令）

**Redis 4.0+ 混合持久化**：
`aof-use-rdb-preamble yes`：AOF 重写时，前半段用 RDB 格式（快），后半段追加增量命令（近实时），兼顾两者优点。

**生产选择**：
- 缓存场景（允许丢数据）：只开 RDB 或不开持久化
- 重要数据（不允许丢）：AOF（everysec）或混合持久化
- 高可用：Redis Sentinel 或 Cluster，持久化是单机降级兜底

**考察点**：
1. RDB 的 COW 机制（fork 后父子进程共享内存，子进程修改时才复制）
2. AOF 三种 fsync 策略的性能和可靠性权衡
3. Redis Cluster 与持久化的关系（Cluster 本身是高可用，持久化是数据安全）

**示例答案**：
RDB 定时 snapshot，紧凑高效，恢复快，代价是两次 snapshot 间的数据可能丢失（配置 `save 900 1` 等触发条件）。AOF 记录每条写命令，`everysec` 模式下最多丢 1 秒数据，比 RDB 安全，但文件大、恢复慢。Redis 4.0 的混合持久化是最佳选择：AOF 重写时把 RDB 快照作为前缀（恢复时直接加载快照，非常快），后面追加增量 AOF（近实时），兼顾恢复速度和数据安全，生产推荐这个模式。持久化要注意 fork 的影响：BGSAVE/BGREWRITEAOF 时 fork 子进程，如果内存大（数十 GB），fork 本身可能需要数百毫秒（因为要复制页表），期间主进程可能被阻塞；COW 保证子进程看到 fork 时的内存快照，父进程继续接受写请求（写到 COW 复制的新页面），理论上对主进程影响极小，但实际大内存时要留意。另外持久化文件要定期备份到对象存储，本地磁盘故障时能从 S3/OSS 恢复。

---

### Q23: Redis Cluster 的架构是什么？Slot 分片是如何工作的？

**题目解析**：Redis Cluster 是生产环境高可用和水平扩展的标准方案，考察候选人对 Redis 架构的理解。

**题目讲解**：
**Redis Cluster 架构**：
- 16384 个 hash slot，均匀分配给各节点
- `CLUSTER KEYSLOT key` = `CRC16(key) % 16384`，确定 key 所属 slot
- 每个主节点管理一段连续的 slot（如 0-5460，5461-10922，10923-16383）
- 每个主节点有 N 个从节点（副本），主节点宕机从节点自动选主

**客户端路由**：
- 客户端可以连接任意节点
- 如果 key 不在当前节点，返回 `MOVED slot 目标节点ip:port`，客户端重定向
- 智能客户端（如 Jedis Cluster）缓存 slot-节点映射表，直接路由，减少重定向

**Hash Tags**：
- `{user:1}:profile` 和 `{user:1}:settings` 会映射到同一 slot（只用 `{...}` 里的内容计算 slot）
- 用于确保相关 key 在同一节点（支持 MSET/pipeline/Lua 跨 key 操作）

**集群扩缩容**：
- 新增节点：分配 slot 给新节点，迁移对应 slot 的数据（CLUSTER MIGRATE）
- 节点下线：把 slot 重新分配给其他节点

**Cluster 的局限**：
- 不支持跨 slot 的 Multi-key 操作（MSET/MGET 等，除非用 Hash Tag 在同一 slot）
- 不支持多数据库（只有 db0）
- 事务（MULTI/EXEC）只能操作同一 slot 的 key

**考察点**：
1. slot 和节点的映射机制（16384 个 slot）
2. MOVED vs ASK 重定向的区别（MOVED 持久迁移，ASK 临时迁移中）
3. Hash Tag 的使用场景和风险（hash tag 设计不当导致 slot 倾斜）

**示例答案**：
Redis Cluster 用 16384 个虚拟 slot 做数据分片，每个 key 通过 CRC16 哈希取模映射到特定 slot，每个主节点负责一段 slot 范围。客户端操作时，如果路由到的节点不负责该 slot，会收到 MOVED 指令（包含正确节点地址），客户端重定向；智能客户端会缓存 slot 映射表，大部分操作直接路由，只有 slot 迁移期间才重定向。Hash Tag 是个重要机制：key 名里的 `{...}` 内容用于计算 slot，让相关 key 落到同一 slot，从而支持原子的跨 key 操作（MSET/pipeline）。但 Hash Tag 要谨慎用：如果所有 key 都用同一个 Hash Tag，会造成严重 slot 倾斜（全部在一个节点，失去分片意义）。Cluster 的主要局限是不支持跨 slot 事务和 Multi-key 操作，设计数据结构时要考虑是否需要把相关 key 放在同一 slot。推荐用 Redis Cluster + 客户端 SDK（Lettuce/Jedis 的 Cluster 模式），能自动处理重定向和 slot 感知。

---

## 十、Python 进阶

---

### Q24: Python 的 asyncio 是如何工作的？async/await 和多线程有什么区别？

**题目解析**：asyncio 是 Python 高性能 I/O 的核心，考察候选人对 Python 异步编程的深度理解。

**题目讲解**：
**asyncio 的核心组件**：
- **Event Loop**：事件循环，单线程运行，调度协程和 I/O 回调
- **Coroutine（协程）**：`async def` 定义，`await` 暂停并交还控制权给 event loop
- **Task**：将协程包装为 Task（类似 Future），可以并发调度
- **Future**：未来的结果容器，协程/回调完成后设置结果

**执行流程**：
```
Event Loop 取出就绪协程
→ 执行到下一个 await（I/O 等待点）
→ 注册 I/O 事件回调（epoll）
→ 取出下一个就绪协程
→ I/O 完成，回调触发，恢复等待该 I/O 的协程
```

**async/await vs 多线程**：
| | asyncio | 多线程 |
|---|---|---|
| 并发方式 | 单线程协作式调度 | 多线程抢占式调度 |
| GIL | 不受 GIL 影响（单线程）| 受 GIL 限制 |
| 适合场景 | I/O 密集（网络/数据库）| I/O 密集（但没 asyncio 高效）|
| CPU 密集 | ❌（单线程，会阻塞）| ❌（GIL 限制并行）|
| 并发量 | 数千协程，内存小 | 数百线程，内存大 |
| 代码复杂性 | 全链路 async（传染性）| 相对简单 |

**常见陷阱**：
- `time.sleep()` 阻塞 event loop，应用 `await asyncio.sleep()`
- CPU 密集操作阻塞 event loop，用 `loop.run_in_executor()` 交给线程池
- `asyncio.gather()` 并发多个协程，任一抛出异常会取消其他（用 `return_exceptions=True`）

**考察点**：
1. Event Loop 的单线程本质（不真正并行 CPU）
2. `asyncio.gather` vs `asyncio.wait` 的区别
3. 同步代码和异步代码的互操作（asyncio.to_thread, run_in_executor）

**示例答案**：
asyncio 是单线程的协作式并发：Event Loop 维护一个就绪协程队列，遇到 await（I/O等待点）时协程主动让出控制权，Event Loop 切换到下一个就绪的协程，I/O 完成时（epoll 回调）唤醒等待该 I/O 的协程。相比多线程，asyncio 在 I/O 密集场景下能同时维护数千个并发"连接"，内存占用极小（协程很轻量），且没有线程切换开销和锁竞争。不需要加锁，因为单线程内协程调度是可控的（不会在任意点被打断）。主要限制是 CPU 密集操作会阻塞整个 Event Loop，解决办法是 `await loop.run_in_executor(None, cpu_bound_func)` 把 CPU 操作丢到线程池。实际项目里，aiohttp/httpx（异步 HTTP 客户端）、asyncpg（异步 PostgreSQL）、aiomysql 等库都是 asyncio 生态的，要发挥 asyncio 的优势需要整条链路都是 async。FastAPI 天然支持 asyncio，路由函数加 async def 即可享受并发。

---

