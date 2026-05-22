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

### Q76: 什么是对话历史管理策略？如何防止 Context Window 溢出？

**🏢 高频公司**：字节、阿里

**题目讲解**：
**问题**：多轮对话中消息历史不断增长，最终超过 context window 上限。

**策略一：滑动窗口（简单）**：
```python
def trim_messages(messages: list, max_tokens: int = 100000) -> list:
    import tiktoken
    enc = tiktoken.get_encoding("cl100k_base")
    
    total = 0
    trimmed = []
    for msg in reversed(messages):
        tokens = len(enc.encode(msg["content"]))
        if total + tokens > max_tokens:
            break
        trimmed.insert(0, msg)
        total += tokens
    return trimmed
```
- 简单直接，丢失早期对话
- 适合短期任务

**策略二：摘要压缩（推荐）**：
```python
async def compress_history(messages: list, keep_recent: int = 10) -> list:
    if len(messages) <= keep_recent:
        return messages
    
    old_messages = messages[:-keep_recent]
    recent_messages = messages[-keep_recent:]
    
    # 用 LLM 摘要早期对话
    summary_prompt = f"请用 200 字以内总结以下对话的关键信息：\n{format_messages(old_messages)}"
    summary = await llm.generate(summary_prompt)
    
    system_summary = {
        "role": "system",
        "content": f"[对话摘要]\n{summary}"
    }
    return [system_summary] + recent_messages
```

**策略三：记忆提取（适合长期对话）**：
- 每 N 轮提取关键事实存入记忆库
- 下次对话按需检索注入，而非保留完整历史

**混合策略（生产推荐）**：
```python
def manage_context(messages, system_prompt, max_tokens=180000):
    # 1. 系统提示 + 最近 20 条：直接保留
    # 2. 20-100 条：用 LLM 摘要
    # 3. 100 条以前：提取为记忆，按需检索
    ...
```

**考察点**：
1. 摘要压缩的时机（异步 vs 同步）
2. 摘要质量对后续对话的影响
3. 不同场景的最优策略

**示例答案**：
Context Window 管理是多轮 Agent 的必要工程。滑动窗口最简单但丢失信息；摘要压缩更智能，把早期对话用 LLM 浓缩成 200-500 字的摘要置于系统提示前，保留近期完整对话——实测早期对话的"关键信息保留率"约 80%，而 token 节省 70%+。实现上摘要要异步触发（不阻塞用户响应），可以在每次对话结束后异步压缩一次。Claude 200K context 虽然很长，但每次都传完整历史成本极高，且 Lost in the Middle 问题对长历史尤为显著，主动管理 context 既省钱又提升质量。

---

### Q77: 什么是 Constitutional AI（CAI）？Claude 的安全机制与 ChatGPT 有何不同？

**🏢 高频公司**：MiniMax、字节

**题目讲解**：
**RLHF 的问题**：依赖大量人工偏好标注，标注者的偏见会被放大，且人工审核难以覆盖所有安全场景。

**Constitutional AI（Anthropic）**：
1. **预设"宪法"（Constitution）**：一组价值原则（无害性、诚实性、有益性 + HHH 框架）
2. **SL-CAI**：让模型用宪法批判自己的输出并修改，生成监督学习数据
3. **RL-CAI**：用 AI 反馈（而非人工反馈）训练奖励模型（RLAIF），再用 PPO 优化

```
初始输出 → AI 自我批判（依据宪法） → AI 修订输出
→ 多次迭代 → 生成偏好对 (y_w, y_l)
→ 奖励模型训练 → PPO 强化学习
```

**与 ChatGPT RLHF 的对比**：
| | Claude (CAI) | ChatGPT (RLHF) |
|---|---|---|
| 反馈来源 | AI + 宪法原则 | 人工标注 |
| 人工成本 | 低（只需制定宪法）| 高（大量偏好标注）|
| 一致性 | 高（宪法固定）| 受标注者偏见影响 |
| 可解释性 | 高（原则透明）| 较低 |
| 覆盖范围 | 广（AI 可大量生成）| 受人工标注量限制 |

**HHH 框架**（Claude 的核心原则）：
- **Helpful**：真正帮助用户
- **Harmless**：避免造成伤害
- **Honest**：诚实表达，承认不确定性

**考察点**：
1. CAI 如何减少对人工标注的依赖
2. "宪法"的具体内容（无害性、诚实性、有益性的层级关系）
3. RLAIF 与 RLHF 的本质区别

