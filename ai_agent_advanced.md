# AI Agent 面试八股 · 进阶篇

> 接续基础篇，涵盖：微调/LoRA、量化、向量搜索进阶、多模态、GraphRAG、Agent部署、具体框架细节、安全红队

---

## 十一、模型微调与 PEFT

### Q31: 什么是 LoRA？它如何在不更新全部参数的情况下微调大模型？

**题目解析**：LoRA 是目前最主流的参数高效微调（PEFT）方法，AI Agent 岗位涉及模型定制时必考。

**题目讲解**：
**LoRA（Low-Rank Adaptation）核心思想**：
预训练模型的权重矩阵 W（d×k）在微调时的变化量 ΔW 具有低秩特性。LoRA 不直接更新 W，而是将 ΔW 分解为两个低秩矩阵的乘积：
```
ΔW = BA,  其中 B ∈ ℝ^(d×r), A ∈ ℝ^(r×k), r << min(d,k)
前向计算: h = Wx + BAx = (W + BA)x
```
- 冻结原始权重 W，只训练 A 和 B（初始化：A 随机，B 为零，保证初始 ΔW=0）
- 参数量：d×k（原始）→ r×(d+k)（LoRA），r=8 时参数减少 100 倍以上

**训练优势**：
- 显存占用大幅降低（只需存 A、B 的梯度和优化器状态）
- 推理时可以把 BA 合并回 W，无额外推理延迟
- 可以针对不同任务训练多个 LoRA adapter，按需切换（不改变基础模型）

**超参数**：
- `r`（秩）：越大表达能力越强，但参数越多；通常 4-64
- `alpha`（缩放）：ΔW 的缩放系数 = alpha/r，通常 alpha=2r
- 目标模块：通常对 Q、V 注意力矩阵做 LoRA，有时也对全连接层

**进阶变体**：
- **QLoRA**：量化基础模型（4-bit NF4）+ LoRA，7B 模型可在消费级 GPU（24GB）微调
- **DoRA**：将权重分解为量级和方向分别训练，效果更接近全量微调

**考察点**：
1. LoRA 的低秩分解原理
2. 推理时的 LoRA 合并（无额外开销）
3. QLoRA 相比 LoRA 的内存进一步节省

**面试官更想听**：
能说出在实际项目中如何选择微调 vs 提示词工程（通用任务先用提示词，需要特定风格/领域知识且提示词达不到再考虑微调），以及微调数据的质量要求（100条高质量数据 > 10000条低质量数据）。

**示例答案**：
LoRA 通过将权重更新矩阵 ΔW 分解为两个低秩矩阵 B×A 的乘积，大幅减少可训练参数。原始 7B 模型的权重矩阵可能有数亿参数，LoRA 只训练几百万参数的 A、B 矩阵，显存占用从 160GB（Adam 全参）降到 10GB 量级。QLoRA 进一步把基础模型量化到 4-bit（NF4 格式，精度损失极小），在此之上加 LoRA，24GB 显存就能微调 7B 模型。推理时 LoRA 可以合并（W_new = W + BA），完全没有额外推理延迟。实践中，LoRA adapter 还支持热切换——同一基础模型，加载不同 adapter 可以得到不同领域的专家模型，服务器只需存一份基础权重。

---

### Q32: 模型量化有哪几种方式？INT8、INT4 量化的原理和代价是什么？

**题目解析**：量化是 LLM 生产部署降本的关键技术，了解其原理体现候选人对推理工程的理解。

**题目讲解**：
**量化目的**：将模型权重从 FP32/BF16 转为低精度（INT8/INT4），减少显存和计算量。

**量化类型**：
1. **训练后量化（PTQ）**：训练完成后直接量化，无需重新训练
   - 权重量化：只量化权重，激活值保持 FP16
   - 动态量化：推理时动态量化激活值
   - 静态量化：用校准数据预计算激活值量化参数
2. **量化感知训练（QAT）**：训练过程中模拟量化，精度损失更小，但需要重新训练

**INT8 量化原理（absmax 方法）**：
```
scale = max(|W|) / 127
W_int8 = round(W / scale)
推理时: W_fp = W_int8 * scale
```

**INT4 量化（GPTQ/AWQ/GGUF）**：
- **GPTQ**：逐层量化，用最小化重构误差的优化方法，精度较好
- **AWQ（Activation-aware Weight Quantization）**：识别对激活值影响大的权重通道，保留高精度
- **GGUF（llama.cpp 格式）**：支持多种 bit-width（2-8 bit），在 CPU 上高效运行

**精度与速度权衡**：
- FP16：基线（精度100%）
- INT8：显存减半，精度损失<1%，推理速度提升约 30%
- INT4：显存减至 1/4，精度损失约 1-3%，部分任务可接受

