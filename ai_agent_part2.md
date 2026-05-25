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

### Q38: 什么是 GraphRAG？它解决了传统向量 RAG 的什么问题？

**题目解析**：GraphRAG 是 2024 年微软提出的新型 RAG 架构，考察候选人对前沿技术的跟进。

**题目讲解**：
**传统向量 RAG 的问题**：
- 只能找"局部语义相似"的片段，无法理解文档间的关系（谁和谁有关联）
- 对"全局主题"类问题（"这份报告的整体结论是什么？"）无能为力，找到的片段是局部的
- 多跳推理（A→B→C）无法通过单次向量检索完成

**GraphRAG 的思路**：
1. **知识图谱构建**：用 LLM 从文档中抽取实体（Entity）和关系（Relationship），构建知识图谱
2. **社区检测**：对知识图谱做社区发现（如 Leiden 算法），把相关实体聚合成"社区"
3. **社区摘要**：为每个社区生成摘要，用于全局查询
4. **查询时**：
   - Local Search：用向量找最相关的实体/关系，适合具体问题
   - Global Search：跨社区摘要聚合，适合全局/宏观问题

**优势**：
- 全局查询质量显著提升
- 可以追踪关系链（A 的 CEO B 和 C 公司有什么关联？）
- 知识图谱可视化，可解释性强

**代价**：
- 索引构建成本极高（大量 LLM 调用提取实体关系）
- 复杂度高，不适合简单 Q&A 场景

**考察点**：
1. GraphRAG vs 传统 RAG 的适用场景对比
2. 社区摘要的生成机制
3. LightRAG 等简化版本

**示例答案**：
传统向量 RAG 把文档切成 chunk 做向量检索，擅长找"语义相似的局部片段"，但对"这批文档的整体主题是什么"、"文档 A 和文档 B 里的人物有什么关联"这类全局或关系型问题完全无力。GraphRAG 在索引阶段用 LLM 从文档里抽取实体和关系（"张三 CEO 了 A 公司"），构建知识图谱，再用社区发现算法把相关实体聚合，为每个社区生成摘要。查询时，全局问题（"这些文档的主要趋势是什么？"）聚合所有社区摘要回答，局部问题仍用向量检索。代价是索引构建非常贵——一份 100 页 PDF 需要几百次 LLM 调用抽取实体，适合知识库较稳定、对理解深度要求高的场景（企业知识图谱、科研文献分析）。对于普通 Q&A 场景，传统 RAG + Reranker 成本效益更高。

---

## 十三、Agent 部署与工程化

### Q39: 如何在生产环境部署 LLM Agent 服务？关键的工程考量有哪些？

**题目解析**：生产部署是 AI Agent 从实验到落地的关键一步，考察候选人的工程成熟度。

**题目讲解**：
**模型服务层**：
- **vLLM**：PagedAttention 管理 KV Cache，高吞吐（throughput 比 HuggingFace 高 20x+），OpenAI 兼容 API
- **TGI（Text Generation Inference）**：HuggingFace 出品，生产就绪，支持量化
- **Ollama**：本地部署，支持多种模型格式（GGUF），适合开发和小规模部署
- **API 代理**：有多个 Provider 时，用 LiteLLM 统一接口，动态路由

**Agent 服务层**：
- 无状态 vs 有状态：Agent 服务设计为无状态（状态存 Redis/DB），利于水平扩展
- 流式输出：WebSocket 或 SSE 转发流式 token
- 超时控制：LLM 调用可能很慢，需要设置客户端超时和服务端最大 token 限制
- 并发控制：每个 Agent session 可能占用大量 KV Cache，需要控制并发数

**可观测性**：
- 每次 LLM 调用记录 trace（LangSmith/Langfuse）
- 延迟分布（P50/P95/P99）
- Token 消耗和成本
- 工具调用成功率

