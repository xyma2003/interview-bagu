# AI Agent 开发面试八股题库

> 覆盖：LLM基础 / Prompt Engineering / RAG / Agent框架 / 多智能体 / 记忆系统 / Tool Use / 流式输出 / 评估 / 成本优化 / 安全

---

## 一、LLM 基础

### Q1: 请解释 Transformer 的核心架构，以及 Self-Attention 的计算过程

**题目解析**：这是 LLM 领域最基础的原理题，几乎所有涉及 AI 方向的岗位都会问到。考察候选人对大模型底层机制的理解深度。

**题目讲解**：
Transformer 由 Encoder 和 Decoder 两部分构成（GPT 系列只使用 Decoder）。核心机制是 Multi-Head Self-Attention：
- **输入处理**：Token 经过 Embedding + Positional Encoding 得到向量表示
- **Self-Attention 计算**：对每个 token，通过三个权重矩阵 Wq、Wk、Wv 生成 Query、Key、Value
- **Attention Score**：`Attention(Q,K,V) = softmax(QKᵀ / √d_k) · V`，其中 √d_k 是缩放因子，防止点积过大导致梯度消失
- **Multi-Head**：多组独立的 Q/K/V 并行计算，拼接后投影，捕获不同子空间的语义关系
- **前馈网络**：每个位置独立经过两层全连接 + 激活函数
- **残差连接 + LayerNorm**：保证梯度流动、训练稳定

**考察点**：
1. Self-Attention 的 QKV 计算公式及缩放原因
2. Multi-Head 的意义（多视角特征）
3. 位置编码的必要性（Attention 本身无位置感知）
4. Encoder-only / Decoder-only / Encoder-Decoder 的适用场景

**面试官更想听**：
能说出缩放因子 √d_k 的数学原因（维度增大时点积方差增大，softmax 趋于 one-hot，梯度消失），以及 GPT 使用 Causal Mask 保证自回归特性的原因。

**示例答案**：
Transformer 的核心是 Multi-Head Self-Attention。对于每个 token，模型学习三个投影矩阵将输入映射为 Query、Key、Value 三个向量。Attention score 通过 Q 和 K 的点积计算，除以 √d_k 进行缩放（防止高维下点积过大导致 softmax 梯度消失），再通过 softmax 归一化，最后与 V 加权求和，得到每个 token 融合了全局上下文的新表示。Multi-Head 将这个过程并行化为多组独立的注意力头，每组学习不同的语义关系，最后拼接投影。GPT 系列是纯 Decoder 结构，通过 Causal Mask 只允许 token 关注自身及之前位置，保证自回归生成的合法性。位置编码（Sinusoidal 或 RoPE 等）弥补了 Attention 本身对位置无感知的不足。

---

### Q2: LLM 的温度参数（Temperature）和 Top-P 采样有什么区别？如何选择？

**题目解析**：在生产环境中，控制 LLM 输出的随机性和质量是核心工程问题，这道题考察候选人对推理参数的工程理解。

**题目讲解**：
- **Temperature**：对 logits 做缩放，`logits_scaled = logits / T`。T→0 趋于贪心（最高概率），T→∞ 趋于均匀分布。T<1 压低分布（更确定），T>1 拉平分布（更随机）
- **Top-P（核采样）**：从累积概率达到 P 的最小候选集中采样，动态调整候选词数量。候选词质量好时集合小，分布平坦时集合大
- **Top-K**：固定取概率最高的 K 个词采样，比 Top-P 更简单但不自适应
- **组合使用**：通常先用 Temperature 缩放 logits，再用 Top-P 截断候选集

实践选择：
- 代码生成/事实问答：T=0 或 T<0.3，高确定性
- 创意写作：T=0.7-1.0，增加多样性
- RAG 检索答案：T=0 防止幻觉
- 对话系统：T=0.5-0.7 平衡

**考察点**：
1. Temperature 对 softmax 分布的数学影响
2. Top-P 自适应候选集的优势
3. 不同场景的参数选择经验

**面试官更想听**：
能结合实际项目说明参数选择，比如"在 RAG 问答中我们将 temperature 固定为 0 来降低幻觉，但在用户闲聊模块中设置 0.7 提升回答多样性"。

**示例答案**：
Temperature 控制的是输出分布的"尖锐程度"。数学上它除以 logits，再做 softmax——T 越小，分布越集中于最高概率词；T=0 退化为 argmax 贪心。Top-P 是核采样，动态选取累积概率达到 P 的最小候选集再采样，当模型对某个词很确信时集合可能只有 1-2 个词，不确定时才扩展，比固定 Top-K 更自适应。实际工程中二者通常配合使用。在我负责的 AI 点餐系统中，菜品推荐的结构化输出用 T=0 保证 JSON 格式正确率；闲聊回复用 T=0.7 避免机械感。T 和 Top-P 不建议同时调很大，容易出现乱码或话题漂移。

---

### Q3: 什么是 KV Cache？它在推理中如何节省计算？

**题目解析**：KV Cache 是 LLM 推理优化的核心机制，理解它是写高性能 Agent 服务的基础。

**题目讲解**：
在自回归生成中，每生成一个新 token，模型需要对整个序列重新计算 Attention。KV Cache 通过缓存历史 token 的 Key 和 Value 矩阵避免重复计算：
- **原理**：对于已经处理过的 prefix，其 K 和 V 矩阵不变，只有新 token 需要计算新的 K/V 并追加
- **内存代价**：每层每个 token 需要缓存 2（K+V）× head_num × d_head 个浮点数；对长序列内存占用大
- **Prompt Cache（Claude/GPT 等）**：将常用 system prompt 的 KV Cache 持久化，多次请求复用，降低 TTFT（Time To First Token）和费用
- **PagedAttention（vLLM）**：用类似操作系统虚拟内存的分页机制管理 KV Cache，支持更高并发

