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

