# AI Agent 专题 · 训练与多模态工程

<!-- navigation:start -->
[← AI Agent目录](README.md) · [12 周学习路线](../LEARNING_GUIDE.md) · [首页](../README.md)

<a id="question-index"></a>

<details>
<summary>本页题目（3 题，点击展开）</summary>

- [Q115 · 如何从显存、通信和拓扑选择 ZeRO/FSDP、TP、PP 与序列并行？](#q115)
- [Q116 · SFT Sequence Packing 如何提效，并避免跨样本注意力污染？](#q116)
- [Q117 · VLM 长视频理解如何设计帧采样、视觉 token 预算与粗筛精读链路？](#q117)

</details>
<!-- navigation:end -->

> 本页 3 题均在写入时核对了一手论文、官方文档或官方实现；技术结论与工程建议分别标注。
> 本页未提供可追溯的原始面经，不能据此判断题目来自哪家公司或出现频率。核验范围见[来源核验记录](../SOURCE_AUDIT.md)。

---

## 一、分布式训练

<a id="q115"></a>

<a id="review-ai-q115"></a>

### Q115: 如何从显存、通信和拓扑选择 ZeRO/FSDP、TP、PP 与序列并行？

> **核验日期**：2026-10-27
>
> **适用范围**：稠密 Transformer 的多 GPU 训练；ZeRO 原论文、Megatron-LM 3D 并行论文、PyTorch 2.14 FSDP1 文档与 Megatron Core 当前文档。不同优化器、精度、调度器和硬件拓扑需重新计算。
>
> **技术参考**：[ZeRO 原论文，arXiv 1910.02054](https://arxiv.org/abs/1910.02054)；[Efficient Large-Scale Language Model Training on GPU Clusters Using Megatron-LM，arXiv 2104.04473](https://arxiv.org/abs/2104.04473)；[PyTorch FullyShardedDataParallel 文档](https://docs.pytorch.org/docs/stable/fsdp.html)；[Megatron Core Parallelism Strategies Guide](https://docs.nvidia.com/megatron-core/developer-guide/latest/user-guide/parallelism-guide.html)
>
> **面经来源**：未提供可追溯面经；不标注公司或出现频率。

**题目解析**：

这道题不是让候选人背并行名词，而是看能否按“单卡为何放不下 → 哪类状态或计算要切 → 会引入什么通信 → 集群链路能否承受”的顺序完成选型。回答时应先声明模型、精度、优化器、序列长度、GPU 显存和网络拓扑；缺少这些条件时不存在唯一最优配置。

**题目讲解**：

### 1. 先把显存账的假设写清楚

设模型有 $`P`$ 个参数。经典的 FP16 混合精度 Adam 账本可能包含：2 字节低精度模型参数、4 字节 FP32 master 参数、8 字节两份 FP32 动量。此时**尚未计算梯度**的模型状态约为 $`14P`$ 字节；若梯度为 2 字节，再加到 $`16P`$ 字节。以 70 亿参数为例，按十进制换算分别约为 98 GB 和 112 GB，还不含 activation、临时 buffer、通信 bucket 和碎片。

这只是一个用于推导的配置，不是所有框架的常数：BF16 训练、8-bit optimizer、是否保留独立 master 参数、梯度 dtype 及 fused optimizer 都会改变结果。因此更稳妥的表达是“列出实际驻留张量后逐项相加”，而不是背“训练固定需要参数量的多少倍显存”。

### 2. ZeRO 递进切分的是数据并行副本中的模型状态

在 $`N`$ 个 data-parallel rank 上，忽略不均匀分片和峰值临时张量，可用下表理解递进关系：

| 策略 | 被分片的主要状态 | 主要代价与边界 |
|---|---|---|
| 普通 DDP | 无；各 rank 持有完整参数、梯度和优化器状态 | 实现简单，但模型状态重复 $`N`$ 份 |
| ZeRO-1 | 优化器状态 | 参数和梯度仍复制；优化器更新后需要让各 rank 获得一致参数 |
| ZeRO-2 | 优化器状态、梯度 | 进一步省梯度显存；常以 reduce-scatter 等 collective 完成梯度归并 |
| ZeRO-3 | 优化器状态、梯度、参数 | 计算前后需要按分片粒度 gather / reshard，峰值和吞吐依赖 wrap 粒度、预取及通信重叠 |

PyTorch 文档说明 FSDP 的设计受 ZeRO Stage 3 启发；`FULL_SHARD` 同样分片参数、梯度和优化器状态，并在前向／反向前 all-gather 参数、反向后 reduce-scatter 梯度。但 **FSDP 不是 ZeRO-3 的别名**：二者的 API、参数生命周期、wrap 单元、状态字典和调优项并不相同。`SHARD_GRAD_OP`、`HYBRID_SHARD` 等策略也不能全部概括成 ZeRO-3。

不要无条件背“Stage 3 通信增加 50%”。ZeRO 论文在特定分析模型下给出通信量关系，真实训练还受参数持有时机、bucket、prefetch、重计算、累积步数、网络和 collective 实现影响；工程上应以 profiler 中的通信量、重叠比例和 step time 为准。

### 3. TP、PP 与序列维切分解决的是不同问题

| 方式 | 切分对象 | 通信特点 | 典型选型依据 |
|---|---|---|---|
| Tensor Parallelism（TP） | 单层矩阵与 attention head 等层内计算 | 每层都会出现 collective，频率高、对延迟和带宽敏感 | 单层放不下或矩阵足够大；优先放在最快互连域，但不存在“超过 8 卡必然劣化”的通用阈值 |
| Pipeline Parallelism（PP） | 按层切模型深度 | 相邻 stage 传 activation / gradient，通常是点对点通信 | 模型深度很大、需要跨较慢链路扩展；要同时处理 stage 均衡和 pipeline bubble |
| Sequence Parallelism（Megatron SP） | TP 区域外的 LayerNorm、Dropout 等 activation 的序列维 | 通常与 TP 配合，降低重复 activation | 不等同于把整段 attention 上下文切开 |
| Context Parallelism（CP） | 网络输入及 activation 的序列维，包括长上下文 attention 的协同 | attention 需要跨 rank 交换 KV 等信息 | 长序列 activation 成为主要瓶颈时使用；不要与 Megatron SP 混称 |

对于简单、非交错的 flush pipeline，论文常用 $`(p-1)/m`$ 描述 bubble time 相对理想计算时间的比例，其中 $`p`$ 是 stage 数、$`m`$ 是 micro-batch 数；若用“bubble 占总时间比例”，分母会相应包含有效计算与 bubble。必须先说明口径和调度方式。1F1B 调度可以控制在途 activation 数量，activation recomputation 则通过额外前向计算换显存，两者是可组合但不同的技术。

### 4. 工程选型顺序

1. **可行性**：逐项估算模型状态、activation、临时 buffer 和安全余量；先判断单卡、DDP 或状态分片能否放下。
2. **最紧约束**：状态显存紧优先考虑 ZeRO/FSDP；单层放不下考虑 TP；模型深度需要继续扩展考虑 PP；长上下文 activation 紧考虑 SP/CP 或重计算。
3. **拓扑映射**：把高频 collective 的并行组映射到更快链路；不能只依据“机内／机间”名称，要看实测带宽、延迟、拥塞和 collective 算法。
4. **组合与搜索**：满足总卡数关系后，对 TP/PP/CP/DP degree、micro-batch、wrap 粒度和 checkpointing 做小规模网格测试。
5. **验收指标**：至少比较峰值显存、tokens/s、step time、通信占比、bubble、扩展效率和 checkpoint 可恢复性。

**考察点**：

1. 能否在明确精度和优化器假设后计算显存，而不是背固定倍数。
2. 能否区分状态分片、层内切分、层间切分和序列维切分。
3. 能否把 collective 频率与实际互连拓扑联系起来。
4. 是否知道公式和经验配置都有适用口径，最终要用目标负载实测。

**面试官更想听**：

先给约束，再给选择理由和证伪方法。例如“我先用估算排除放不下的方案，再把高频 TP collective 留在最快互连组；PP 是否跨节点取决于 stage 通信与负载均衡实测，而不是固定模板。最后用小规模 profile 比较峰值显存和 tokens/s”。这种回答比报一个所谓“千卡标配”更可信。

**示例答案**：

我会先按实际 dtype 和优化器把参数、梯度、master 参数、优化器状态与 activation 分开算，留出通信 bucket 和临时张量余量。状态副本是瓶颈时用 ZeRO/FSDP；单层矩阵放不下时加 TP，因为它每层都有 collective，应优先映射到最快互连；模型按深度仍放不下时加 PP，并用 micro-batch 和 stage 均衡控制 bubble；长序列 activation 紧时再区分 Megatron SP 与切完整上下文的 CP。FSDP `FULL_SHARD` 与 ZeRO-3 的分片目标相近但实现并不等同。最终配置必须在目标拓扑上比较峰值显存、tokens/s、通信占比和恢复能力，不能用“TP 只能 8 卡”或“ZeRO-3 固定多 50% 通信”代替实测。

---

## 二、SFT 数据与计算效率

<a id="q116"></a>

<a id="review-ai-q116"></a>

### Q116: SFT Sequence Packing 如何提效，并避免跨样本注意力污染？

> **核验日期**：2026-10-27
>
> **适用范围**：将相互独立的文本样本用于 causal language-model SFT；Krell 等 sequence packing 论文、FlashAttention 当前 varlen 接口与 Hugging Face TRL 当前 SFTTrainer 文档。具体 mask、position IDs 和 loss 行为以所用模型及训练框架版本为准。
>
> **技术参考**：[Efficient Sequence Packing without Cross-contamination，arXiv 2107.02027](https://arxiv.org/abs/2107.02027)；[FlashAttention 官方仓库](https://github.com/Dao-AILab/flash-attention)；[Hugging Face TRL SFTTrainer 文档](https://huggingface.co/docs/trl/sft_trainer)
>
> **面经来源**：未提供可追溯面经；不标注公司或出现频率。

**题目解析**：

Packing 的目标是减少为了组成规则 batch 而计算的 padding token。真正的区分点不在“把短文本拼起来”，而在能否说明样本边界如何进入 attention、position 和 labels，以及优化目标是否与未 packing 时一致。

**题目讲解**：

### 1. Packing、padding-free 与动态 batching 不是同一个开关

- **Packing**：把多条 tokenized example 放进一个长度上限为 $`L`$ 的容器，可视为 bin packing；first-fit、best-fit decreasing（BFD）和在线分桶只是不同装箱策略。
- **Padding-free / varlen attention**：将不同长度序列展平保存，通过边界信息让 kernel 分段计算，避免对 padding 做 attention。FlashAttention 的 varlen 接口以 `cu_seqlens` 等信息描述各段边界。
- **按长度分桶**：只把相近长度样本放进同一 batch，也能减 padding，但不一定把多条样本拼进同一训练行。

TRL 当前文档提供 `packing=True`，并区分 `bfd`、`bfd_split` 与 `wrapped` 等策略；不同版本的默认策略和 padding-free 行为会变化，所以面试中应说出框架版本，而不是把某一实现当成统一定义。

### 2. 只有因果 mask 不足以隔离独立样本

若直接把样本 A、B 拼成 `[A; B]` 并套普通 causal mask，A 看不到未来的 B，但 **B 可以看到 A**。若目标是与分别训练 A、B 数学等价，就要让 attention 呈 block diagonal：A 只看 A 内合法前缀，B 只看 B 内合法前缀。实现可以显式构造分块 mask，也可以让 varlen kernel 根据序列边界分别计算。

`position_ids` 重置不能代替 attention 隔离。对依赖绝对位置的模型，按样本重置通常是等价性的一部分；对标准 RoPE，整段位置同时平移在理想公式下不改变段内相对位置，但重置仍可避免位置分布漂移，并可能被框架用于表达 padding-free 边界。结论必须结合模型的位置编码和 kernel 接口验证。

### 3. Labels 与特殊 token 也要守住样本边界

- 每条样本结尾是否加 EOS，要与 chat template 和推理格式一致。
- prompt token、system/user token 是否计入 loss，由 `completion_only_loss`、`assistant_only_loss` 或自定义 label mask 决定。
- 不能让 B 的首 token 以 A 的尾 token 为训练目标；边界位置的 shift labels 需要屏蔽或用正确的 EOS 语义连接。
- 多轮对话的“同一样本内跨轮可见”与“不同样本间不可见”是两级边界，不能按每轮都切断。

### 4. Packing 不必然改变 loss 权重

若 token、label mask 和 token-level reduction 都保持不变，Packing 只是改变布局，不必然改变训练目标。“短样本一定被长样本稀释”并不准确：按有效 token 平均本来就是 token-weighted objective；按每条 request 先归一化再平均则是另一种 sample-weighted objective。两者都可以选择，但必须明确业务目标，并在 packing 前后保持同一口径。

### 5. 收益必须由数据分布和实现测量

Packing 的理论机会来自原 batch 的 padding 比例，实际收益还取决于装箱利用率、kernel、长度上限、数据加载、梯度累积和硬件。不能脱离这些条件承诺固定的 1.5–3 倍提速。建议同时报告：

- 有效 token 占输入 token 的比例、每秒有效 token 数和 step time；
- 峰值显存与是否出现额外 mask 的 $`O(L^2)`$ 存储；
- 截断／拆分／丢弃的样本和 token 数；
- 在相同有效 token budget 下的验证集结果。

**考察点**：

1. 是否区分 Packing、padding-free attention 和长度分桶。
2. 是否知道普通 causal mask 会让后一个样本读取前一个样本。
3. 是否同时检查 attention、position、EOS、labels 和 loss reduction。
4. 是否用有效 token 吞吐和 matched-budget 评测证明收益。

**面试官更想听**：

能给出一个最小等价性测试：对两条短样本分别前向，再 packing 后前向，关闭 dropout，在各自合法 token 上比较 logits 和 loss；同时检查边界首 token 的 label。之后才做吞吐 benchmark。这样能把“看起来没有 padding”与“训练语义正确”分开。

**示例答案**：

Packing 是把多条短样本装进固定 token 容器，收益来自减少 padding；它和 padding-free kernel、按长度分桶是相关但不同的机制。朴素 `[A; B]` 加 causal mask 会让 B 看到 A，所以若要求与独立样本等价，必须用 block-diagonal mask，或通过 FlashAttention varlen 的序列边界分段计算。位置 ID 重置不能代替隔离，还要检查 EOS、chat template、assistant-only label mask 和边界 shift。Packing 本身也不必然稀释短样本，关键是采用 token-weighted 还是 sample-weighted loss。上线前我会先做 packed/unpacked logits 与 loss 等价性测试，再比较有效 tokens/s、显存和同 token budget 的验证效果。

---

## 三、VLM 视频理解

<a id="q117"></a>

<a id="review-ai-q117"></a>

### Q117: VLM 长视频理解如何设计帧采样、视觉 token 预算与粗筛精读链路？

> **核验日期**：2026-10-27
>
> **适用范围**：基于抽帧或视觉片段 token 的视频问答／检索系统；以 Qwen2.5-VL 的动态分辨率、动态 FPS 与绝对时间编码为具体例子。不同 VLM 的预处理、视觉 token 计算和时间编码不能直接套用。
>
> **技术参考**：[Qwen2.5-VL Technical Report，arXiv 2502.13923](https://arxiv.org/abs/2502.13923)；[Qwen2.5-VL 官方博客](https://qwenlm.github.io/blog/qwen2.5-vl/)；[Qwen2.5-VL 官方仓库](https://github.com/QwenLM/Qwen2.5-VL)；[PySceneDetect 官方文档](https://www.scenedetect.com/docs/)；[VideoRAG，arXiv 2502.01549](https://arxiv.org/abs/2502.01549)
>
> **面经来源**：未提供可追溯面经；不标注公司或出现频率。

**题目解析**：

长视频系统首先是预算与证据召回问题：原始帧数远大于模型能接收的视觉 token 数。回答应先问任务需要识别文字、细小物体、动作顺序还是长时间事件，再在时间覆盖和单帧细节之间分配预算，而不是先报一个固定抽帧率。

**题目讲解**：

### 1. 先建立端到端 token 预算

可以先写出约束：

```text
B_context >= B_system+query + B_visual + B_audio/ASR + B_output + safety_margin
```

若模型和预处理器近似把每帧变为 $`T_frame`$ 个视觉 token，则可用 $`N_frames × T_frame`$ 做初始估算。例如 32 帧、每帧 768 token 只是一个便于心算的配置，视觉部分为 24,576 token；它不是所有 VLM 的默认值。动态分辨率、temporal patch、帧合并和 resize 规则都会改变实际数量，应以 processor 输出的 token 数复核。

Qwen2.5-VL 官方实现允许通过 `fps`、`min_pixels`、`max_pixels` 等参数调节输入；官方说明更高分辨率会增加计算，而视觉 token 范围可用于平衡效果与成本。工程上还要为文本提示、ASR/OCR、生成输出和框架特殊 token 留余量，不能把整个 context window 都分给视频。

### 2. 采样策略要匹配视频和问题

| 策略 | 优点 | 主要失败模式 |
|---|---|---|
| 均匀取固定帧数 | 总预算稳定，适合快速建立全局概览 | 视频越长时间分辨率越低，短暂事件可能落在采样间隔中 |
| 固定 FPS | 时间粒度可解释，适合动作节奏相近的视频 | 长视频 token 数随时长增长，静止段浪费预算 |
| 镜头边界 + 代表帧 | 对剪辑视频减少同一镜头内冗余；PySceneDetect 等工具可提供镜头切分 | 监控、缓慢变化或无明显剪辑的视频未必适用 |
| 视觉 embedding 去冗余 | 可合并相似画面，保留外观变化 | 相似画面中的小文字或细微动作可能被错误删除 |
| Query-aware 检索 | 把更多预算给与问题相关的时间段 | 第一阶段漏召回后，精读无法补救 |

因此，OCR／小目标问题通常更需要单帧分辨率，动作顺序问题更需要时间采样密度，跨小时事件定位则更依赖分段、索引与召回。不存在只看视频时长就能决定的统一策略。

### 3. 时间信息不能只靠帧数组下标猜

Qwen2.5-VL 的官方材料说明其使用 dynamic FPS training 与 absolute time encoding，使时间维的 mRoPE ID 与真实时间流逝对齐。这是该模型的具体机制，不应推广成所有 VLM 都自动理解真实秒数。使用其他模型时，可在输入中显式附时间戳作为兼容性方案，但是否被可靠利用仍需用时间定位测试验证。

当源视频是可变帧率、存在剪辑或预处理器进行了二次抽帧时，应保留“原始时间戳 → 片段 → 采样帧 → 模型输入”的映射；否则模型即使给出正确片段语义，也可能无法回到可播放的准确时间范围。

### 4. 长视频使用粗筛—精读链路

一种可落地的两阶段方案是：

1. **切段并建轻量索引**：保存起止时间，低分辨率稀疏抽帧；按任务加入 ASR、OCR、caption、对象或视觉 embedding。
2. **Query-aware 粗筛**：检索 top-k 片段，同时保留相邻片段以降低边界截断风险。
3. **高预算精读**：只对候选片段提高 FPS 或分辨率，让 VLM 产出答案和时间证据。
4. **证据聚合**：把片段答案、时间戳和来源帧合并；冲突时回读，而不是只相信一次摘要。
5. **分层评测**：分别测片段召回率、定位误差、证据支持率、最终答案质量、延迟和成本。

VideoRAG 等研究说明检索增强可用于超长视频，但具体论文结果不能直接当作业务系统收益。第一阶段的 Recall@k 是这类系统的上限之一：候选中没有证据，第二阶段模型再强也无法恢复。

**考察点**：

1. 能否把 context window 拆成视觉、文本、音频／ASR、输出和余量预算。
2. 能否根据 OCR、小目标、动作与长事件等任务选择不同采样策略。
3. 是否保留真实时间戳映射，并区分具体模型的时间编码能力。
4. 能否把长视频拆成可独立评估的召回与精读两阶段。

**面试官更想听**：

不要只说“均匀抽 32 帧”。先举失败反例，再给可观测指标：例如“一小时视频里两秒钟的异常可能被均匀采样漏掉，所以我会先用镜头／ASR／embedding 建片段索引，关注候选召回率；OCR 候选再以高分辨率回读”。这种回答体现的是系统判断而非模型名记忆。

**示例答案**：

我会先从总 context 中扣掉 prompt、ASR/OCR、输出和安全余量，再把视觉预算分配到帧数与单帧分辨率；processor 的实际 token 数才是最终口径。均匀采样适合全局概览，镜头边界适合剪辑视频，embedding 去冗余和 query-aware 检索适合长视频，但都可能漏掉短暂事件。Qwen2.5-VL 的 dynamic FPS 与绝对时间编码是具体模型能力，其他 VLM 不能默认照搬。生产上我会先分段建低成本索引，检索 top-k 后对候选提高 FPS 或分辨率精读，并分别评估片段 Recall@k、时间定位误差、答案证据、延迟和成本。
