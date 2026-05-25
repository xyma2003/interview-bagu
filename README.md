# 面试八股题库

> 覆盖 **AI Agent / 前端 / 后端 / 算法** 四个方向，共 **332 道**高质量面试题
>
> 每道题独立一个 commit，格式统一，大厂面经真实整理

---

## 分支说明

| 分支 | 题目数 | 覆盖内容 |
|------|:------:|---------|
| [`ai-agent`](./ai-agent) | **93 题** | LLM基础 / Prompt Engineering / RAG / Agent框架(LangGraph/LangChain) / 多智能体 / 记忆系统 / 微调(LoRA/DPO) / 推理加速 / 生产部署 / 大厂专项(字节/MiniMax/小红书/阿里) / **场景设计题 10 道** |
| [`frontend`](./frontend) | **68 题** | HTML/CSS / JavaScript核心 / ES6+ / 浏览器原理 / HTTP/网络 / React(Fiber/Hooks) / Vue(响应式/Composition API) / 性能优化(Web Vitals) / 工程化(Webpack/Vite) / TypeScript / 微前端 / PWA / 大厂手写题 |
| [`backend`](./backend) | **57 题** | 操作系统 / 计算机网络 / MySQL(索引/事务/锁) / Redis(数据结构/持久化/集群) / Kafka / 系统设计(限流/熔断/分布式ID) / Python(asyncio/描述符) / Java(JVM/线程池/HashMap) / Elasticsearch / gRPC / K8s / CQRS |
| [`algorithm`](./algorithm) | **114 题** | 数组/双指针/滑动窗口 / 二分查找 / 栈/队列/单调栈 / 链表 / 树/图 / BFS/DFS / 回溯 / 动态规划 / 贪心 / 并查集 / 设计题(LRU/LFU) / 字符串/数学 / **大厂高频专项** / **AI/ML算法基础** |

---

## 题目格式

### 八股题（ai-agent / frontend / backend）

每道题包含六要素：

| 字段 | 说明 |
|------|------|
| **题目解析** | 背景与出题动机，为什么面试官要问这道题 |
| **题目讲解** | 深度知识点剖析，含原理/公式/代码示例 |
| **考察点** | 2-4 个核心考察维度，快速抓住重点 |
| **面试官更想听** | 拉分角度，区别"背诵答案"和"真正理解" |
| **示例答案** | 可直接参考的完整口头表达，200-400 字 |

### 算法题（algorithm）

每道题包含：题目描述 / 解题思路 / Python 代码实现 / 时空复杂度分析 / 考察点 / 大厂标注

---

## 快速开始

```bash
# 查看 AI Agent 题库
git clone https://github.com/xyma2003/interview-bagu.git
cd interview-bagu
git checkout ai-agent

# 查看前端题库
git checkout frontend

# 查看算法题库
git checkout algorithm
```

---

## 学习路线

`main` 分支包含 **[`LEARNING_GUIDE.md`](LEARNING_GUIDE.md)**，提供完整的备战路线：

- 📅 12 周备战时间表（每周具体任务）
- 🔢 算法刷题顺序（按专题分 Phase，含 LeetCode 题号）
- 📚 八股文学习路线（通用 / 前端 / AI Agent 三条路线）
- 🏗️ 系统设计答题框架 + 经典题目
- 🏢 按公司调整侧重（字节 / 腾讯 / 小红书 / 阿里 / MiniMax）

---

## 大厂专项覆盖

每道题标注高频出现公司，ai-agent 分支额外包含 10 道场景设计题：

> 「如果让你设计一个 XXX 的 Agent，你会怎么做？」
>
> 覆盖：代码审查 Agent / 企业知识库问答 / 数据分析(Text-to-SQL) / 商品推荐对话 / On-Call 值班助手 / 简历筛选 / 旅游规划 / AI 写作助手 / 财务分析 / 实时会议翻译

---

持续更新，欢迎 PR 补充。