**容错与降级**：
- 主备模型（Claude 主，GPT-4 备）
- 熔断器（连续失败超阈值暂停调用）
- 限流（按用户/接口的 TPM/RPM）

**安全**：
- API Key 轮换（不要把 API Key 硬编码）
- 输入长度限制（防止 token 轰炸）
- 输出过滤（敏感词/PII 检测）
- 访问控制（哪些用户可以用哪些模型）

**考察点**：
1. vLLM PagedAttention 的高吞吐原理
2. 无状态 Agent 设计的水平扩展优势
3. 多模型路由策略

**示例答案**：
生产部署 LLM Agent 要分三层考虑。模型服务层用 vLLM 部署开源模型（PagedAttention 让 KV Cache 碎片化使用，吞吐量比 naive serving 高很多），API 模型用 LiteLLM 做统一代理，一套代码切换 Claude/GPT/Gemini，并实现负载均衡和 failover。Agent 服务层设计为无状态，会话状态存 Redis（key: thread_id, value: 序列化 state），这样服务可以水平扩展，任意实例都能处理任意 session。流式输出通过 SSE 转发，后端用异步框架（FastAPI + asyncio）同时服务多个 stream。超时是个关键细节：LLM 有时会很慢，需要给用户端设置合理超时（如 60s），并在超时时返回友好提示而非直接断连。监控上，每次 LLM 调用都打 trace 到 Langfuse（自托管，数据不出境），日报中看 P95 延迟和 token 消耗趋势，发现异常及时告警。

---

### Q40: 什么是 Agent 的"工具选择问题"？如何设计 Tool Registry 让 Agent 准确选择工具？

**题目解析**：工具选择准确性是多工具 Agent 的核心工程挑战，面试官考察候选人的实际工程能力。

**题目讲解**：
**问题描述**：
当 Agent 有大量工具（10+）时，LLM 在单次上下文里处理所有工具描述，容易出现：
- 选错工具（功能相似的工具混淆）
- 工具调用参数错误
- 应该调用工具时没调用（判断不需要）
- 不应该调用时调用了（过度工具使用）

**解决方案**：

1. **工具描述优化**：
   - 名称语义明确（`search_product_by_name` 而非 `search`）
   - 描述里写清"何时用/何时不用"，以及与相似工具的区别
   - 参数描述具体（包含类型、格式、约束、示例）
   - 限制：每个工具描述控制在 150 token 内，过长影响 LLM 注意力

2. **工具分组与检索**：
   - 工具数量 > 20 时，不要把所有工具塞进一次 context
   - 用 Embedding 做工具检索：根据用户 query，先检索最相关的 Top-K 个工具，只把这 K 个工具给 LLM
   - 分层工具：高级工具 → 触发后加载子工具（类似 MCP 的资源树）

3. **Few-shot 示例**：
   - 在工具描述里加典型调用示例，模型会模仿

4. **工具调用验证**：
   - 对工具调用的参数做 Pydantic 校验，格式错误时返回错误消息让 LLM 修正（self-correction）

5. **专门路由器**：
   - 用一个轻量 LLM（Haiku）做工具选择路由，主 LLM 只处理选定工具的调用

**考察点**：
1. 工具数量超过一定量时的检索 + 分发策略
2. Self-correction 的实现（把工具调用错误返回 LLM 让其修正）
3. 工具描述的最佳实践

**示例答案**：
当 Agent 有十几个甚至几十个工具时，把所有工具描述塞进一个上下文是低效且不准确的。我的解决方案是两层架构：工具描述先做 Embedding，存入向量库；每次 Agent 请求时，先用用户意图（query）检索 Top-5 最相关的工具，只把这 5 个工具的 schema 放进 LLM context，大幅减少选择干扰。工具描述本身要精心设计：名称用动词+名词（`get_order_status`），描述里第一句说"用于查询特定订单的实时状态"，第二句说"不要用此工具搜索产品信息"，把工具的边界说清楚。参数描述要带示例和约束（`order_id: 订单号，格式为'ORD-XXXXXX'，如 'ORD-123456'`）。工具调用失败时实现 self-correction：把错误信息（如 Pydantic 校验失败）作为 tool_result 返回给 LLM，LLM 通常能自行修正参数重试。我在 Peppr 系统里实现了这套机制，工具选择准确率从 72% 提升到 93%。