**示例答案**：
Constitutional AI 是 Anthropic 减少人工标注依赖的关键创新。传统 RLHF 需要大量人工偏好标注（A 比 B 好）来训练奖励模型，成本高且受标注者偏见影响。CAI 改为用一套明确的"宪法"原则让 AI 自我审查和修改：先生成一个回答，再让 AI 用宪法条款批判它（"这个回答是否有害？如何修改？"），修改后的版本质量更高，这对 (原版, 修改版) 就是偏好数据，训练奖励模型时无需人工逐对标注。RLAIF 用强大的 AI 模型代替人工判断偏好，能覆盖更多边界情况，且宪法原则是明确可解释的，Claude 的安全行为有迹可循，而不是黑盒的人工偏好学习结果。

---

### Q78: Agent 如何处理长时间运行的任务（Long-Running Tasks）？

**🏢 高频公司**：腾讯、字节

**题目讲解**：
**问题场景**：任务需要 5-30 分钟（如：分析 10 万行数据、爬取并汇总 100 个网页、生成完整报告），不能让用户等待 HTTP 请求超时。

**异步任务架构**：
```python
# 1. 提交任务，立即返回 task_id
@app.post("/tasks")
async def submit_task(request: TaskRequest) -> dict:
    task_id = str(uuid.uuid4())
    await task_queue.enqueue(task_id, request.dict())
    return {"task_id": task_id, "status": "pending"}

# 2. Worker 异步执行（独立进程）
async def worker():
    while True:
        task_id, task_data = await task_queue.dequeue()
        await update_status(task_id, "running")
        try:
            result = await run_agent(task_data)
            await update_status(task_id, "completed", result=result)
        except Exception as e:
            await update_status(task_id, "failed", error=str(e))

# 3. 客户端轮询或 WebSocket 订阅
@app.get("/tasks/{task_id}")
async def get_task_status(task_id: str) -> dict:
    return await task_db.get(task_id)
```

**进度上报**：
```python
# LangGraph 中间件，每步上报进度
async def on_node_complete(node_name: str, step: int, total: int):
    progress = step / total
    await redis.publish(f"task:{task_id}:progress", 
                        json.dumps({"step": node_name, "progress": progress}))
```

**中断与恢复**：
- LangGraph Checkpointer 保存每步状态，服务重启不丢失
- 支持暂停（用户发送 pause 命令）和恢复

**超时与清理**：
- 任务设置最大执行时间（如 30 分钟）
- 超时后标记为 failed，释放资源

**考察点**：
1. 任务队列选型（Redis Stream / Celery / Kafka）
2. 进度推送（WebSocket / SSE / 轮询）
3. 任务幂等（重试时不重复执行已完成步骤）

**示例答案**：
长时间任务必须用异步架构解耦请求和执行。用户提交任务后立刻拿到 task_id，Worker 独立执行（Celery + Redis 或自建 worker pool），执行过程中通过 Redis Pub/Sub 推送进度，前端 SSE 订阅进度更新。LangGraph 的 Checkpointer 机制让每步状态持久化，Worker 崩溃重启后从上次成功节点恢复，不重跑已完成步骤。任务超时设 30 分钟 TTL，到期后 kill 并标记 failed，同时通知用户"任务超时，请拆分为更小的任务重试"。生产中用 Celery + Redis 实现最成熟，支持优先级队列、定时重试、任务撤销，是 Python 生态的事实标准。

---

### Q79: 如何设计 LLM 应用的 Prompt 版本管理系统？

**🏢 高频公司**：小红书、阿里

**题目讲解**：

**问题**：Prompt 频繁修改，缺乏版本控制和 A/B 测试，无法追溯哪个版本导致了效果变化。

**版本管理系统设计**：
```python
# 数据模型
class PromptVersion(BaseModel):
    prompt_id: str          # "user_greeting"
    version: int            # 1, 2, 3...
    content: str            # 完整 prompt 文本
    created_by: str
    created_at: datetime
    metrics: dict           # 上线后的效果指标（满意率/延迟/成本）
    status: str             # draft/testing/active/archived

# 使用方式
class PromptManager:
    def get_prompt(self, prompt_id: str, version: str = "active") -> str:
        if version == "active":
            return self.db.get_active(prompt_id)
        elif version == "canary":
            # 10% 流量走 canary 版本
            if random.random() < 0.1:
                return self.db.get_canary(prompt_id)
        return self.db.get_active(prompt_id)
    
    def promote(self, prompt_id: str, version: int):
        """将指定版本设为 active"""
        old = self.db.get_active(prompt_id)
        self.db.set_archived(prompt_id, old.version)
        self.db.set_active(prompt_id, version)
```

