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