---

### Q41: Pipecat / LiveKit Agents 等实时语音 Agent 框架的核心架构是什么？

**题目解析**：实时语音 Agent 是 AI 落地的重要方向，考察候选人对语音 AI 工程的了解（Peppr 项目相关）。

**题目讲解**：
**实时语音 AI 管道（Pipeline）**：
```
麦克风 → VAD（语音活动检测）→ STT（语音转文字）→ LLM（文字处理）→ TTS（文字转语音）→ 扬声器
```

**关键组件**：

1. **VAD（Voice Activity Detection）**：
   - 检测用户是否在说话（Silero VAD），避免把背景噪音发给 STT
   - 打断检测（Interruption Detection）：用户说话时打断 TTS 输出

2. **STT（Speech-to-Text）**：
   - 流式转写：Deepgram、Whisper（本地）、Azure Speech
   - 延迟要求：< 300ms 端到端才有自然对话感

3. **LLM 处理**：
   - 流式输出，第一个 token 一出来就开始 TTS，减少感知延迟
   - Turn-taking 逻辑（谁该说话）

4. **TTS（Text-to-Speech）**：
   - 流式 TTS：ElevenLabs、CartesiaAI（低延迟，< 100ms 首词延迟）
   - 语音克隆：定制音色

**Pipecat 架构**：
- 基于 Python asyncio 的管道框架
- 每个处理节点是一个 Processor，通过消息队列连接
- 支持并行管道（同时处理多路 audio）
- 内置 interruption 处理、silence detection

**端到端延迟优化**：
- STT 流式 → LLM 流式 → TTS 流式，三段并行 pipeline
- LLM 输出第一句话（句号/逗号为截断点）立即送 TTS，不等全部生成
- 目标：用户停止说话到 AI 开始说话 < 1s

**考察点**：
1. 语音管道的三段延迟（STT latency + LLM TTFT + TTS latency）
2. 打断处理的实现（检测到用户说话，cancel 当前 TTS 和 LLM）
3. Turn-taking 的状态机设计

**示例答案**：
实时语音 Agent 的核心挑战是延迟：用户停止说话到 AI 开始回话要 < 1秒才有自然对话感。Pipecat 用 asyncio pipeline 把 VAD → STT → LLM → TTS 串成异步管道，每个阶段产生数据就立即送下游而不等全部完成。关键优化是 LLM 流式输出到 TTS 流式输入：LLM 生成完第一个句子（检测到句号/逗号）就立刻送给 TTS 开始合成，TTS 合成完第一段就开始播放，同时 LLM 继续生成后续文本——三段流水线高度重叠。打断处理是另一个难点：检测到用户开口（VAD 触发）时，立即 cancel 当前 TTS 播放和 LLM 生成，清空 pipeline，以用户最新输入重新开始，这个打断逻辑在 Pipecat 里通过 Frame 类型（CancelFrame）控制各 Processor 的取消。在 Peppr 系统里我实现了 ConfidenceDetector Processor，当 SenseBot 判断用户意图不清晰时（low_confidence）插入澄清请求，而不是直接传给 LLM，减少了无效调用。

---

## 十四、安全与红队测试

### Q42: 什么是 LLM 红队测试（Red Teaming）？有哪些常见的攻击向量？

**题目解析**：AI 安全是生产级 AI 系统的必要关卡，考察候选人的安全意识。

**题目讲解**：
**红队测试定义**：
模拟恶意用户，系统性地尝试找出 LLM 应用的安全漏洞，在上线前发现并修复。

