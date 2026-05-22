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

### Q74: 什么是 LLM 模型路由（Model Routing）？如何设计动态路由系统？

**🏢 高频公司**：阿里、字节、小红书

**题目讲解**：
**问题**：不同任务对模型能力要求不同，用大模型处理简单任务浪费成本，用小模型处理复杂任务效果差。

**模型路由方案**：

**方案一：规则路由（最简单）**：
```python
def route_model(task_type: str, content_length: int) -> str:
    if task_type == "simple_qa" and content_length < 200:
        return "claude-haiku-4-5"     # $0.25/M tokens
    elif task_type == "code_generation":
        return "claude-sonnet-4-6"    # $3/M tokens
    else:
        return "claude-opus-4-6"      # $15/M tokens
```

**方案二：分类器路由（推荐）**：
```python
# 用轻量模型（或 embedding 分类器）预测任务复杂度
classifier_prompt = """
判断以下任务的复杂度：
任务: {query}
输出: "simple" / "medium" / "complex"，只输出一个词
"""
complexity = fast_llm.generate(classifier_prompt.format(query=query))
model_map = {"simple": "haiku", "medium": "sonnet", "complex": "opus"}
return model_map[complexity.strip()]
```

**方案三：RouteLLM（开源）**：
- 训练一个小型二分类器，判断是否需要强模型
- 在 GPT-4 级别准确率下，节省 50-80% 成本

**路由维度**：
- 任务类型（分类/摘要/代码/推理/创意）
- 上下文长度
- 输出要求（JSON/开放式）
- 历史任务的成功率

**成本效益**：
| 场景 | 纯大模型 | 路由后 |
|------|---------|--------|
| 简单 FAQ | $15/M | $0.25/M（-98%）|
| 混合业务 | $15/M | $3/M（-80%）|

**考察点**：
1. 路由准确率 vs 成本节省的权衡
2. 路由决策本身的成本（分类器推理也要时间）
3. 降级策略（小模型失败时 fallback 大模型）

**示例答案**：
模型路由是 LLM 成本优化的最大杠杆。核心思路是"用合适的模型做合适的事"——简单分类、关键词提取用 claude-haiku（$0.25/M），复杂推理、代码生成用 claude-opus（$15/M），差 60 倍成本。路由实现从简单到复杂：规则路由（按任务类型硬编码）速度快但覆盖率低；小模型分类器（用 haiku 本身做 2-3 token 的复杂度判断，成本极低）更通用；RouteLLM 等专门训练的路由器准确率最高。关键设计是确保路由决策成本远低于路由收益（分类一次花 $0.001，节省 $0.01 就是 10x ROI）。我们生产中用了 haiku 做一次分类（输出 simple/complex 两个 token），复杂任务走 opus，整体成本降低了 75%，质量没有明显下降。

---

### Q75: 如何实现 Agent 的流式输出（Streaming）并转发给前端？完整实现链路是什么？

**🏢 高频公司**：字节、腾讯、小红书

**题目讲解**：
**完整链路**：
```
Anthropic API (stream) → FastAPI (SSE) → 前端 (EventSource)
```

**后端实现（FastAPI + SSE）**：
```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import anthropic
import json

app = FastAPI()
client = anthropic.Anthropic()

@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    async def generate():
        with client.messages.stream(
            model="claude-opus-4-6",
            max_tokens=2048,
            messages=[{"role": "user", "content": request.message}]
        ) as stream:
            for text in stream.text_stream:
                # SSE 格式：data: {json}\n\n
                yield f"data: {json.dumps({'delta': text})}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # 禁用 Nginx 缓冲
        }
    )
```

**前端消费（React）**：
```javascript
const streamChat = async (message: string, onToken: (text: string) => void) => {
  const response = await fetch('/chat/stream', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ message }),
  })
  
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
    for (const line of lines) {
      const data = line.replace('data: ', '')
      if (data === '[DONE]') return
      const { delta } = JSON.parse(data)
      onToken(delta)
    }
  }
}
```

**LangGraph 流式**（含工具调用事件）：
```python
async for event in graph.astream_events(input, version="v2"):
    if event["event"] == "on_chat_model_stream":
        chunk = event["data"]["chunk"]
        if chunk.content:
            yield f"data: {chunk.content}\n\n"
    elif event["event"] == "on_tool_start":
        yield f"data: {json.dumps({'tool': event['name']})}\n\n"
```

**工程注意点**：
- Nginx 需要设置 `proxy_buffering off` 或 `X-Accel-Buffering: no`
- 用户取消请求时后端需要检测 disconnect 并取消 LLM 调用（节省 API 费用）
- 工具调用期间没有流式文本，前端要显示"思考中..."占位

**考察点**：
1. SSE 协议格式（`data: xxx\n\n`）
2. Nginx 缓冲禁用（否则 SSE 会等缓冲区满才发送）
3. 用户断开连接时的 cancel 处理

---