**考察点**：
1. KV Cache 复用的原理和内存开销
2. Prompt Caching 在 API 调用层面的工程价值
3. 与批推理（batching）的配合

**面试官更想听**：
说出 Prompt Caching 的实际收益（Claude API 缓存命中可节省 90% token 费用），以及如何在项目中利用它（固定 system prompt 放最前，减少 prefix 变化）。

**示例答案**：
KV Cache 解决的是自回归生成的重复计算问题。在生成第 N 个 token 时，前 N-1 个 token 的 Key/Value 矩阵已经在上一步算过了，只需要缓存下来，新步骤只计算当前 token 的 Q 与缓存 K/V 做 attention 即可，推理时间从 O(N²) 降为 O(N)。内存代价是随序列长度线性增长，128K 上下文窗口会占用几十 GB GPU 显存，这是当前长上下文推理的主要瓶颈。Anthropic 提供的 Prompt Caching 功能允许将固定 system prompt 的 KV Cache 服务端复用，命中时 token 费用降低 90%，TTFT 也大幅缩短。在我的项目里，我将几千字的知识库 system prompt 固定在消息最前面，通过 cache_control 标记启用缓存，每次对话只有新增的用户消息需要全量计算，显著降低了延迟和成本。

---

### Q4: 解释 LLM 的幻觉（Hallucination）产生原因，以及工程层面的缓解手段

**题目解析**：幻觉是 LLM 在生产应用中最核心的挑战，AI Agent 岗位必考。

**题目讲解**：
**产生原因**：
- 训练数据中存在错误、过时或矛盾信息，模型无法区分
- 自回归生成只优化局部概率，不保证全局事实一致性
- 知识截止日期之后的信息缺失
- 过度拟合训练集的语言模式而非事实
- 模糊问题下模型倾向"合理化补全"

**工程缓解手段**：
1. **RAG**：检索外部知识库，让模型基于真实来源回答，约束其不凭空生成
2. **低 Temperature**：减少随机性，让模型更倾向高概率词（更贴近训练事实）
3. **Structured Output**：强制 JSON 输出减少自由发挥空间
4. **Self-Consistency**：多次采样对比，投票选取一致答案
5. **Grounding 验证**：对模型输出做后处理，引用溯源检查
6. **模型选择**：使用支持 tool use 的模型，让模型调用搜索而非依赖记忆

**考察点**：
1. 幻觉的多种根本原因
2. RAG 的防幻觉机制
3. 生产中的 Guardrail 设计

**面试官更想听**：
有具体实践经验，比如在 RAG 系统里加了什么样的 citation 验证、如何检测模型在 context 不足时"编造引用"。

**示例答案**：
幻觉本质上来自自回归语言模型的训练目标——它优化的是"下一个 token 的条件概率"，而非"回答是否事实正确"。当训练数据存在错误或问题超出知识边界时，模型会基于语言模式"合理补全"，生成听起来合理但实际错误的内容。工程层面，最有效的手段是 RAG：在生成前检索与问题相关的文档片段注入 context，并在 system prompt 中明确要求"只基于提供的文档回答，无法回答时说不知道"。其次是低 temperature（减少随机性）和结构化输出（约束格式减少自由发挥）。更严格的场景可以加 self-consistency 多次采样投票，或在输出后做 grounding check——提取模型的引用声明，回到原文验证是否真实存在。监控层面我们会追踪"无来源回答率"作为幻觉率的代理指标。

---

### Q5: 解释 Tokenization 的原理，BPE 算法如何工作？为什么 LLM 对中文的处理效率低于英文？

**题目解析**：Tokenization 影响 token 消耗和模型能力，理解它有助于优化 prompt 和成本。

**题目讲解**：
**BPE（Byte Pair Encoding）**：
1. 初始化：每个字符作为一个 token
2. 统计相邻 token 对的出现频率
3. 合并频率最高的 pair 为新 token，加入词表
4. 重复直到词表达到预设大小

**为何中文效率低**：
- 英文词汇由 26 个字母组合，高频词（"the"/"is"等）在 BPE 后直接成为单 token
- 中文每个汉字都是独立字符，BPE 通常以单字或少量字组为 token，1个中文字符≈1-2 token，而1个英文单词≈1 token
- 同等语义的中文 prompt 消耗 token 更多，实际上中文的 token 利用率更低
- Claude/GPT-4 等对中文做了优化（如 tiktoken 里中文常见字合并），但差距仍存在

**考察点**：
1. BPE 训练过程
2. 中英文 token 消耗差异的原因
3. 对实际 API 成本的影响

**示例答案**：
BPE 从字符级别出发，反复合并语料中出现频率最高的相邻 token 对，直至词表大小达标。训练结束后，高频英文词如 "the"、"ing" 都有对应的单 token，而罕见词会被拆分。中文因为字符数量庞大（常用汉字就有几千个），BPE 训练后大多数汉字仍是独立 token，很少出现多字合并，导致相同信息量的中文 prompt 消耗的 token 数约是英文的 1.5-2 倍。这直接影响 API 调用成本和上下文窗口利用率。工程上可以通过更精简的中文表达、适当使用英文关键词、以及结构化输入（表格/JSON替代长文本）来降低 token 消耗。

---

## 二、Prompt Engineering

---

