# 面试八股题库

> 覆盖 **AI Agent / 前端 / 后端 / 算法** 四个方向，共 **338 道**学习与面试练习题
>
> 个人整理的技术学习材料，主要包含：题目解析 · 知识讲解 · 考察点 · 表达建议 · 示例答案

## 来源与核验状态

截至 **2026-10-15**，已逐题核验 **20 / 338 题**，四个方向各 5 题；其余 **318 题待核验**。本轮补充一手技术参考、适用版本或输入前提、核验日期，并修正发现的技术表述问题。[逐题记录与来源规范](SOURCE_AUDIT.md)列出了准确范围、改动和执行边界。

仓库尚未提供可追溯的逐题公司面经及频率统计，本轮范围内的公司／“高频”“必考”标签已撤下；其他题目和学习路线中的旧标签仍待处理，不能作为公司出题或出现概率的依据。技术参考证明知识点来源，不证明某公司曾经考过。本轮核验也不代表全库正确、所有代码已运行或所有版本适用。

---

## 目录结构

```
interview-bagu/
├── ai-agent/          # AI Agent 开发 + AI/ML基础 · 106 题
│   ├── ai_agent.md              基础篇（LLM/RAG/Agent框架/多智能体，30题）
│   ├── ai_agent_advanced.md     进阶篇（LoRA/量化/GraphRAG/生产部署，17题）
│   ├── ai_agent_bigco.md        专题练习（LLM底层/RAG/评测，15题）
│   ├── ai_agent_part3.md        结构化输出/并行工具/流式/记忆管理（10题）
│   ├── ai_agent_part4.md        Prompt压缩/模型路由/幻觉检测/Guardrails（10题）
│   ├── ai_agent_scenarios.md  ★ 场景设计题（代码审查/知识库/推荐等，10题）
│   └── ai_ml_basics.md        ★ AI/ML算法基础（梯度下降/损失函数/评估指标等，14题）
│
├── frontend/          # 前端开发 · 68 题
│   ├── frontend.md              基础篇（HTML/CSS/JS/React/Vue/性能/网络，24题）
│   ├── frontend_advanced.md     进阶篇（Generator/Proxy/安全/React18/微前端，12题）
│   ├── frontend_bigco.md        手写与工程专题（LRU/Promise/深拷贝/瀑布流，12题）
│   ├── frontend_part3.md        CSS动画/状态管理/Workers/大文件上传（12题）
│   └── frontend_part4.md        Container Queries/i18n/TypeScript高级（8题）
│
├── backend/           # 后端开发 · 64 题
│   ├── backend.md               基础篇（OS/网络/MySQL/Redis/Kafka/系统设计，18题）
│   ├── backend_advanced.md      进阶篇（间隙锁/分库分表/JVM/ES/gRPC，13题）
│   ├── backend_bigco.md         专题练习（短链/秒杀/IM系统/Spring/CAS，10题）
│   ├── backend_part3.md         JWT/SQL注入/幂等性/ServiceMesh/K8s（9题）
│   ├── backend_part4.md         Go/链路追踪/连接池/Pydantic/CQRS（7题）
│   └── backend_concurrency_distributed.md  ★ 并发与分布式深度（竞态/无锁/内存模型/Raft/数据复制/向量时钟，7题）
│
├── algorithm/         # 算法（LeetCode 题型练习）· 100 题
│   ├── algo_array.md            数组/双指针/滑动窗口/二分/单调栈（25题）
│   ├── algo_tree_graph.md       树/图/BFS/DFS/回溯/DP经典（25题）
│   ├── algo_linked_design.md    链表/栈/设计题/字符串/数学（20题）
│   ├── algo_more.md             并查集/矩阵/KMP/洗牌/数学（10题）
│   └── algo_bigco.md            综合练习（投票/单调队列/DP等，20题）
│
├── SOURCE_AUDIT.md    # 来源规范 + 本轮20题逐题核验记录
├── LEARNING_GUIDE.md  # 学习路线（12周计划 + 算法顺序；公司侧重待核验）
└── README.md
```

---

## 快速开始

```bash
git clone https://github.com/xyma2003/interview-bagu.git
cd interview-bagu

# AI Agent 题库（含 AI/ML 基础）
ls ai-agent/

# 算法题库（LeetCode 题型练习）
ls algorithm/

# 学习路线
cat LEARNING_GUIDE.md
```