**考察点**：
1. PTQ vs QAT 的选择（PTQ 快但精度低，QAT 慢但精度高）
2. GGUF 格式在本地部署的意义
3. 量化对长尾任务（代码/数学）的影响更大

**示例答案**：
量化把模型权重从 FP16 压缩到 INT8 或 INT4，核心是建立浮点值到整数的映射关系（scale 和 zero_point）。INT8 量化基本无感知损失，推理速度快 1.3x 左右，是生产环境最常用的量化级别——vLLM 的 AWQ INT4 推理在 7B 模型上可以用单张 RTX 4090 跑，成本大幅降低。对于本地运行，GGUF 格式（llama.cpp）支持在 CPU 上推理量化模型，让没有 GPU 的开发机也能跑 7B 模型。代价是精度有损，特别是对逻辑推理、数学、代码这类需要精确计算的任务影响更大，而对通用对话、文本总结影响较小。工程选择：追求最低成本且任务较简单用 INT4/AWQ；追求精度保证用 INT8；需要在 CPU 运行用 GGUF Q4_K_M 格式（K-means 量化，精度比简单线性量化好）。

---

### Q33: 什么是 Fine-tuning 数据集的构建原则？如何避免灾难性遗忘？

**题目解析**：微调数据质量直接决定效果，考察候选人对数据工程的认知。

**题目讲解**：
**数据集构建原则**：
1. **质量 > 数量**：Stanford Alpaca 用 52K 条数据，精选版 Alpaca-cleaned 删掉大量低质样本效果反而更好
2. **多样性**：覆盖目标任务的各种输入模式、长度、难度分布
3. **准确性**：标注错误比数据少更有害，宁可数据少也要准确
4. **格式一致性**：instruction/input/output 格式要统一，与推理时保持一致
5. **负例**：拒绝回答的样本（"这个问题我无法回答"）防止模型越权

**数据来源**：
- 人工标注（最贵，质量最高）
- Self-instruct（让 GPT-4 生成 instruction 数据）
- 从已有对话日志筛选
- Evol-instruct（指令难度递进演化）

**灾难性遗忘（Catastrophic Forgetting）**：
微调后模型在新任务表现好，但原有通用能力（数学/代码等）退化。

**解决方案**：
1. **数据混合**：微调数据中加入 10-30% 的通用指令数据，保持原有能力
2. **低学习率 + 少 epoch**：避免过度更新，通常 1-3 epoch，lr=1e-4 到 2e-5
3. **LoRA 而非全参**：冻结大部分权重，减少遗忘
4. **Replay Buffer（持续学习）**：缓存部分旧任务数据，每次更新时混合训练
5. **EWC（Elastic Weight Consolidation）**：对重要参数加大正则化惩罚

**考察点**：
1. Self-instruct 的数据生成流程
2. 灾难性遗忘的本质原因（权重被覆写）
3. 数据量与效果的关系（边际收益递减）

**示例答案**：
微调数据的核心原则是"少而精"：500 条高质量人工标注数据往往比 5000 条 GPT-4 生成的样本更有效。格式一致性非常重要——如果训练时用 system/human/assistant 格式，推理时也必须保持，否则模型会困惑。防止灾难性遗忘的最实用手段是数据混合：在领域数据里掺 20% 的通用对话数据，让模型不会"忘记"基础能力。学习率和 epoch 数要保守，我通常用 cosine 调度，峰值 lr=2e-4，3 个 epoch，在验证集上监控通用能力指标。LoRA 本身由于只改变少量参数，天然就有一定的抗遗忘性。评估时要同时跑目标任务和通用 benchmark（MMLU/HumanEval），确保微调增益不以基础能力退化为代价。

---

### Q34: LLM 的 Context Window 是如何扩展的？长上下文的技术挑战是什么？

**题目解析**：长上下文是 LLM 的核心发展方向，考察候选人对技术前沿的了解。

**题目讲解**：
**Position Encoding 的限制**：
原始 Transformer 使用绝对位置编码，训练时最长序列长度固定，推理时不能超过该长度。

**长上下文扩展方案**：

1. **RoPE（Rotary Position Embedding）**：
   - 相对位置编码，通过旋转矩阵编码位置，更自然地泛化到未见过的长度
   - 基础：Claude/LLaMA/Qwen 等都采用 RoPE
   - 扩展：调整 RoPE 的 base（频率）可以在不重新训练的情况下扩展上下文

2. **YaRN（Yet another RoPE extensioN）**：
   - 通过修改 RoPE 的频率缩放，配合少量长上下文数据微调，达到更好的长上下文性能

3. **FlashAttention**：
   - 解决计算效率问题，把标准 Attention 的 O(N²) 内存降到 O(N)（IO-aware 算法，利用 GPU 显存层级）
   - FlashAttention-2/3 在长序列上速度提升 2-4 倍

