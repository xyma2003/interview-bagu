# 题库来源规范与核验记录

[返回首页](README.md)

最近核验日期：**2026-10-27**。全库按 `### Q编号:` 统计为 **341 题**，共 **23 题已核验、318 题待核验**。2026-10-15 首批从四个方向各选 5 题；2026-10-27 新增 3 道写入即核验的 AI 训练与多模态题。选题不是随机抽样，不能据此推算全库正确率。

这里的“已核验”指阅读下表题目的一手技术参考、修正发现的问题、注明适用条件；不等于所有实现、运行环境或性能结论都经过实验。每题开头保存核验日期、适用范围、技术参考和面经来源状态。

## 来源怎么记录

| 声明类型 | 所需记录 | 缺少证据时如何处理 |
|---|---|---|
| 技术定义、算法或实现细节 | 官方规范、对应版本文档／源码，或原始论文；注明版本、适用条件、核验日期 | 标为待核验，不写成无条件结论；工程建议与文献结论分开 |
| “某公司面试问过” | 可追溯原始面经链接、发布日期、岗位与轮次；区分作者自述和公司官方材料 | 删除公司来源标签；技术文档或题型相似不能作为面经证据 |
| “高频”“必考” | 数据来源、统计时间、岗位范围、样本数、出现次数及去重方法 | 删除频率／必考标签；单篇面经不支持频率判断 |
| 性能、效果与项目收益 | 硬件／模型／数据／版本、对照方法及可复核结果 | 不写固定倍速、准确率收益或虚构个人经历；改为待评测建议 |

已核验的 23 题均未建立可追溯的公司面经或频率证据，因此不标注公司或出现频率。其余题目中的旧标签仍待处理，不能作为公司出题或出现概率的依据。技术参考仅用于技术核验。

新增或复核题目时，沿用以下字段；链接应直达支持该声明的规范章节、版本文档或原论文：

```text
核验日期：YYYY-MM-DD
适用范围：软件／论文版本，运行环境或输入前提
技术参考：来源标题 + 直接链接 + 必要章节
面经来源：原始链接及适用范围；没有则明确未提供，不标公司和频率
```

## 前端 · 5 题

点击题目可直接查看正文及一手来源。

