# 面试八股题库

> 覆盖 **AI Agent / 前端 / 后端 / 算法** 四个方向，共 **341 道**学习与面试练习题
>
> 个人整理的技术学习材料，主要包含：题目解析 · 知识讲解 · 考察点 · 表达建议 · 示例答案

## 从哪里开始

选一个方向进入目录，再按主题打开材料；每篇长文都能展开题目目录，直接跳到具体题目。

| 方向 | 学习目录 | 先读一题 |
|---|---|---|
| 前端 · 68 题 | [基础、框架与工程](frontend/README.md) | [事件循环 Q4](frontend/frontend.md#q4) |
| 后端 · 64 题 | [系统、存储与服务](backend/README.md) | [进程、线程与协程 Q1](backend/backend.md#q1) |
| AI Agent · 109 题 | [LLM、检索与 Agent](ai-agent/README.md) | [RAG 与微调 Q52](ai-agent/ai_agent_bigco.md#q52) |
| 算法 · 100 题 | [按题型学／按题目练](algorithm/README.md) | [两数之和 Q1](algorithm/algo_array.md#q1) |

**按计划学习**：[12 周路线](LEARNING_GUIDE.md) · **查方法和模板**：[算法手册](algorithm/algorithm-handbook.md) · **查出处**：[23 题核验记录](SOURCE_AUDIT.md) · **运行示例**：[验证入口](#example-checks)

## 来源与核验状态

截至 **2026-10-27**，已逐题核验 **23 / 341 题**；其余 **318 题待核验**。2026-10-15 首批核验四个方向各 5 题，本次新增 3 道写入即核验的 AI 训练与多模态题。[逐题记录与来源规范](SOURCE_AUDIT.md)列出了准确范围、改动和执行边界。

仓库尚未提供可追溯的逐题公司面经及频率统计，本轮范围内的公司／“高频”“必考”标签已撤下；其他题目中的旧标签仍待处理，不能作为公司出题或出现概率的依据。技术参考证明知识点来源，不证明某公司曾经考过。本轮核验也不代表全库正确、所有代码已运行或所有版本适用。

---

## 目录结构

<details>
<summary>展开完整文件列表（可点击入口见上方四个方向目录）</summary>

```
interview-bagu/
├── ai-agent/          # AI Agent 开发 + AI/ML基础 · 109 题
│   ├── ai_agent.md              基础篇（LLM/RAG/Agent框架/多智能体，30题）
│   ├── ai_agent_advanced.md     进阶篇（LoRA/量化/GraphRAG/生产部署，17题）
│   ├── ai_agent_bigco.md        专题练习（LLM底层/RAG/评测，15题）
│   ├── ai_agent_part3.md        结构化输出/并行工具/幻觉检测/记忆恢复（10题）
│   ├── ai_agent_part4.md        Prompt压缩/模型路由/流式/Guardrails（10题）
│   ├── ai_agent_scenarios.md  ★ 场景设计题（代码审查/知识库/推荐等，10题）
│   ├── ai_ml_basics.md        ★ AI/ML算法基础（梯度下降/损失函数/评估指标等，14题）
│   └── ai_training_multimodal.md  训练并行/SFT Packing/VLM视频（3题）
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
│   ├── backend_bigco.md         专题练习（短链/消息推送/Spring/CAS，10题）
│   ├── backend_part3.md         JWT/SQL注入/幂等性/ServiceMesh/K8s（9题）
│   ├── backend_part4.md         Go/链路追踪/连接池/Pydantic/CQRS（7题）
│   └── backend_concurrency_distributed.md  ★ 并发与分布式深度（竞态/无锁/内存模型/Raft/数据复制/向量时钟，7题）
│
├── algorithm/         # 算法（LeetCode 题型练习）· 100 题
│   ├── algo_array.md            数组/双指针/滑动窗口/二分/单调栈（25题）
│   ├── algo_tree_graph.md       树/图/BFS/DFS/回溯/DP经典（25题）
│   ├── algo_linked_design.md    链表/栈/设计题/字符串/KMP（20题）
│   ├── algo_more.md             并查集/矩阵/洗牌/数学（10题）
│   ├── algo_bigco.md            综合练习（投票/单调队列/DP等，20题）
│   └── algorithm-handbook.md   15 类题型的讲解、模板与例题（补充材料）
│
├── SOURCE_AUDIT.md    # 来源规范 + 23题逐题核验记录
├── LEARNING_GUIDE.md  # 12周计划 + 算法顺序 + 各方向题目链接
└── README.md
```

四个方向下的 `README.md` 是可点击的学习目录；手册与题库有重复题，未重复计入 341 题。

</details>

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

<a id="example-checks"></a>

## 示例验证

目前自动检查 **17 / 341 道题**：15 道算法题、前端 Q37 的四个 Promise 实现，以及 Q39 的取消与重试。测试直接提取文档代码运行，具体题目、输入范围与限制见[示例验证清单](EXAMPLE_CHECKS.md)。同一题的多个实现不重复计数。

在仓库根目录执行，无额外依赖：

```bash
# Python 3.12+：算法示例
python3 -m unittest discover -s tests -p 'test_algorithm*.py' -v

# Node.js 22+：Promise 示例
node --test tests/promise-*.test.cjs tests/fetch-retry.test.cjs
```

算法检查覆盖数组、字符串、树图、动态规划、链表和 LRU 的选定边界；Promise 与原生实现对照。CI 覆盖 Node.js 22 / 24、Python 3.12 / 3.13。简化 `myAllSettled` / `myRace` 只检查普通稠密数组，保留教学实现的输入与时序限制，不是完整 polyfill。其余 324 题及算法手册中的相似实现未自动获得测试覆盖，来源核验仍单独按 23/341 统计。

发现内容问题，可以提交[具体纠错](https://github.com/xyma2003/interview-bagu/issues/new?template=content-correction.yml)；修改方式见[贡献说明](CONTRIBUTING.md)。

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

[AI Agent 场景设计练习](ai-agent/ai_agent_scenarios.md#question-index)包含 10 道开放式场景设计题：

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

- **12 周备战时间表**：每周任务和具体学习入口。
- **算法刷题顺序**：按主题链接题库与手册，区分本库题号与 LeetCode 题号。
- **方向选择**：第 6–8 周按后端、前端或 AI Agent 选择一条路线。
- **系统设计与模拟练习**：从现有题目出发，练习需求澄清、方案取舍和复盘。

---

## 维护与参与

当前维护重点是纠正已有内容、补齐来源与输入边界，以及让文档里的代码可以直接验证。来源核验为 **23 / 341 题**，可执行示例检查为 **17 / 341 题**；两者有重叠，不能相加。其余内容、旧版公司与频率标签仍需逐项核对，教学代码也不等于完整生产实现。

**最近补齐：** [Q39 取消与重试](frontend/frontend_bigco.md#q39)在取消后立即结束请求或退避等待，不再继续重试；组合函数直接返回 `cancel()`。新增[原文执行回归](tests/fetch-retry.test.cjs)，运行时要求与边界见[验证范围](EXAMPLE_CHECKS.md#fetch-retry-checks)。Q37 的四个 Promise 实现继续保留各自回归，同一题不重复计数。

继续贡献时，可从未覆盖的题目中选一段实现，按[贡献说明](CONTRIBUTING.md)提供题号、有效输入范围、独立参照和可重复运行的检查。不要直接复制答案到测试中，也不要把未检查的实现算入覆盖范围。

发现错误可[提交具体纠错](https://github.com/xyma2003/interview-bagu/issues/new?template=content-correction.yml)。欢迎从一段错误解释、一个失效链接或一个缺失边界用例开始；请注明准确位置、依据及实际验证结果。