---

## 示例验证

已为 [前端 Q37 的 `Promise.myAll` / `Promise.myAny` / 简化 `Promise.myRace`](frontend/frontend_bigco.md#review-frontend-q37) 添加可执行检查。测试直接运行题目正文中的代码，与对应原生实现对照。

在仓库根目录执行（Node.js 22+，无额外依赖）：

```bash
node --test tests/promise-*.test.cjs
```

`myAll` / `myAny` 覆盖空输入、稀疏数组、可迭代对象、thenable、完成顺序、错误顺序与异常传播；简化 `myRace` 只验证普通稠密数组的成功／拒绝竞争和异步回调，不是完整 polyfill。CI 在 Node.js 22 和 24 上运行这些检查；简化 `myAllSettled` 尚无独立自动回归。本轮算法样例的临时执行记录见来源核验表，不等同于已纳入 CI。

---

## 题目格式

### 八股题（ai-agent / frontend / backend）

主要采用以下五个内容字段；部分旧题仍待补齐。已核验题另附日期、适用范围、技术参考与面经来源状态。

| 字段 | 说明 |
|------|------|
| **题目解析** | 背景与出题动机，为什么面试官要问这道题 |
| **题目讲解** | 深度知识点剖析，含原理 / 公式 / 代码示例 |
| **考察点** | 2-4 个核心考察维度，快速抓住重点 |
| **面试官更想听** | 拉分角度，区别"背诵答案"和"真正理解" |
| **示例答案** | 可直接参考的完整口头表达，200-400 字 |

> 旧版 `🏢 高频公司` 标签没有完整证据，按待核验内容处理；`ai_agent_scenarios.md` 提供开放式架构设计练习。

### 算法题（algorithm/）

主要包含：题目描述 / 解题思路 / Python 代码实现 / 时空复杂度 / 考察点；题目出处与输入边界以已核验题的来源块为准。

### AI/ML 算法基础（ai-agent/ai_ml_basics.md）

定位：**AI 开发者需要知道的 ML 原理**，不是 LeetCode，是理解 LLM/RAG 背后机制的理论基础

覆盖：梯度下降/Adam/AdamW · 过拟合与正则化 · 交叉熵损失 · BatchNorm vs LayerNorm ·
Precision/Recall/AUC · Embedding/Word2Vec · 反向传播/梯度消失 · K-Means ·
决策树/随机森林 · 数据不平衡 · 迁移学习 · Reward Hacking · 温度缩放/模型校准

---

## 场景设计练习

`ai-agent/ai_agent_scenarios.md` 包含 10 道开放式场景设计题：

> 「如果让你设计一个 XXX 的 Agent，你会怎么做？」

| 场景 | 核心考察 |
|------|---------|
| 企业级代码审查 Agent | AST解析 / RAG规则库 / 误报控制 |
| 企业知识库问答 Agent | 父子分块 / 权限隔离 / 幻觉防御 |
| 数据分析 Agent (Text-to-SQL) | Schema检索 / SQL安全 / 自修复 |
| 多轮对话商品推荐 Agent | 偏好状态机 / ML+LLM分工 |
| On-Call 值班助手 Agent | 证据链设计 / 并发工具调用 |
| 自动化简历筛选 Agent | 匿名化 / 偏见防御 / HITL |
| 旅游规划 Agent | 多步骤依赖 / 预算管理 |
| AI 写作助手 Agent | 爆款RAG / 风格保留 |
| 智能财务分析 Agent | 代码算数防幻觉 / 双引擎风险识别 |
| 实时会议翻译 Agent | 流式Pipeline / 延迟预算 |

---

## 学习路线

[`LEARNING_GUIDE.md`](LEARNING_GUIDE.md) 提供完整的备战路线：

- 📅 **12 周备战时间表**（每周具体任务）
- 🔢 **算法刷题顺序**（Phase 1-4，含 LeetCode 题号）
- 📚 **八股文学习路线**（通用 / 前端 / AI Agent 三条线）
- 🏗️ **系统设计答题框架** + 经典题目列表
- 🏢 旧版公司侧重建议仍待来源核验，不作为公司出题规律

---

持续更新，欢迎 PR 补充。