| 题目 | 适用范围 | 本轮修正 |
|---|---|---|
| [Q1 · BFC](frontend/frontend.md#review-frontend-q1) | CSS 2.2 / Display 3 / Overflow 3；普通块布局 | 区分 BFC 与 Flex/Grid 格式化上下文；补 `overflow: clip` 例外及边距折叠条件 |
| [Q4 · Event Loop](frontend/frontend.md#review-frontend-q4) | WHATWG HTML Living Standard；浏览器 Window | 区分任务、微任务检查点与渲染机会；不承诺每轮都绘制或所有 `then` 都先于 timer |
| [Q19 · Core Web Vitals](frontend/frontend.md#review-frontend-q19) | 当前指标定义；现场第 75 百分位，按设备分组 | 补 INP 替代 FID、含等号的良好阈值及 CLS 会话窗口；纠正字体策略的绝对化结论 |
| [Q23 · interface 与 type](frontend/frontend.md#review-frontend-q23) | TypeScript 5.x、`strict: true`、常见对象类型 | 补结构类型、声明合并和联合类型在 `extends` / `implements` 中的边界 |
| [Q37 · Promise 组合](frontend/frontend_bigco.md#review-frontend-q37) | 原生 Promise、未改写内建；`any` 为 ES2021+ | 修复简化 `race` 的拒绝处理多一层 reaction 导致赢家改变；明确各示例的实现与测试范围 |

## 后端 · 5 题

| 题目 | 适用范围 | 本轮修正 |
|---|---|---|
| [Q1 · 进程、线程、协程](backend/backend.md#review-backend-q1) | CPython 3.13/3.14 asyncio；Go gc 运行时 | 区分 asyncio 协作调度与 goroutine 抢占；删除绕过 GIL 和无条件更快的表述 |
| [Q5 · 事务隔离与 MVCC](backend/backend.md#review-backend-q5) | MySQL 8.4 InnoDB | 明确 RR 首次一致性读、RC 每次一致性读、自身写入例外，以及锁定读与快照读的区别 |
| [Q7 · Redis 数据类型](backend/backend.md#review-backend-q7) | 内部编码固定为 Redis Open Source 7.2.4 | 更新 listpack 与 quicklist 等编码，补 Set 的 listpack；区分逻辑类型与内部表示 |
| [Q14 · Python GIL](backend/backend.md#review-backend-q14) | CPython 3.13 / 3.14 | 区分默认构建、可选 free-threaded 构建与实际运行时 GIL 状态；3.14 支持不等于默认关闭 |
| [Q16 · CAP](backend/backend.md#review-backend-q16) | 可能出现网络分区的分布式读写服务 | 明确线性一致性与请求完成性的定义；删除无条件“三选二”和按产品固定分 CP/AP |

## AI Agent · 8 题

| 题目 | 适用范围 | 本轮修正 |
|---|---|---|
| [Q48 · Attention 与 Softmax](ai-agent/ai_agent_bigco.md#review-ai-q48) | Transformer v7、Sparsemax 与 Linear Transformer 原论文 | 说明分数尺度与温度条件；纠正替代注意力的性质和无依据效果排序 |
| [Q49 · Speculative Decoding](ai-agent/ai_agent_bigco.md#review-ai-q49) | ICML 2023 / arXiv v2；Chen 等 v1 | 补接受概率、拒绝后的残差修正、全接受后的额外采样；区分同分布与逐 token 相同 |
| [Q51 · FlashAttention](ai-agent/ai_agent_bigco.md#review-ai-q51) | FA v1 论文 v2、FA2 论文 v1、FA3 论文 v2 | 区分二次算术量、中间存储与 HBM I/O；纠正 FA2/FA3 机制及无条件倍速 |
| [Q52 · RAG 与微调](ai-agent/ai_agent_bigco.md#review-ai-q52) | RAG v4、RAFT v2 与训练数据提取研究 | 说明二者可组合；删除固定数据量门槛、上线承诺和参数化即隐私安全的推断 |
| [Q54 · Self-Consistency](ai-agent/ai_agent_bigco.md#review-ai-q54) | 原论文 v4；可抽取和归一化的答案 | 区分众数、严格多数与 `pass@k`；限定概率算例，删除固定温度、次数及虚构收益 |
| [Q115 · 分布式训练并行选型](ai-agent/ai_training_multimodal.md#review-ai-q115) | ZeRO、Megatron-LM 原论文；PyTorch 2.14 FSDP1 与 Megatron Core 当前文档 | 显式列出混合精度显存假设；区分 FSDP 与 ZeRO-3、1F1B 与重计算、SP 与 CP；删除固定 TP 卡数和通信增幅结论 |
| [Q116 · SFT Sequence Packing](ai-agent/ai_training_multimodal.md#review-ai-q116) | Sequence Packing 原论文、FlashAttention varlen 与 TRL 当前文档；独立 causal LM 样本 | 说明后样本可读取前样本；区分 attention 边界与 position IDs；澄清 packing 不必然改变 loss 权重或带来固定倍速 |
| [Q117 · VLM 长视频理解](ai-agent/ai_training_multimodal.md#review-ai-q117) | Qwen2.5-VL 论文、官方博客与实现；抽帧式视频问答／检索 | 将帧数和分辨率纳入总 token 预算；限定 absolute-time mRoPE 为具体模型机制；补粗筛召回与精读分层评测 |

## 算法 · 5 题

以下实现使用 Python 3.9+ 的类型注解；本轮实际执行环境为 Python 3.12.13。

| 题目 | 输入前提 | 本轮修正 |
|---|---|---|
| [Q1 · 两数之和](algorithm/algo_array.md#review-algorithm-q1) | LC 1：恰有一个解，使用不同下标 | 明确哈希查找下的平均 O(N)，不当作最坏界；无解返回属于额外约定 |
| [Q4 · 接雨水](algorithm/algo_array.md#review-algorithm-q4) | LC 42：非空非负整数数组，柱宽为 1 | 左右最高包含当前位置；第一种实现依赖非空输入，双指针结论依赖移动不变量 |
| [Q8 · 两个有序数组的中位数](algorithm/algo_array.md#review-algorithm-q8) | LC 4：非递减数组，至少一个非空 | 写明前提与较短数组二分；复杂度口径覆盖其中一个数组为空 |
| [Q73 · 滑动窗口最大值](algorithm/algo_bigco.md#review-algorithm-q73) | LC 239：非空数组，1 ≤ k ≤ N | 区分 O(N) 时间、O(K) 辅助空间及输出空间；不隐含非法窗口输入支持 |
| [Q91 · 省份数量](algorithm/algo_more.md#review-algorithm-q91) | LC 547：非空对称 0/1 邻接矩阵，对角线为 1 | 保留矩阵扫描成本 O(N² + Eα(N))；统一题目出处与并查集摊还界来源 |

## 实际验证与限制

| 项目 | 已执行 | 不能由此推出 |
|---|---|---|
| Promise 示例自动回归 | Node.js 24.18.0；从题目原文提取代码，在隔离 VM 中与原生实现对照。既有 `all` / `any` 56 项及新增 `race` 4 项，共 60 项；运行命令见[首页](README.md#示例验证) | 简化 `race` 不是完整 polyfill；`allSettled` 只有临时样例和 smoke 检查，尚无独立自动回归 |
| I03 算法样例临时执行 | Python 3.12.13；从 5 题提取 6 段代码，35 组输入、44 次函数检查通过。包含重复值、负数、单元素、单个空数组、单调高度、窗口边界及不同连通分量等有效输入 | 这是当时的临时检查；后续 I05 已为另一组明确列出的 15 道算法题保存自动回归，范围见[示例验证清单](EXAMPLE_CHECKS.md)，二者不能混为同一批题 |
| 数值算例 | 重算单个 fp16 注意力矩阵 32 GiB，以及五次独立二分类严格多数概率 0.83692 | 不是模型推理、训练或 GPU 性能实测 |
| 文档结构 | 检查题数、23 个核验块、显式锚点及核验入口链接；2026-10-15 批次完成过浏览器验收，本次新增文档仅做本地结构检查 | 其余 318 题及全库全部链接尚未逐一核验；本次尚未做浏览器渲染验收 |

CI 的 `Example checks` 工作流在 Node.js 22 与 24 运行 Promise 测试，并在 Python 3.12 与 3.13 运行 I05 的算法检查；实际运行结果以对应提交的 Actions 记录为准。自动检查共覆盖 16 道题，与本页 23 道来源核验题部分重叠，不能相加。CI 通过不能替代技术来源核验。

本轮没有执行 TypeScript 项目编译、浏览器性能采样、Go／Python 并发实验、MySQL／Redis 服务实验、模型推理、训练或 GPU 性能实验。对应内容是规范、版本文档或论文层面的核验。

## 后续维护

- 继续按小批次核验其余 318 题；新增题优先采用“写入即核验”，每批维护准确分母与题目清单。
- 版本变化时重新核验受影响题目，并保留具体版本，避免把历史实现写成永远成立。
- 学习入口见[四方向导航](README.md#从哪里开始)，可复现示例见[验证清单](EXAMPLE_CHECKS.md)，具体问题按[贡献与纠错说明](CONTRIBUTING.md)提供依据。
