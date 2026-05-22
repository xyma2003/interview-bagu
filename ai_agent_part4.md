# AI Agent 面试八股 · 第四篇

---

### Q73: 什么是 Prompt 压缩（Prompt Compression）？LLMLingua 的原理是什么？

**🏢 高频公司**：字节、MiniMax

**题目讲解**：
**问题背景**：RAG 检索到的文档冗余内容多，直接注入 context 浪费 token，增加成本和延迟。

**LLMLingua 原理**：
用一个轻量小模型（GPT-2 级别）计算每个 token 的条件概率（困惑度，PPL）：
- **低 PPL token**：上下文已能预测，信息冗余（如"的"、"了"、连接词），可以删除
- **高 PPL token**：出乎意料，携带关键信息，必须保留

```python
from llmlingua import PromptCompressor

compressor = PromptCompressor(model_name="microsoft/llmlingua-2-bert-base")
result = compressor.compress_prompt(
    context,
    rate=0.5,              # 压缩到原始长度的 50%
    force_tokens=['\n'],   # 强制保留换行符
)
print(f"压缩率: {result['ratio']:.1f}x，压缩后 token: {result['compressed_tokens']}")
```

**效果**：
- 无损压缩 2-5x，下游 LLM 准确率几乎不变
- 对于 RAG 的长文档 context，压缩 3x 后延迟和成本同步降低
- LLMLingua-2 用 BERT 级别模型，压缩速度更快

**应用场景**：
- RAG 检索到 10 个文档，每个压缩到 30% 注入主模型
- Long-context 总结：先压缩再输入，节省 Prefill 时间
- 对话历史：早期对话压缩保留，减少历史 token 开销

**考察点**：
1. PPL（困惑度）与信息量的关系
2. 有损压缩 vs 无损压缩的权衡
3. 与摘要压缩的区别（LLMLingua 保留原始 token，摘要重写）

**示例答案**：
LLMLingua 的核心洞察是：语言模型能预测的内容是信息冗余的，预测不到的才是关键信息。用一个轻量模型逐 token 计算 PPL，低 PPL 的 token（助词、连词、重复描述）删除，高 PPL 的（数字、专有名词、关键动词）保留，达到 2-5x 的压缩率且下游任务准确率几乎不变。在 RAG 系统里，将检索到的长文档先压缩再注入，既保留了关键信息，又大幅降低了输入 token 数，同时缩短模型的 prefill 阶段时间。与 LLM 摘要压缩（重写）相比，LLMLingua 更快（轻量模型 vs 大模型），且不引入幻觉（只删除，不改写）。

---