**长上下文的技术挑战**：
1. **KV Cache 显存**：128K token 上下文，KV Cache 需要 GB 级显存
2. **Lost in the Middle**：研究表明 LLM 对文档中间部分的信息注意力显著下降
3. **推理延迟**：Attention 计算 O(N²)，序列翻倍延迟翻 4 倍
4. **训练数据**：足够长的高质量训练文档难以获取

**考察点**：
1. RoPE 相比绝对位置编码的优势
2. FlashAttention 的内存优化原理（分块计算避免显存 O(N²)）
3. Lost in the Middle 现象对 RAG 设计的影响

**示例答案**：
上下文长度的核心限制来自位置编码和 KV Cache 显存。RoPE 通过旋转矩阵编码相对位置，相比绝对位置编码更容易泛化到更长序列；通过调整 RoPE 的旋转频率 base，可以将 4K context 的模型扩展到 32K 甚至更长，配合少量长文本微调效果很好。FlashAttention 解决的是计算效率：标准 Attention 会产生 N×N 的中间矩阵，128K 序列需要 64GB 就放不下，FlashAttention 用分块计算（tiling）把中间结果保留在更快的 SRAM 里，显存占用降到线性，速度快 2-4 倍。即使有了 200K 上下文，Lost in the Middle 仍然是实际问题——信息在文档中间时模型召回率显著低于开头和结尾，所以 RAG 做多文档上下文注入时，最重要的文档应该放在 context 开头或结尾。KV Cache 是另一个瓶颈，128K token 的 KV Cache 在 70B 模型上需要约 10GB 显存，限制了并发能力。

---

### Q35: 如何评估一个 LLM 的能力？常用的 Benchmark 有哪些？

**题目解析**：评估 LLM 能力是模型选型和质量保证的基础，考察候选人的工程化思维。

**题目讲解**：
**通用能力 Benchmark**：
- **MMLU（Massive Multitask Language Understanding）**：57个学科的多选题，考察世界知识
- **HumanEval / MBPP**：Python 代码生成，按通过率（pass@k）评估
- **GSM8K / MATH**：数学推理（小学到竞赛级别）
- **BIG-Bench**：多任务困难问题集
- **HELM（Holistic Evaluation）**：综合评估框架

**中文 Benchmark**：
- **C-Eval**：中文综合学科知识评测
- **CMMLU**：中文多学科理解
- **AlignBench**：中文对齐能力评测

**Agent 专项 Benchmark**：
- **GAIA**：现实世界 AI 助手任务（需要工具使用、多步推理）
- **SWE-bench**：解决真实 GitHub Issue（软件工程能力）
- **WebArena / OSWorld**：Web/桌面操作任务
- **AgentBench**：多环境 Agent 综合评测

**业务场景评估**：
- 领域专项数据集（自建）
- LLM-as-Judge：用强模型（GPT-4/Claude）评分
- 人工评估（A/B 对比盲测，最可靠但成本高）
- ELO 排名（多模型对比，如 LMSYS Chatbot Arena）

**评估陷阱**：
- Benchmark 污染：训练数据包含测试集答案（数据泄漏）
- 单一指标误导：某项高不等于全面好
- 分布偏移：标准 benchmark 不代表你的业务场景

**考察点**：
1. 不同 benchmark 侧重不同能力（知识/推理/代码/Agent）
2. 自定义业务评测集的重要性
3. Benchmark 污染问题的识别

**示例答案**：
选模型不能只看 MMLU，要根据实际任务选 benchmark。代码生成看 HumanEval pass@1，数学推理看 GSM8K，Agent 能力看 GAIA 或 SWE-bench。但标准 benchmark 和真实业务场景往往有分布偏差，我的做法是：先用标准 benchmark 做初筛，缩小候选模型范围，再在自建的业务数据集上精细评估——把真实用户问题抽样，用 LLM-as-Judge 对各候选模型输出打分，最后对 Top 2-3 个模型做人工盲测（不知道哪个模型输出哪个答案）。Benchmark 污染是个真实问题，新 benchmark 发布 6 个月后就会被训练数据收录，排名迅速飙升但不代表真实提升。我们内部维护一批从未公开的测试用例，专门用于不受污染的内部评测。

---

## 十二、向量检索进阶

---

### Q36: Embedding 模型的选择标准是什么？如何针对中文优化？

**题目解析**：Embedding 模型选择直接影响 RAG 的检索质量，是工程实践中的核心决策。

**题目讲解**：
**Embedding 模型评估维度**：
1. **检索质量**：MTEB（Massive Text Embedding Benchmark）榜单，涵盖检索、分类、聚类等任务
2. **向量维度**：越高表达能力越强，但存储和计算开销更大（text-embedding-3-large: 3072维 vs small: 1536维）
3. **最大 token 长度**：影响能处理的最长文本（m3e-base: 512，bge-large-zh: 512，OpenAI ada-002: 8191）
4. **语言支持**：多语言模型 vs 单语言专门模型
5. **推理速度与成本**：API 调用 vs 本地部署