**最佳实践**：
1. **GitOps**：Prompt 存在 Git 仓库（.prompt 文件），Code Review 才能修改，CI/CD 自动部署
2. **分环境**：dev/staging/production 各自独立的 prompt 版本
3. **金丝雀发布**：新版本先对 5-10% 流量生效，指标正常后全量
4. **自动回滚**：满意度下降超过阈值自动回滚到上一版本
5. **Prompt 注册表**：集中管理，避免 prompt 散落在各个代码文件里

**工具**：
- **LangSmith Prompt Hub**：云端 prompt 管理，带版本控制
- **Langfuse**：开源，支持 prompt 版本和效果追踪
- **自建 Git + 数据库**：最灵活，完全可控

**考察点**：
1. Prompt 变更的审批流程（类比代码 Code Review）
2. A/B 测试的统计显著性判断
3. Prompt 注入 vs 硬编码的维护成本

**示例答案**：
Prompt 版本管理和代码版本管理同等重要——一个错误的 prompt 上线可能导致产品大规模质量下降。最低限度要做的是：Prompt 单独存文件（不硬编码在代码里），提交到 Git，修改需要 Review 和测试。进阶方案是建 Prompt Registry 服务：每条 prompt 有 ID 和版本号，active/canary/archived 三种状态，线上代码通过 prompt_id 查询，不涉及代码改动就能更新 prompt。新版本先做金丝雀（5% 流量），监控满意度和成本指标，稳定后全量，异常时一键回滚。LangSmith Prompt Hub 或 Langfuse 都提供现成的 UI，中小团队直接用更省事。

---

### Q80: 如何评估一个 AI Agent 的自主性（Autonomy Level）？该如何根据风险选择自主程度？

**🏢 高频公司**：字节、MiniMax

**题目讲解**：
**自主性等级（参考自动驾驶分级）**：

| Level | 描述 | 适用场景 |
|-------|------|---------|
| L0 | 每步都需人工确认 | 金融交易、法律文书 |
| L1 | 低风险操作自动执行，高风险人工确认 | 企业工作流 |
| L2 | 人工设置规则和边界，Agent 在范围内自主 | 客服、内容生成 |
| L3 | Agent 自主完成任务，人工只做最终审核 | 代码生成、数据分析 |
| L4 | 完全自主，仅在异常时通知 | 监控巡检、定时报告 |

**风险评估矩阵**：
```python
def assess_autonomy_level(action: str) -> int:
    risk_factors = {
        "reversible": action in REVERSIBLE_ACTIONS,   # 可撤销
        "impact_scope": get_impact_scope(action),      # 影响范围
        "cost": estimate_cost(action),                 # 费用
        "data_sensitivity": check_sensitivity(action), # 数据敏感性
    }
    
    if not risk_factors["reversible"] or risk_factors["cost"] > 100:
        return 0  # 必须人工确认
    elif risk_factors["impact_scope"] == "single_user":
        return 3  # 可以自主执行
    else:
        return 1  # 需要人工确认
```

**实践原则**：
1. **最小权限**：Agent 只请求完成任务所必要的权限
2. **渐进授权**：先在沙盒环境测试，再逐步扩大权限
3. **审计日志**：所有操作记录，支持事后审查
4. **硬性边界**：某些操作无论何种情况都不自动执行（如删除生产数据）

**考察点**：
1. 自主性 vs 可靠性 vs 速度的三角取舍
2. 不可逆操作的特殊处理
3. 自主性等级与用户信任度的关系

**示例答案**：
Agent 自主性不是越高越好，要根据操作风险动态调整。核心判断维度是：操作是否可逆（发邮件不可逆 vs 生成草稿可逆）、影响范围（单用户 vs 全系统）、资金成本（$1 查询 vs $1000 采购）。我用"风险矩阵"决定自主级别：只读操作（查询/分析）完全自主；低成本可逆写操作（创建草稿/发送内部消息）L2-L3 级自主；高风险不可逆操作（发布内容/资金操作/删除数据）强制 HITL 确认。在 LangGraph 里用 interrupt() 实现动态 HITL：Agent 在执行前调用风险评估函数，高于阈值则暂停等待用户确认，低于阈值则自动继续。用户可以通过配置自己的风险偏好调整阈值，实现个性化的自主性管理。

---