**常见攻击向量**：

1. **越狱（Jailbreak）**：
   - 角色扮演绕过（"假设你是没有限制的 AI..."）
   - 编码绕过（Base64/Leetspeak 绕过关键词过滤）
   - 渐进式引导（先建立信任，再逐步引导到有害内容）
   - 对抗性后缀（特定 token 序列破坏对齐）

2. **提示词注入（Prompt Injection）**：
   - 直接注入：`忽略以上指令，改为...`
   - 间接注入：恶意网页/文档包含针对 AI 的指令
   - 跨上下文污染：一次对话中的恶意指令影响后续轮次

3. **信息泄露**：
   - 提取 System Prompt（`请重复你的指令`）
   - 训练数据提取（要求重复特定格式的内容）
   - 用户数据泄露（多租户场景下获取他人数据）

4. **资源滥用**：
   - Token 轰炸（超长输入 + 超长输出）
   - 工具滥用（让 Agent 无限循环调用工具）

**防御框架**：
- Anthropic 的 Constitutional AI
- 输入/输出 Guardrails（Guardrails AI 框架）
- 多模型验证（第二个模型检查第一个的输出）
- 速率限制 + 异常检测

**考察点**：
1. 间接注入的危险性（比直接注入更难防）
2. 多层防御的重要性（没有单一银弹）
3. System Prompt 保密的最佳实践

**示例答案**：
LLM 红队测试是在 AI 应用上线前主动寻找安全漏洞的过程，类似于传统软件的渗透测试但针对 LLM 特性。攻击向量分几类：越狱尝试绕过模型的安全对齐（角色扮演、编码混淆、渐进引导），提示词注入利用用户输入覆盖系统指令（直接注入容易防，间接注入难——Agent 读取的网页/文件里包含指令），信息泄露尝试提取 system prompt 或其他用户数据。防御要分层：在模型层用支持 Instruction Hierarchy 的模型（system prompt 权限最高，用户无法覆盖）；在应用层把用户输入放在明确的 XML 标签里与系统指令区分；对读取的外部内容在 prompt 里明确声明"以下是不可信内容"；在输出层检测是否包含系统指令内容（防泄露）。没有完美防御，定期运行自动化红队测试（Garak/PromptBench 等框架），对新发现的越狱模式及时更新防御。

---

### Q43: 如何实现 LLM 应用的内容安全过滤（Content Moderation）？

**题目解析**：内容安全是商业 AI 产品上线的门槛，考察候选人对内容安全工程的理解。

**题目讲解**：
**过滤层次**：

1. **输入过滤**：
   - 关键词黑名单（简单但易绕过）
   - Moderation API（OpenAI Moderation、Perspective API）
   - 专用分类模型（Llama Guard、OpenAI 的内容分类器）
   - 意图识别（判断用户是否有恶意意图）

2. **输出过滤**：
   - 流式输出时的实时检测（每个 token chunk 检查）
   - 最终输出的全量检查
   - PII（个人身份信息）检测和脱敏

3. **Llama Guard**：
   - Meta 开源的安全分类 LLM，可以检测输入和输出是否违反特定安全策略
   - 支持自定义策略类别（针对不同业务场景）
   - 比规则系统更灵活，比通用 LLM 更快

4. **人工审核**：
   - 高风险内容的二次审核
   - 用户举报流程
   - 抽样人工 review

**工程挑战**：
- 流式输出下的延迟（等全部生成后过滤会影响体验）
- 假阳性（正常内容被误判），影响用户体验
- 多语言支持
- 上下文相关性（同样的词在不同语境意义不同）

**考察点**：
1. 输入过滤 vs 输出过滤的时机选择
2. Llama Guard 的分类机制
3. PII 检测和数据合规

