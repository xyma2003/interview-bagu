# 面试八股题库

> 覆盖 **AI Agent / 前端 / 后端 / 算法** 四个方向，共 **332 道**高质量面试题
>
> 大厂面经真实整理，每道题含：题目解析 · 深度讲解 · 考察点 · 面试官更想听 · 示例答案

---

## 目录结构

```
interview-bagu/
├── ai-agent/          # AI Agent 开发 · 93 题
│   ├── ai_agent.md              基础篇（LLM/RAG/Agent框架/多智能体）
│   ├── ai_agent_advanced.md     进阶篇（LoRA/量化/GraphRAG/生产部署）
│   ├── ai_agent_bigco.md        大厂专项（字节/MiniMax/小红书/阿里）
│   ├── ai_agent_part3.md        结构化输出/并行工具/流式/记忆管理
│   ├── ai_agent_part4.md        Prompt压缩/模型路由/幻觉检测/Guardrails
│   └── ai_agent_scenarios.md    ★ 场景设计题（代码审查/知识库/推荐等 10道）
│
├── frontend/          # 前端开发 · 68 题
│   ├── frontend.md              基础篇（HTML/CSS/JS/React/Vue/性能/网络）
│   ├── frontend_advanced.md     进阶篇（Generator/Proxy/安全/React18/微前端）
│   ├── frontend_bigco.md        大厂手写题（LRU/Promise/深拷贝/瀑布流）
│   ├── frontend_part3.md        CSS动画/状态管理/Workers/大文件上传
│   └── frontend_part4.md        Container Queries/i18n/TypeScript高级
│
├── backend/           # 后端开发 · 57 题
│   ├── backend.md               基础篇（OS/网络/MySQL/Redis/Kafka/系统设计）
│   ├── backend_advanced.md      进阶篇（间隙锁/分库分表/JVM/ES/gRPC）
│   ├── backend_bigco.md         大厂专项（短链/秒杀/IM系统/Spring/CAS）
│   ├── backend_part3.md         JWT/SQL注入/幂等性/ServiceMesh/K8s
│   └── backend_part4.md         Go/链路追踪/连接池/Pydantic/CQRS
│
├── algorithm/         # 算法 · 114 题
│   ├── algo_array.md            数组/双指针/滑动窗口/二分/单调栈（25题）
│   ├── algo_tree_graph.md       树/图/BFS/DFS/回溯/DP经典（25题）
│   ├── algo_linked_design.md    链表/栈/设计题/字符串/数学（20题）
│   ├── algo_more.md             并查集/矩阵/KMP/洗牌/数字（10题）
│   ├── algo_bigco.md            大厂高频专项（字节/腾讯/阿里，20题）
│   └── algo_ml_basics.md        ★ AI/ML算法基础（梯度下降/评估指标等，14题）
│
├── LEARNING_GUIDE.md  # 备战学习路线（12周计划 + 算法刷题顺序 + 大厂侧重）
└── README.md
```

---

## 快速开始

```bash
git clone https://github.com/xyma2003/interview-bagu.git
cd interview-bagu

# AI Agent 题库
cat ai-agent/ai_agent.md

# 算法题库（含 AI/ML 基础）
cat algorithm/algo_ml_basics.md

# 学习路线
cat LEARNING_GUIDE.md
```

---

## 题目格式

### 八股题（ai-agent / frontend / backend）

每道题统一包含六要素：

| 字段 | 说明 |
|------|------|
| **题目解析** | 背景与出题动机，为什么面试官要问这道题 |
| **题目讲解** | 深度知识点剖析，含原理 / 公式 / 代码示例 |
| **考察点** | 2-4 个核心考察维度，快速抓住重点 |
| **面试官更想听** | 拉分角度，区别"背诵答案"和"真正理解" |
| **示例答案** | 可直接参考的完整口头表达，200-400 字 |

> 大厂专项题目标注 `🏢 高频公司`，场景设计题含完整架构设计思路

### 算法题（algorithm）

每道题包含：题目 / 解题思路 / Python 代码实现 / 时空复杂度 / 考察点 / 大厂标注

> `algo_ml_basics.md` 为 AI 开发者定制，覆盖梯度下降、损失函数、评估指标、Embedding 等

---

## 大厂高频场景设计题

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
- 🏢 **按公司调整侧重**（字节 / 腾讯 / 小红书 / 阿里 / MiniMax）

---

持续更新，欢迎 PR 补充。
