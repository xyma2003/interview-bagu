# AI Agent 面经专项 · 大厂高频题

> 来源：字节跳动 / 腾讯 / 小红书 / 阿里 / MiniMax 真实面经整理
> 每题标注高频出现公司，答案结合实际工程经验撰写

---

## MiniMax 高频（LLM 底层 + Agent 架构）

### Q48: MiniMax 面试：Transformer 的 Attention 为什么需要 Softmax？用其他激活函数可以吗？

**🏢 高频公司**：MiniMax、字节 AI Lab、阿里通义

**题目解析**：
MiniMax 等 LLM 公司会深挖 Transformer 细节，考察候选人是否真正理解架构而非背诵。

**题目讲解**：
**Softmax 的作用**：
1. **归一化**：将 QKᵀ 的原始 score 转为 0-1 之间的权重，且所有位置权重之和为 1，使得 attention 权重可以解释为"注意力分配比例"
2. **凸显差异**：Softmax 会放大最大值、压制小值（非线性），使 attention 更"尖锐"（聚焦），而非平均分散
3. **梯度特性**：Softmax 的梯度与其输出相关，有利于反向传播

**可以用其他函数吗？**
- **Sigmoid（每个位置独立）**：可以，权重不约束和为 1，但信息归一化属性丢失，实践中效果较差；近年 Sigmoid Attention（如 FLASH Attention 变体）在某些场景有效
- **ReLU Attention**：会产生稀疏 attention（大量权重为 0），节省计算，但可能丢失信息；Google 的 ReLA 等工作探索过
- **Sparsemax**：Softmax 的稀疏化版本，能产生真正的 0 权重（某些 token 完全不关注），梯度仍然良好
- **线性 Attention（Attention without Softmax）**：用核函数近似 Softmax，将 O(N²) 降到 O(N)，但表达能力有损（Performer、LinearTransformer 等）

**为什么不用 Sigmoid**：
- Sigmoid 每个位置独立，失去了"所有位置竞争"的语义
- 若某 token 对所有位置都输出高权重，信息会冗余；Softmax 的竞争机制更自然

**考察点**：
1. Softmax 归一化的必要性与限制
2. 线性 Attention 的 trade-off
3. MHA 中多头的 Softmax 是独立的

**示例答案**：
Softmax 在 Attention 中做两件事：归一化（权重和为1，可以解释为概率分布）和凸显差异（指数函数放大最大的 score，形成"赢家通吃"效应）。理论上可以换成其他函数，但代价各不同。Sparsemax 可以产生稀疏 attention（某些 token 权重精确为 0），对于不需要关注远处 token 的场景更高效。线性 Attention 用核函数（如 elu(x)+1）近似 Softmax，把 O(N²) 计算降到 O(N)，代价是无法精确表达 full attention，长序列上准确率下降。Sigmoid Attention 让每个 token 独立打分，失去了 token 间的竞争机制，实践效果通常差于 Softmax。近年也有工作（如 Flash Attention 的一些变体）用 Softmax 的数值稳定改进版，在 numerical stability 上做了工程优化，但形式上仍是 Softmax。

---

### Q49: MiniMax 面试：什么是 Speculative Decoding？它如何加速 LLM 推理？

**🏢 高频公司**：MiniMax、字节 AI 推理、腾讯混元

**题目解析**：
推理加速是 LLM 落地的核心工程问题，MiniMax 等自研模型公司必问。

**题目讲解**：
**自回归推理的瓶颈**：
LLM 生成每个 token 都需要完整的大模型前向传播，GPU 利用率低（每次只生成1个 token，计算量小但内存带宽占满）——实际上受 Memory-Bound 而非 Compute-Bound 限制。

**Speculative Decoding（推测解码）**：
1. **Draft 阶段**：用一个小模型（draft model）快速连续生成 K 个候选 token（如 K=4）
2. **Verify 阶段**：用大模型（target model）一次前向传播，并行验证这 K 个 token 是否与大模型一致
3. **接受/拒绝**：大模型按概率接受或拒绝每个 draft token，拒绝后从该位置重新由大模型生成
4. **加速原理**：大模型一次前向传播可以验证 K 个 token，而非每次只生成 1 个

**关键特性**：
- **输出分布不变**：通过概率拒绝采样，最终输出与不用 speculative decoding 的大模型完全等价（不牺牲质量）
- **加速倍数**：取决于 draft model 的命中率，通常 2-3x 加速
- **硬件要求**：大小模型都要加载进 GPU，内存占用增加