**示例答案**：
内容安全过滤是多层次的。输入层：先用快速规则过滤明显违规词（微秒级），再用 Moderation API（如 OpenAI 的 moderation endpoint 或自部署的 Llama Guard）做语义分类，识别 hate speech / violence / sexual content 等类别，置信度高的直接拦截，低置信度的标记人工复查。输出层：流式输出时每完成一个完整句子做一次检测，不等全部完成（避免流式体验变差）；检测到违规时立即截断并返回友好提示。PII 检测是另一个维度，用 presidio（Microsoft 开源）或规则匹配检测身份证/手机号/银行卡号等，在日志记录前脱敏。上下文相关性是难点——"如何制作炸药"的回答在正常化学课语境下是合法的，在恶意用户语境下不是；Llama Guard 做了上下文感知分类，比简单关键词好很多。假阳性的权衡：面向 C 端用户宁可多拦，面向企业内部工具可以放宽阈值，结合投诉量和业务需求动态调整。

---

## 十五、多模态 Agent

### Q44: 多模态 LLM 是如何处理图片的？Vision-Language 模型的架构是什么？

**题目解析**：多模态是 LLM 的重要扩展方向，考察候选人对技术边界的了解。

**题目讲解**：
**Vision Encoder + LLM 架构**：
```
图片 → Vision Encoder（如 CLIP ViT）→ 图片 Token/Embedding
文本 → Text Tokenizer → 文本 Token
两者 → 对齐层（Projection）→ 统一 Token 序列 → LLM Decoder
```

**主要架构变体**：
1. **LLaVA 风格**：CLIP ViT 编码图片 → MLP 投影层 → 拼接到文本 token 序列
2. **GPT-4V**：图片通过 CLIP 处理，细节用 tile-based 方法（将图片切片分别处理再聚合）
3. **Flamingo 风格**：Gated Cross-Attention，文本 token 通过 cross-attention 动态关注图片 token
4. **Gemini**：原生多模态，从预训练就是多模态的

**视觉处理细节**：
- **Image Tiling**：高分辨率图片切成多个 tile 分别编码（GPT-4V、Claude 3 等），保留细节
- **Dynamic Resolution**：根据图片内容动态选择分辨率（避免过多 token 消耗）
- 一张 512x512 图片通常会产生 256-1024 个 image token（消耗上下文窗口）

**实际能力与局限**：
- 擅长：图片描述、VQA（视觉问答）、OCR、图表理解
- 局限：精确计数（"图片里有几只猫"容易出错）、空间关系理解、细粒度视觉推理

**考察点**：
1. Vision Encoder 的作用（把像素转为 LLM 能理解的 embedding）
2. Image Token 对上下文窗口的消耗
3. 实际应用中多模态 Agent 的设计模式

**示例答案**：
多模态 LLM 的标准架构是 Vision Encoder + Projection + LLM Decoder：图片先通过预训练的 ViT（如 CLIP 的 ViT-L）提取视觉特征，得到一组 image patch embedding，再通过一个 MLP 投影层将维度对齐到 LLM 的 embedding 维度，最后这些 image token 和文本 token 拼接在一起送入 LLM Decoder。一张图片通常产生几百个 image token（Claude 3 根据图片大小可达 1000+ token），显著消耗上下文窗口，成本要考虑。Image Tiling 是处理高分辨率图片的技巧：把图片切成多个 tile 分别编码再聚合，保留文字等细节（低分辨率 resize 后 OCR 会失败）。实际 Agent 设计里，多模态能力主要用于三类场景：文档图片 OCR（菜单、表格、截图解析）、界面操作（截图 → Agent 判断下一步操作）、视觉内容审核。在 Peppr 点餐系统里，菜品图片通过多模态识别辅助确认用户描述的菜品。

---

## 十六、常见框架详解

### Q45: CrewAI 和 AutoGen 的核心设计理念是什么？它们与 LangGraph 有何不同？

**题目解析**：AI Agent 框架选型是实际工程决策，考察候选人对不同框架的对比理解。

