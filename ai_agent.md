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