**变体**：
- **Self-Speculative（自推测）**：用大模型的早期层做 draft（不需要额外小模型）
- **Medusa**：在大模型上加多个"推测头"，并行预测未来多个 token
- **EAGLE**：用轻量 draft 头，精度更高的推测

**考察点**：
1. Speculative Decoding 的等价性证明（为什么输出分布不变）
2. draft model 选择标准（需要和 target model 同类，分布接近）
3. 在 vLLM/TGI 等框架中的集成

**示例答案**：
LLM 推理的瓶颈是 Memory-Bandwidth，不是算力——每个 token 生成都需要从 GPU HBM 加载几十 GB 的模型权重，但实际计算量很小，导致 GPU 算力大量闲置。Speculative Decoding 利用这个空闲算力：先用小模型快速批量生成 K 个候选 token，再让大模型一次性并行验证——由于大模型一次前向传播的成本和生成 1 个 token 差不多（KV Cache 写入是瓶颈），验证 K 个 token 的边际成本很低，只要有几个 token 被接受就等于加速了。关键保证是"接受-拒绝采样"方案使输出分布与原始大模型完全一致，不是近似。实际中 draft model 一般用对应系列的小版本（如 70B 用 7B 做 draft），命中率 75%+ 时加速效果显著。vLLM 已支持 Speculative Decoding，配置几行参数即可启用。

---

### Q50: MiniMax 面试：Beam Search 和 Greedy Search 有什么区别？为什么大模型通常不用 Beam Search？

**🏢 高频公司**：MiniMax、字节、阿里

**题目解析**：
解码策略是 LLM 生成质量的关键，面试官考察候选人对不同解码算法的实际理解。

**题目讲解**：
**Greedy Search（贪心搜索）**：
每步选概率最高的 token，快但可能陷入局部最优。

**Beam Search（束搜索）**：
同时维护 K 个候选序列（beam），每步每个序列都展开并选 top-K，整体保留 K 个最高联合概率的序列。

```
Beam Width=2:
Step1: "我"(0.5), "你"(0.3)  → 保留2条
Step2: 
  "我 爱"(0.5×0.6=0.30), "我 想"(0.5×0.3=0.15)
  "你 好"(0.3×0.8=0.24), "你 在"(0.3×0.2=0.06) → 保留top2
最终: "我 爱"(0.30), "你 好"(0.24)
```

**为什么大模型通常不用 Beam Search**：
1. **"神经文本退化"（Neural Text Degeneration）**：Beam Search 倾向于生成高概率但无聊、重复的文本（"the the the..."），实验发现对话/故事类任务表现反直觉地差
2. **计算代价高**：K=4 时需要同时维护 4 个 KV Cache，显存和计算均为 K 倍
3. **不适合开放式生成**：Beam Search 假设"正确答案是唯一的"，适合翻译/摘要；开放式对话没有单一最优序列
4. **Top-P / Temperature 效果更好**：采样方法在对话/创意任务上主观评测更高

**Beam Search 的适用场景**：
- 机器翻译（有参考答案，确定性强）
- 摘要生成（目标明确）
- 语音识别的后处理
- 代码补全（确定性任务，Temperature=0 加 Beam Search 有时更好）

**考察点**：
1. 长度惩罚（Length Penalty）对 Beam Search 的影响
2. Beam Search 与 BLEU 分数的关系
3. 为什么 ChatGPT/Claude 默认用采样而非 Beam Search

**示例答案**：
Beam Search 在序列到序列任务（翻译/摘要）上长期是 SOTA，但在 LLM 的开放对话生成上效果反而不好。根本原因是"神经文本退化"——最高联合概率的序列往往充满了高频重复词，因为语言模型给常见词更高概率，Beam Search 就不断强化这种倾向，生成"无聊但安全"的文本。而 Top-P 采样从概率分布里随机采样，允许低概率但有创意的词出现，生成的文本更自然、多样。计算上，Beam Width=4 需要 4 倍的 KV Cache，在长对话场景下显存压力大。现在大模型推理通常 Temperature≈0.7 + Top-P=0.9，对于需要确定性输出（代码生成、JSON 提取）则 Temperature=0 退化为 Greedy Search，两者结合满足不同场景。

---