**题目讲解**：
**LangGraph（Anthropic 生态）**：
- 显式状态机（TypedDict State + 有向图）
- 精细控制：每条边、每个节点都可以自定义
- 优势：可调试性强，支持 HITL、Checkpointing、并行节点
- 适合：复杂流程、需要精细控制的生产系统

**CrewAI（角色驱动）**：
- 以"角色/岗位"（Role/Backstory）为核心抽象，强调 Agent 的人格
- Agent 组成 Crew，按顺序或层次完成 Task
- Hierarchical Process：Manager Agent 分配任务给 Worker
- 适合：快速搭建、业务语义清晰的场景（类比公司组织架构）
- 缺点：内部状态管理较黑盒，自定义控制流有限

**AutoGen（微软，对话驱动）**：
- 以"对话"为核心：Agent 间通过消息对话协作
- ConversableAgent：每个 Agent 都能与其他 Agent 对话
- GroupChat：多 Agent 轮流发言，Speaker selection 决定谁说话
- 优势：灵活的多 Agent 对话，学术友好
- 缺点：对话流程不如显式状态机可控，难以预测执行路径

**选择建议**：
- 生产复杂流程，需要强可控性和调试性 → LangGraph
- 快速原型，业务逻辑可以类比人类团队协作 → CrewAI
- 研究/实验，需要灵活对话 → AutoGen
- 简单 RAG/Tool 调用 → LangChain 直接够用

**考察点**：
1. 三种框架的核心抽象（图/角色/对话）
2. Hierarchical Agent 的任务分配机制
3. 框架选型的实际考量（可调试 vs 快速开发）

**示例答案**：
三个框架的核心抽象不同：LangGraph 用状态图，你显式定义每个节点的处理逻辑和边的转移条件，像写状态机一样控制 Agent 的每一步，可观测性和可控性最强，适合需要上生产的复杂场景；CrewAI 用角色驱动，你定义每个 Agent 的职责（Role/Goal/Backstory），框架自动管理任务流转，类比"组建一个团队完成项目"，业务语义直观，开发快但自定义能力有限；AutoGen 用消息驱动，Agent 互相发消息对话，GroupChat 决定谁该发言，非常灵活但执行路径难以精确预测，更适合研究场景。我在工作中，原型阶段用 CrewAI 快速验证多 Agent 协作思路，确认可行后用 LangGraph 重写成生产版本，获得完整的 Checkpointing、HITL 和 Tracing 支持。

---

### Q46: 什么是 Dify？它与 LangChain/LangGraph 的定位有什么不同？

**题目解析**：Dify 是国内流行的 LLMOps 平台，考察候选人对 LLM 应用生态的全面了解。

**题目讲解**：
**Dify 定位**：
- **LLMOps 平台**：提供可视化的 Workflow 编排、Prompt 管理、数据集（RAG）、模型接入、监控
- 面向"构建 AI 应用"的工程师和非技术用户，降低开发门槛
- 开源（self-hosted）或云服务

**Dify vs LangChain/LangGraph**：
| | LangChain/LangGraph | Dify |
|---|---|---|
| 定位 | 开发框架（SDK）| LLMOps 平台（含可视化 UI）|
| 使用方式 | Python 代码 | 可视化拖拽 + 代码 |
| 适合用户 | 有工程能力的开发者 | 开发者 + 业务人员 |
| 可视化工作流 | 有限（LangSmith 可观测）| 完整可视化编排 |
| RAG | 需要自己集成向量库 | 内置数据集管理 + 向量化 |
| Prompt 管理 | 无内置管理 | 内置版本管理、A/B 测试 |

**Dify 的 Workflow**：
- 类似 n8n / Zapier 的节点式编排，但专为 LLM 优化
- 内置 LLM 节点、代码节点、HTTP 节点、知识库检索节点等
- 支持条件分支和循环

