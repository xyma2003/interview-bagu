# 12 周学习路线

[返回首页](README.md) · [前端入口](frontend/README.md) · [后端入口](backend/README.md) · [AI Agent 入口](ai-agent/README.md) · [算法入口](algorithm/README.md)

适合已有编程基础、希望按计划整理知识和练习表达的读者。以下是本库建议的学习顺序，可按已有基础调整；不代表公司出题规律，也不保证在固定时间内掌握全部内容。

**先选一个岗位方向。第 6–8 周只走前端、后端、AI Agent 中的一条，第 9–10 周继续做该方向的设计练习。** 算法可贯穿复习，不需要同时学完三条技术路线。

本页 `Q` 是本库题号，算法题中的 `LC` 是 LeetCode 题号，二者不能互换。算法手册按主题组织，示例不另计入题库的 338 题。加入学习路线不表示已完成技术核验；当前仍为 [20 / 338 题已核验](SOURCE_AUDIT.md)，其余题目及旧公司标签应结合来源和版本继续核对。

## 页内目录

- [开始前：选路线与安排时间](#guide-start)
- [12 周节奏总览](#guide-schedule)
- [第 1–5 周：算法主线](#guide-algorithms)
- [第 6–8 周：按方向选一条](#guide-tracks)
- [第 9–10 周：设计与项目练习](#guide-projects)
- [第 11–12 周：模拟与复盘](#guide-mock)
- [学习记录与完成标准](#guide-progress)

<a id="guide-start"></a>

## 开始前：选路线与安排时间

先根据岗位描述和自己的项目选技术栈，再进入对应目录。下表是阅读建议，不是岗位或公司的题目权重统计。

| 你的目标 | 从哪里开始 | 如何取舍 |
|---|---|---|
| 浏览器、页面与应用交互 | [前端题目导航](frontend/README.md) → [前端三周路线](#guide-frontend) | React / Vue 优先选自己使用的框架；再补另一种的差异 |
| API、数据库、服务稳定性 | [后端题目导航](backend/README.md) → [后端三周路线](#guide-backend) | Python / Java / Go 先选一种；系统组件联系实际项目阅读 |
| LLM 应用、RAG、Agent 工程 | [AI Agent 题目导航](ai-agent/README.md) → [AI Agent 三周路线](#guide-ai) | 先完成检索、工具与评估链路，再按需要深入训练或推理优化 |
| 编程题与数据结构 | [算法题目导航](algorithm/README.md) + [算法手册](algorithm/algorithm-handbook.md#handbook-learning-path) | 按下方周计划练题；熟悉的主题用闭卷重写检查后跳过 |

可从每天 60–90 分钟、每周 5 天学习开始，另留 1 天复盘、1 天机动。每次只完成一组明确任务：先独立思考，再对照资料，最后留下代码、口述或设计记录。时间不足时减少可选扩展，不用追赶未完成的题量。

<a id="guide-schedule"></a>

## 12 周节奏总览

| 时间 | 主任务 | 进入下一阶段前留下什么 |
|---|---|---|
| 第 1–2 周 | [数组、指针、二分、栈与链表](#guide-week1) | 可运行的实现，输入边界和复杂度说明 |
| 第 3–5 周 | [树图、回溯与动态规划](#guide-week3) | 每类一份状态／不变量笔记，至少一次闭卷重写 |
| 第 6–8 周 | [选择一个技术方向](#guide-tracks)；每周复习 2–3 道旧算法题 | 每周一份知识图或小实验，记录版本和未解决问题 |
| 第 9–10 周 | [该方向的一道设计题](#guide-projects)；继续错题复习 | 一张架构图、一条可演示的最小流程、一次失败场景检查 |
| 第 11–12 周 | [模拟面试与复盘](#guide-mock) | 错题清单、修订后的回答和可核实的项目证据 |

<a id="guide-algorithms"></a>

## 第 1–5 周：算法主线

每周先完成主线，扩展题按时间选择。以下均链接到仓库现有内容；没有给未收录的题目编造本库题号。手册中的代码也需要自己运行，导航不代表全部示例已通过自动测试。

<a id="guide-week1"></a>

### 第 1 周：数组、哈希与双指针

**主线**：[Q1 两数之和](algorithm/algo_array.md#q1) → [Q67 字母异位词分组](algorithm/algo_linked_design.md#q67) → [Q3 盛最多水的容器](algorithm/algo_array.md#q3) → [Q2 三数之和](algorithm/algo_array.md#q2)。

- 先读：[手册 · 双指针](algorithm/algorithm-handbook.md#handbook-two-pointers)。
- 可选扩展：[Q12 除自身以外数组的乘积](algorithm/algo_array.md#q12)、[Q72 最长连续序列](algorithm/algo_bigco.md#q72)。
- 完成标准：说明指针为何能移动、何时需要去重；分别用重复值、负数和最小合法输入检查实现。

<a id="guide-week2"></a>

### 第 2 周：二分、窗口、栈与链表

**主线**：[Q19 二分查找](algorithm/algo_array.md#q19) → [Q21 查找元素的首尾位置](algorithm/algo_array.md#q21) → [Q5 最长无重复子串](algorithm/algo_array.md#q5) → [Q22 有效的括号](algorithm/algo_array.md#q22) → [Q51 反转链表](algorithm/algo_linked_design.md#q51) → [Q52 链表环检测](algorithm/algo_linked_design.md#q52)。

- 先读：[手册 · 二分法](algorithm/algorithm-handbook.md#handbook-binary-search)、[滑动窗口](algorithm/algorithm-handbook.md#handbook-sliding-window)。
- 可选扩展：[Q63 每日温度](algorithm/algo_linked_design.md#q63)，配合[手册 · 单调栈](algorithm/algorithm-handbook.md#handbook-monotonic-stack)。
- 完成标准：能写清区间开闭、窗口含义和链表指针变化；空输入是否允许，以题目约束为准。

<a id="guide-week3"></a>

### 第 3 周：树、图与连通性

**主线**：[Q26 二叉树最大深度](algorithm/algo_tree_graph.md#q26) → [Q27 层序遍历](algorithm/algo_tree_graph.md#q27) → [Q28 验证二叉搜索树](algorithm/algo_tree_graph.md#q28) → [Q32 岛屿数量](algorithm/algo_tree_graph.md#q32) → [Q34 课程表](algorithm/algo_tree_graph.md#q34)。

- 先读：[手册 · 树](algorithm/algorithm-handbook.md#handbook-trees)、[BFS / 拓扑排序](algorithm/algorithm-handbook.md#handbook-bfs)。
- 可选扩展：[Q91 省份数量](algorithm/algo_more.md#q91)，配合[手册 · 并查集](algorithm/algorithm-handbook.md#handbook-union-find)。
- 完成标准：明确递归返回值、访问标记和入度的含义；用单节点、分离的连通分量或有环依赖检查相应题目。

<a id="guide-week4"></a>

### 第 4 周：回溯与数据结构组合

**主线**：[Q36 全排列](algorithm/algo_tree_graph.md#q36) → [Q37 子集](algorithm/algo_tree_graph.md#q37) → [Q38 组合总和](algorithm/algo_tree_graph.md#q38) → [Q73 滑动窗口最大值](algorithm/algo_bigco.md#q73) → [Q25 数组中第 K 个最大元素](algorithm/algo_array.md#q25)。

- 先读：[手册 · 回溯](algorithm/algorithm-handbook.md#handbook-backtracking)、[单调队列](algorithm/algorithm-handbook.md#handbook-monotonic-queue)、[堆](algorithm/algorithm-handbook.md#handbook-heap)。
- 可选扩展：[Q58 LRU 缓存](algorithm/algo_linked_design.md#q58)、[Q42 Trie](algorithm/algo_tree_graph.md#q42)。
- 完成标准：说清选择、撤销和剪枝条件；说明队列／堆里保存什么，以及时间、辅助空间和输出空间各是多少。

<a id="guide-week5"></a>

### 第 5 周：动态规划

先用[手册 · 动态规划](algorithm/algorithm-handbook.md#handbook-dp)中的爬楼梯与打家劫舍示例练习状态定义；这两项是手册示例，不冒充本库独立 Q 题。

**主线**：[Q13 子数组最大和](algorithm/algo_array.md#q13) → [Q46 零钱兑换](algorithm/algo_tree_graph.md#q46) → [Q47 最长递增子序列](algorithm/algo_tree_graph.md#q47) → [Q45 最长公共子序列](algorithm/algo_tree_graph.md#q45) → [Q49 分割等和子集](algorithm/algo_tree_graph.md#q49)。

- 可选扩展：[Q48 编辑距离](algorithm/algo_tree_graph.md#q48)、[Q75 单词拆分](algorithm/algo_bigco.md#q75)。
- 完成标准：先写状态、转移、初值和遍历顺序，再写代码；选择一题解释空间优化为什么成立。
- 第 6 周起不再追加一整轮必修算法专题：每周从错误记录中选 2–3 题重做。需要专项补充时回到[算法导航](algorithm/README.md)。

<a id="guide-tracks"></a>

## 第 6–8 周：按方向选一条

只选择下列一条作为三周主线。每周先读对应题目，再把知识落到自己的小实验或项目记录；题目中的版本和适用前提要一并记录。跨方向内容按实际需要补充。

<a id="guide-backend"></a>

### 后端路线

[后端完整导航](backend/README.md)

| 周次 | 本周阅读顺序 | 实践与复盘 |
|---|---|---|
| 第 6 周：进程与数据库 | [Q1 进程、线程、协程](backend/backend.md#q1) → [Q3 IO 模型](backend/backend.md#q3) → [Q4 B+ 树索引](backend/backend.md#q4) → [Q5 事务与 MVCC](backend/backend.md#q5) → [Q50 EXPLAIN](backend/backend_part3.md#q50) | 选一个查询，记录表结构、数据库版本、执行计划和事务边界 |
| 第 7 周：缓存、消息与一致性 | [Q7 Redis 类型](backend/backend.md#q7) → [Q9 缓存问题](backend/backend.md#q9) → [Q10 Kafka 消息可靠性](backend/backend.md#q10) → [Q44 接口幂等性](backend/backend_part3.md#q44) → [Q16 CAP](backend/backend.md#q16) | 画出一次写请求的缓存与消息路径；分析重试、重复消息和局部故障 |
| 第 8 周：选择一门语言深入 | **Python**：[Q14 GIL](backend/backend.md#q14)、[Q24 asyncio](backend/backend_advanced.md#q24)、[Q56 异步数据库](backend/backend_part4.md#q56)；**Java**：[Q26 JVM](backend/backend_advanced.md#q26)、[Q27 线程池](backend/backend_advanced.md#q27)、[Q37 Spring](backend/backend_bigco.md#q37)；**Go**：[Q51 goroutine / channel](backend/backend_part4.md#q51)、[Q58 并发同步](backend/backend_concurrency_distributed.md#q58) | 只做所选语言的一组实验，观察超时、并发更新或资源释放；写清实际运行条件 |

<a id="guide-frontend"></a>

### 前端路线

[前端完整导航](frontend/README.md)。布局基础不熟时，先补 [Q1 BFC](frontend/frontend.md#q1) 和 [Q3 Flex / Grid](frontend/frontend.md#q3)。

| 周次 | 本周阅读顺序 | 实践与复盘 |
|---|---|---|
| 第 6 周：JavaScript 与异步 | [Q4 Event Loop](frontend/frontend.md#q4) → [Q5 原型链](frontend/frontend.md#q5) → [Q6 闭包](frontend/frontend.md#q6) → [Q8 Promise 错误处理](frontend/frontend.md#q8) → [Q37 Promise 组合](frontend/frontend_bigco.md#q37) | 独立实现一个异步组合示例并测失败路径；运行仓库已有 [Promise 回归](README.md#示例验证)，理解其覆盖范围 |
| 第 7 周：框架与页面加载 | **React**：[Q15 Hooks](frontend/frontend.md#q15)、[Q16 渲染性能](frontend/frontend.md#q16)；或 **Vue**：[Q17 响应式](frontend/frontend.md#q17)、[Q18 Composition API](frontend/frontend.md#q18)；再读 [Q21 Webpack / Vite](frontend/frontend.md#q21)、[Q12 浏览器缓存](frontend/frontend.md#q12) | 选自己使用的框架，做一个有加载、空数据、错误和重试状态的小页面 |
| 第 8 周：类型、质量与安全 | [Q23 type / interface](frontend/frontend.md#q23) → [Q22 泛型](frontend/frontend.md#q22) → [Q19 Web Vitals](frontend/frontend.md#q19) → [Q28 XSS / CSRF](frontend/frontend_advanced.md#q28) → [Q34 前端测试](frontend/frontend_advanced.md#q34) | 给上周页面补类型和关键交互测试；记录一次本地性能观察，并区分它与真实用户指标 |

<a id="guide-ai"></a>

### AI Agent 路线

[AI Agent 完整导航](ai-agent/README.md)。机器学习基础薄弱时，先补 [Q103 交叉熵](ai-agent/ai_ml_basics.md#q103)、[Q105 Precision / Recall / F1](ai-agent/ai_ml_basics.md#q105)、[Q106 Embedding](ai-agent/ai_ml_basics.md#q106)。

| 周次 | 本周阅读顺序 | 实践与复盘 |
|---|---|---|
| 第 6 周：模型与适配方式 | [Q48 Attention / Softmax](ai-agent/ai_agent_bigco.md#q48) → [Q3 KV Cache](ai-agent/ai_agent.md#q3) → [Q2 采样参数](ai-agent/ai_agent.md#q2) → [Q52 RAG 与微调](ai-agent/ai_agent_bigco.md#q52) → [Q31 LoRA](ai-agent/ai_agent_advanced.md#q31) | 画出请求到输出的过程，列明一个任务需要检索、改提示词还是训练，以及验证方法 |
| 第 7 周：RAG 与工具流程 | [Q10 RAG 流程](ai-agent/ai_agent.md#q10) → [Q37 Reranker](ai-agent/ai_agent_advanced.md#q37) → [Q14 Function Calling](ai-agent/ai_agent.md#q14) → [Q15 记忆系统](ai-agent/ai_agent.md#q15) → [Q24 人工审核](ai-agent/ai_agent.md#q24) | 用少量自备文档和固定工具响应串起一条流程；分别检查检索、状态和工具结果 |
| 第 8 周：评估与运行边界 | [Q20 Agent 测试](ai-agent/ai_agent.md#q20) → [Q27 可观测性](ai-agent/ai_agent.md#q27) → [Q70 错误恢复](ai-agent/ai_agent_part3.md#q70) → [Q76 对话历史管理](ai-agent/ai_agent_part4.md#q76) → [Q82 Guardrails](ai-agent/ai_agent_part4.md#q82) | 固定一组成功与失败案例，记录结果和失败原因；区分模拟响应的流程检查与实际模型调用效果 |

<a id="guide-projects"></a>

## 第 9–10 周：设计与项目练习

沿用所选方向，只选一道场景题作为两周主线。以下链接是本库练习材料，旧正文中的公司名称不构成面经证据。

| 方向 | 选一道题 | 可以交付的最小成果 |
|---|---|---|
| 后端 | [Q32 短链接系统](backend/backend_bigco.md#q32)；或 [Q35 消息推送系统](backend/backend_bigco.md#q35) | 一个核心 API、数据模型与重复请求／失败恢复检查 |
| 前端 | [Q53 分片上传与断点续传](frontend/frontend_part3.md#q53)；或 [Q56 动态高度虚拟列表](frontend/frontend_part3.md#q56) | 一个能演示的页面，包含加载、失败、重试和边界数据 |
| AI Agent | [Q84 企业知识库问答](ai-agent/ai_agent_scenarios.md#q84)；或 [Q87 Bug 排查 Agent](ai-agent/ai_agent_scenarios.md#q87) | 一条检索或工具流程、可追踪的中间结果与一组固定检查案例 |

| 周次 | 做什么 | 复盘时检查什么 |
|---|---|---|
| 第 9 周：约束与设计 | 明确用户流程、输入输出、数据规模、延迟目标；画组件图，说明状态流转与关键接口 | 哪些是需求，哪些是自己的假设？为什么选这些组件？替代方案有什么取舍？ |
| 第 10 周：实现与失败路径 | 实现最小流程；加入超时、重试、权限或错误恢复中与场景相关的一项；运行并记录结果 | 成功和失败是否都能演示？测过什么、没测什么？规模估算是否被误写成实测能力？ |

没有真实服务时可以先用本地数据或模拟依赖，但记录中应明确替代了什么；画图、设计和模拟检查各自是进展，不写成已部署或已完成真实效果验证。

<a id="guide-mock"></a>

## 第 11–12 周：模拟与复盘

| 周次 | 练习安排 | 交付记录 |
|---|---|---|
| 第 11 周：发现缺口 | 每次选一题旧算法、一题所选方向知识点、一个项目设计追问；先独立完成，再看答案或笔记 | 记录卡住的位置：概念、实现、边界、版本或表达；保留原始答案，避免只记“不会” |
| 第 12 周：验证改进 | 只针对缺口重做；用不同的合法输入验证算法；重新口述并演示第 9–10 周项目 | 对照前后结果，关闭已解决问题；未解决项写下一步，不用刷完所有路线作为完成条件 |

算法起点可从 [Q1 两数之和](algorithm/algo_array.md#q1)、[Q34 课程表](algorithm/algo_tree_graph.md#q34)、[Q46 零钱兑换](algorithm/algo_tree_graph.md#q46) 中选，再按错误记录调整。知识点从自己走过的 [后端](#guide-backend)、[前端](#guide-frontend) 或 [AI Agent](#guide-ai) 路线抽取，不要求同时回答三线。

<a id="guide-progress"></a>

## 学习记录与完成标准

每道题保留一行记录即可：

| 日期 | 题目链接 | 独立完成情况 | 边界／版本与证据 | 下次复习 |
|---|---|---|---|---|
| 自填 | 本库 Q 题或手册章节链接 | 未开始 / 看懂 / 独立实现或讲清 / 复习通过 | 运行命令、输入输出、来源页或录音；没运行就写未运行 | 日期或待解决问题 |

完成一项学习任务时检查：

- [ ] 能用自己的话说明问题、方案及适用条件。
- [ ] 代码运行过相关输入；概念题能举例并说明一个边界或反例。
- [ ] 技术结论注明版本或来源；不把题目旧标签当作公司出题事实。
- [ ] 设计选择能联系自己的项目，实际效果有对应记录。
- [ ] 下次不看答案重做时，能复现关键思路；做不到就回到错误记录继续修复。

需要更多题目时，从四方向导航补选同主题练习；遇到技术内容疑问，按[来源规范](SOURCE_AUDIT.md)记录并核对，学习进度与题库核验状态分别维护。