**中文优化 Embedding 选择**：
- **BGE 系列（BAAI）**：目前中文综合最强，bge-large-zh-v1.5（1024维，512 token）
- **M3E**：较早的中文开源模型，轻量但效果次于 BGE
- **bge-m3**：多语言版，中英混合文档的最佳选择（支持稀疏+密集+多向量三模式）
- **Jina Embeddings v3**：多语言，支持 8192 token 长文本
- **OpenAI text-embedding-3-small**：性价比高，中文也不差

**Fine-tune Embedding**：
- 用业务语料（正负样本对）微调 embedding，提升领域内检索效果
- 工具：sentence-transformers、FlagEmbedding（BGE 的训练框架）
- 需要构建三元组：`(query, positive_doc, negative_doc)`

**考察点**：
1. MTEB 榜单的各 task 含义
2. 长文本 embedding 的截断策略
3. 稀疏 + 密集的混合检索（bge-m3）

**示例答案**：
选 Embedding 模型要先明确场景：纯中文用 BGE-large-zh-v1.5（MTEB 中文检索榜单长期前列）；中英混合或多语言用 bge-m3（支持 100+ 语言，还能同时输出 BM25 风格的稀疏向量，一个模型实现混合检索）；成本敏感且无法本地部署用 OpenAI text-embedding-3-small（768 维，效果不错，价格低廉）。中文 Embedding 的一个坑是 512 token 限制，很多文档段落超过 512 个 token 时需要截断，可能丢失重要信息，选模型时要看 max_sequence_length。对于业务领域专词很多的场景（金融/医疗/法律），用业务语料微调 embedding 能显著提升检索召回率——构建查询-文档正样本对（人工或用 LLM 生成），加上难负例挖掘，在 sentence-transformers 框架上微调 1-3 个 epoch，检索 Recall@5 通常能提升 10-20%。

---

### Q37: 什么是 Reranker？Cross-Encoder 和 Bi-Encoder 有什么区别？

**题目解析**：Reranker 是 RAG 精排的关键，理解 Cross-Encoder vs Bi-Encoder 体现检索架构的深度认知。

**题目讲解**：
**检索两阶段架构**：
- **召回（Recall）**：Bi-Encoder（向量检索），从百万文档中快速找 Top-50，O(1)
- **精排（Rerank）**：Cross-Encoder，对 Top-50 精细评分，选 Top-5 输入 LLM

**Bi-Encoder**：
- Query 和 Document 分别 encode，得到独立向量，用相似度评分
- 优点：Document 向量可以预计算缓存，检索速度极快
- 缺点：Query 和 Document 交互在 embedding 层之前就截断，交互不充分

**Cross-Encoder**：
- Query 和 Document 拼接，一起输入 BERT-like 模型，输出相关性分数
- 优点：Query-Document 充分交互，每一层都有 cross-attention，准确率更高
- 缺点：每个 query-doc 对都需要单独推理，不能预计算，延迟高（O(N) 其中 N 为候选集大小）

**常用 Reranker 模型**：
- **bge-reranker-large**（BAAI）：中文效果佳
- **Cohere Rerank**：API 服务，质量高，支持中英文
- **ms-marco-MiniLM**：轻量，速度快

**设计模式**：
```
用户 query → Bi-Encoder 检索 Top-50 → Cross-Encoder Rerank → Top-5 → LLM
```

**考察点**：
1. 为什么不直接用 Cross-Encoder 做召回（计算量 O(N×M)，N=query, M=文档数）
2. Reranker 对哪类查询提升最大（语义模糊、多意图查询）
3. 如何评估 Reranker 的效果（NDCG、MRR）

**示例答案**：
Bi-Encoder 和 Cross-Encoder 是互补的：Bi-Encoder 将 query 和 document 独立编码，document 向量可以预计算，检索时只需一次 query 编码加向量搜索，毫秒级完成；缺点是 query 和 document 没有深度交互，对模糊语义的召回率有限。Cross-Encoder 把 query+document 拼接后一起过模型，每层都有全注意力交互，打分精度高很多，但每个 pair 都要单独推理，Top-50 候选就要跑 50 次推理，速度是瓶颈。两阶段管道把二者结合：Bi-Encoder 快速召回，Cross-Encoder 精排，是当前 RAG 系统的标准架构。Reranker 对多义词和语义相近但意图不同的查询效果提升最显著——比如"苹果公司" vs "苹果水果"，Bi-Encoder 可能混淆，但 Cross-Encoder 能结合完整上下文精准判断。

---