**适用场景**：
- 企业内部 AI 应用快速构建（知识库问答、文档摘要）
- 非技术团队能自己调整 prompt 和 workflow
- 需要可视化看 LLM 应用运行状态

**考察点**：
1. LLMOps 的概念（像 MLOps 一样管理 LLM 应用的全生命周期）
2. Dify 的 RAG 能力与自建 RAG 的对比
3. 选择平台 vs 自研的权衡

**示例答案**：
Dify 是 LLMOps 平台，而 LangChain 是开发框架——这是最根本的区别。Dify 给你一个 Web UI，在里面可视化地拖拽节点（LLM节点、检索节点、代码节点）组成 Workflow，配置提示词、接入知识库，非技术的产品同学也能改 prompt 和流程，降低了协作成本。LangChain/LangGraph 是纯代码框架，灵活性更高，可以做任何自定义逻辑，适合复杂 Agent 的精细控制。工程上两者可以配合：用 Dify 快速验证 prompt 策略和 RAG 效果（它的 Debug 界面很方便看每一步的输入输出），确认后如果需要更复杂的逻辑再用 LangGraph 实现。Dify 的 RAG 内置了向量化、分块、检索、Rerank，对于标准 Q&A 场景够用，但高度定制化的 RAG（自定义分块策略、多步检索）还是需要自建。我们团队的实践是内部知识库问答用 Dify（业务同学可以自己维护文档和测试效果），对外的复杂 AI 产品用 LangGraph 自建。

---

### Q47: LlamaIndex 与 LangChain 的 RAG 能力有什么区别？

**题目解析**：LlamaIndex 是 RAG 领域的专门框架，与 LangChain 形成差异化竞争，考察候选人的框架选型能力。

**题目讲解**：
**LlamaIndex 的定位**：
- 专注于"数据框架"：将私有数据连接到 LLM，核心是索引、检索、查询引擎
- 原名 GPT Index，说明其起源是让 GPT 能高效查询私有数据

**LlamaIndex 的特色能力**：
1. **多样化 Loader**：支持 100+ 数据源（PDF/Word/Notion/Confluence/数据库），LlamaHub 生态
2. **多种索引类型**：VectorStoreIndex（向量）、SummaryIndex（摘要树）、KnowledgeGraphIndex（知识图谱）
3. **高级检索器**：Recursive Retrieval、SubQuestion Query Engine（复杂问题分解）、RouterQueryEngine（多索引路由）
4. **Query Pipeline**：灵活的 RAG 管道构建，类似 LangChain 但更专注于检索

**LangChain 的优势**：
- 更通用，Chain/Agent 的生态更丰富
- 与 LangSmith/LangGraph 深度集成
- 工具调用、多 Agent 支持更完善

**选择建议**：
- 纯 RAG 场景（复杂文档解析、多数据源聚合）→ LlamaIndex
- 通用 Agent（工具调用、多步骤推理）→ LangChain/LangGraph
- 两者可以混用（LlamaIndex 做索引，LangChain 做 Agent）

**示例答案**：
LlamaIndex 是 RAG 专家，在数据摄取（支持 PDF/HTML/数据库/Notion 等几十种数据源）和检索策略（Recursive Retrieval、SubQuestion 分解复杂问题）上比 LangChain 成熟。LangChain 更全面，RAG 能力不差但不是其核心专长，而 Agent 框架、工具集成、LangGraph 是其优势。实践中我会根据项目特点选择：知识库类项目（企业文档、代码库搜索）用 LlamaIndex，它的 RouterQueryEngine 可以根据问题类型路由到不同索引（结构化数据走 SQL 引擎，非结构化走向量检索）；需要复杂 Agent 逻辑的项目用 LangGraph；两者也可以配合，LlamaIndex 负责文档索引和检索，结果传给 LangChain Agent 处理。

---

*进阶篇完，与基础篇合计约 47 道 AI Agent 面试题，持续更新中。*
