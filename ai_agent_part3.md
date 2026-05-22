# AI Agent 面试八股 · 第三篇

> 覆盖：Agent 工程模式 / 多模态 / LLM 推理优化 / 工具生态 / 实战设计题

---

### Q63: 什么是 Structured Output（结构化输出）？如何保证 LLM 输出严格符合 JSON Schema？

**🏢 高频公司**：字节、阿里、小红书

**题目解析**：
LLM 生成非结构化文本，工程上需要解析成结构化数据，如何可靠地做到这点是生产级 AI 应用的核心问题。

**题目讲解**：

**方法一：Prompt 约束（不可靠）**：
在 prompt 里写"请以 JSON 格式输出"，模型有时会输出带 markdown 代码块的 JSON，有时格式不对，需要后处理，可靠性差。

**方法二：Function Calling / Tool Use（推荐）**：
让模型调用一个"虚拟工具"，工具定义即 JSON Schema，模型输出的工具调用参数天然符合 schema：
```python
tools = [{
    "name": "extract_info",
    "description": "提取用户信息",
    "input_schema": {
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "age":  {"type": "integer"},
            "city": {"type": "string"}
        },
        "required": ["name", "age"]
    }
}]
response = client.messages.create(model=..., tools=tools, ...)
# response.content[0].input 直接是符合 schema 的 dict
```

**方法三：constrained decoding（推理层约束）**：
- Outlines、Guidance、lm-format-enforcer 等库在 token 采样层面约束，只允许生成符合 grammar 的 token
- 100% 可靠，代价是推理速度略有下降
- vLLM 原生支持 `guided_json`

**方法四：Instructor / Pydantic 集成**：
```python
from pydantic import BaseModel
import instructor
client = instructor.from_anthropic(anthropic.Anthropic())

class UserInfo(BaseModel):
    name: str
    age: int
    city: str

user = client.messages.create(
    model="claude-opus-4-6",
    response_model=UserInfo,
    messages=[{"role": "user", "content": "我叫张三，28岁，住在北京"}]
)
# user 直接是 UserInfo 实例
```

**考察点**：
1. Function Calling 为什么比 prompt 约束更可靠
2. Constrained decoding 的实现原理（有限状态机 + token mask）
3. Instructor 库的内部实现（多次重试 + 错误反馈）

**示例答案**：
生产中最可靠的结构化输出方案是 Function Calling：定义工具的 JSON Schema，让模型调用工具，输出的参数天然满足 schema，API 层面就做了约束，不需要额外解析。对于需要 100% 格式保证的场景，constrained decoding 是终极方案，在 token 采样阶段用有限状态机过滤不合法的 token，但需要推理框架支持（vLLM 的 guided_json）。Instructor 是工程上很好用的封装，用 Pydantic 定义返回类型，自动处理格式错误重试，几行代码就能获得类型安全的 LLM 输出。

---

### Q64: 什么是 LLM 的 Tool Use 并行调用（Parallel Tool Use）？如何利用它提升 Agent 速度？

**🏢 高频公司**：字节、腾讯、MiniMax

**题目讲解**：
部分 LLM（Claude 3+、GPT-4 Turbo）支持在一次回复中输出多个工具调用请求，客户端并行执行后一起返回，大幅降低多步骤 Agent 的延迟。

**工作流对比**：
```
串行：
query → LLM → call tool_A → LLM → call tool_B → LLM → answer
延迟：3次LLM调用 + 2次工具调用

并行：
query → LLM → [call tool_A, call tool_B 同时] → LLM → answer
延迟：2次LLM调用 + 1次（并行）工具调用
```

**实现**：
```python
# Claude 可以在一次 response 里输出多个 tool_use block
response = client.messages.create(...)
tool_calls = [b for b in response.content if b.type == "tool_use"]

# 并行执行
import asyncio
results = await asyncio.gather(*[
    execute_tool(tc.name, tc.input) for tc in tool_calls
])

# 将所有结果一起返回
tool_results = [
    {"type": "tool_result", "tool_use_id": tc.id, "content": str(r)}
    for tc, r in zip(tool_calls, results)
]
```

**设计原则**：
- 独立的信息查询（查天气 + 查股价 + 查新闻）适合并行
- 有依赖的操作（查用户信息 → 基于结果查订单）必须串行
- Agent 框架设计时，工具描述里说明依赖关系，让模型自己决定是否并行

**考察点**：
1. 哪些工具可以并行（独立性判断）
2. 并行调用的错误处理（部分失败时的处理）
3. 在 LangGraph 中实现并行工具节点

**示例答案**：
Parallel Tool Use 是 Agent 性能优化的重要手段。Claude 可以一次回复输出多个 tool_use block，客户端用 asyncio.gather 并发执行，再将所有结果组成 tool_results 列表一起送回。这把 N 次独立工具调用的延迟从 O(N × LLM_latency) 压缩到近似 O(2 × LLM_latency)（一次决策 + 一次综合）。在 LangGraph 里可以用 Send API 实现并行节点：把工具调用列表拆分，每个工具调用 Send 到一个并行节点，所有节点完成后汇总到下一个节点。关键判断是哪些调用可以并行——查天气和查股价完全独立，可以并行；但"先查用户余额再决定推荐策略"有数据依赖，必须串行。

---

### Q65: 解释 LLM 的 Context Length vs Knowledge Cutoff 的区别，以及各自的工程应对

**🏢 高频公司**：字节、小红书、阿里

**题目讲解**：

**Context Length（上下文长度）**：
- 当前请求能输入的最大 token 数（当前会话的"工作记忆"）
- 技术上限制：KV Cache 显存、计算复杂度
- 解决方案：RAG（检索相关内容而非全部输入）、摘要压缩、分块处理

**Knowledge Cutoff（知识截止日期）**：
- 模型训练数据的时间截止点，之后发生的事情模型不知道
- 是训练数据的限制，不是推理时的限制
- 解决方案：RAG 接入实时数据、Tool Use（搜索 API）、持续预训练

**两者的工程影响对比**：
| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 模型不知道昨天的新闻 | Knowledge Cutoff | RAG / 搜索工具 |
| 模型忘记对话前面的内容 | Context Length 超限 | 摘要压缩 / 滑动窗口 |
| 模型无法处理 100 页 PDF | Context Length | Chunking + RAG |
| 模型对 2024 年后的事件一无所知 | Knowledge Cutoff | Fine-tuning / RAG |

**实际判断方法**：
- 模型说"我不知道 X"：可能是 Knowledge Cutoff 或 RAG 没覆盖
- 模型忘记之前说过的话：Context Length 问题
- 用 `max_context - current_usage` 监控上下文使用率

**考察点**：
1. 两者的根本区别（训练时 vs 推理时的限制）
2. 如何在 Agent 里检测上下文即将超限（预计算 token 数）
3. 知识截止日期问题的多种解决方案

**示例答案**：
Context Length 是推理时的技术限制（当前请求能看到多少 token），Knowledge Cutoff 是训练时的数据限制（模型知道截止什么时候的信息）。两者的解决方案不同：Context Length 问题用 RAG（只传相关片段）、摘要压缩（压缩历史对话）解决；Knowledge Cutoff 问题用 RAG + 实时搜索工具解决，让模型能查到最新信息。Agent 工程上要同时处理两个：用 tiktoken 实时估算 context 使用量，接近上限时触发摘要；同时给 Agent 配备搜索工具，遇到可能超出训练数据的问题（近期事件、实时数据）主动调用搜索。

---

### Q66: 什么是 Hypothetical Document Embedding（HyDE）？它如何提升 RAG 的召回率？

**🏢 高频公司**：小红书、字节、阿里

**题目讲解**：
**问题背景**：
用户的查询（Query）和数据库里的文档（Document）往往有语义距离：
- 查询："有没有关于量子计算的入门资料？"
- 文档："量子比特是量子计算机的基本单元，利用叠加态..."
- 两者的 embedding 相似度不高，但语义上相关

**HyDE 的思路**：
1. 让 LLM 根据查询生成一个"假设性回答"（Hypothetical Document）
2. 用这个假设性回答的 embedding 去检索，而不是用原始查询
3. 假设性回答的语言风格和文档库更接近，embedding 相似度更高

```python
def hyde_retrieve(query: str, vectorstore, llm_client) -> list:
    # 1. 生成假设性文档
    hypothesis = llm_client.messages.create(
        model="claude-haiku-4-5",
        messages=[{
            "role": "user",
            "content": f"请写一段关于以下问题的简短回答（100字以内）：{query}"
        }]
    ).content[0].text
    
    # 2. 用假设性文档检索
    results = vectorstore.similarity_search(hypothesis, k=5)
    return results
```

**效果与代价**：
- 对"询问式"查询（用户问问题）效果显著，召回率提升 10-20%
- 额外代价：一次 LLM 调用（约 100ms + token 费用）
- 对直接关键词查询效果一般（不如直接搜索）

**变体：多查询扩展（Multi-Query）**：
```python
# 生成 3-5 个查询变体，每个变体独立检索，结果取并集
queries = llm.generate_multiple_queries(original_query, n=3)
results = set()
for q in queries: results |= set(vectorstore.search(q))
```

**考察点**：
1. 为什么 hypothetical document 比 query 更接近真实文档
2. HyDE 的适用场景（长尾查询、专业术语查询）
3. 与 Multi-Query 的组合使用

**示例答案**：
HyDE 的洞察是：查询语言和文档语言有风格差距，直接用查询做向量检索会有系统性的 semantic gap。生成一个"假如我知道答案它大概长什么样"的假设性文档，再用这个文档去检索，因为和实际文档的风格、术语更一致，embedding 相似度更高。代价是多一次 LLM 调用，用 claude-haiku 可以控制在 50ms/次的额外延迟。实际测试，对于"如何解决 X 问题"这类查询，HyDE 召回率比直接检索高 15-20%；但对于已经是关键词风格的查询（"量子计算 叠加态 原理"），HyDE 的增益不明显。可以用查询分类器先判断查询类型，复杂询问式查询走 HyDE，关键词式查询直接检索。

---

### Q67: LangGraph 的 Interrupt 和 Command 机制详解，Human-in-the-Loop 的三种模式

**🏢 高频公司**：字节、小红书

**题目讲解**：

**interrupt() 工作原理**：
```python
from langgraph.types import interrupt, Command

def review_node(state: State):
    # 暂停执行，把 value 传给外部
    decision = interrupt({"draft": state["draft"]})
    # decision 是外部 resume 时传入的值
    if decision["action"] == "approve":
        return {"status": "approved"}
    else:
        return {"feedback": decision["feedback"], "status": "revise"}
```

**三种 HITL 模式**：

**1. Approve/Reject（审批）**：
```python
# 服务端等待中
result = graph.invoke(input, config)  # 返回 interrupt value
# 用户审批
graph.invoke(Command(resume={"action": "approve"}), config)
```

**2. Edit（编辑后继续）**：
```python
# 用户修改了草稿
graph.invoke(Command(resume={"action": "edit", "content": new_content}), config)
```

**3. Multi-turn（多轮澄清）**：
```python
# Agent 遇到不确定时主动问用户
clarification = interrupt({"question": "您要的是红色还是蓝色？"})
# 用户回答后继续
graph.invoke(Command(resume=clarification_answer), config)
```

**生产中的持久化**：
- Checkpointer 把 interrupt 时的完整 state 序列化到数据库
- `thread_id` 是状态的唯一标识，支持跨请求恢复
- 支持超时：如果 N 小时内没有 resume，自动走降级策略

**考察点**：
1. interrupt() 和 checkpointer 的配合（状态如何持久化）
2. stream_mode 下的 interrupt 处理
3. 多 interrupt 节点的图设计（串行审批流）

**示例答案**：
LangGraph 的 interrupt() 是 HITL 的核心机制，它在节点内部暂停图执行，把中间状态（通过 Checkpointer 持久化到 DB）和 interrupt value（需要用户决策的内容）返回给调用方，调用方可以展示给用户并等待；用户决策后通过 `Command(resume=...)` 恢复执行，图从 interrupt 点继续。三种模式中"审批"最简单，只需 approve/reject；"编辑"让用户直接修改中间产物（如日报草稿）然后继续；"澄清"让 Agent 主动提问解决歧义，类似多轮对话但嵌入在 graph 流程里。关键工程细节是 thread_id 管理——每个用户会话有唯一 thread_id，所有 checkpoint 都用这个 ID 存取，服务端无状态，任意实例都能恢复任意 session。

---

### Q68: 什么是 AI Agent 的"幻觉检测"？有哪些主动检测和被动防御手段？

**🏢 高频公司**：MiniMax、字节、阿里

**题目讲解**：

**幻觉的三个来源**：
1. **知识幻觉**：模型凭空捏造事实（"张三是某公司CEO"）
2. **引用幻觉**：RAG 场景下声称"文档中说X"但文档没有这段内容
3. **推理幻觉**：推理链看似正确但结论错误

**主动检测（NLI-based）**：
```python
# 用 NLI（自然语言推断）模型验证声明 vs 来源文档
from transformers import pipeline
nli = pipeline("text-classification", model="cross-encoder/nli-deberta-v3-base")

def check_faithfulness(claim: str, source: str) -> bool:
    result = nli(f"{source} [SEP] {claim}")
    return result[0]['label'] == 'ENTAILMENT'
```

**RAGAS 的 Faithfulness 指标**：
1. 将模型回答拆解为原子声明（"句子1"，"句子2"...）
2. 对每个声明，用 LLM 判断是否能从检索到的 context 中推断出来
3. Faithfulness = 可推断声明数 / 总声明数

**被动防御手段**：
1. **Source Citation**：要求模型引用来源，并验证引用是否真实
2. **Temperature=0**：降低随机性，减少"创造性填充"
3. **Self-check**：生成答案后再让模型自检（"以上答案中是否有无法从文档确认的内容？"）
4. **RAG Grounding Prompt**：system prompt 明确要求"只基于提供文档回答，不确定时说不知道"

**考察点**：
1. 引用幻觉的检测（Citation Grounding）
2. 知识幻觉 vs 引用幻觉的不同处理策略
3. 幻觉率的监控指标设计

**示例答案**：
幻觉检测分事前和事后。事前防御：RAG 系统里 system prompt 明确限制"只基于以下文档回答，无法回答时明确说不知道"，Temperature 设为 0 减少随机创造；要求回答时标注来源段落编号，方便后续验证。事后检测：将模型回答拆解为原子声明，用 NLI 模型或 LLM 逐条验证是否能从 context 推断（RAGAS Faithfulness）；也可以用 Self-Check——生成答案后让同一模型（或更强的模型）审查"哪些内容无法从提供的文档中确认"。生产监控上，抽样 5% 的请求做 faithfulness 检测，低分对话进入人工复查队列。发现幻觉集中在某类问题（如数字、日期类）后，可以针对性加强那类问题的 RAG 检索或在 prompt 里加特别提醒。

---

### Q69: Agent Memory 的 Write-Back 策略和记忆遗忘机制如何设计？

**🏢 高频公司**：小红书、字节

**题目讲解**：
**记忆写入时机（Write-Back）**：

**同步写入**（对话结束时）：
- 用户说再见或超时后触发
- 提取对话中的关键信息（用户偏好、决策结果）
- 缺点：对话中途断开会丢失

**异步写入**（定时/后台）：
- 对话进行中后台异步提取，不阻塞响应
- 用消息队列解耦（对话服务 → Kafka → 记忆服务）
- 适合实时性要求高的场景

**实现示例**：
```python
import asyncio

async def chat_with_memory_write(user_msg: str, session: Session):
    # 同步：生成回复
    reply = await llm.generate(user_msg, context=session.memory)
    
    # 异步：提取并写入记忆（不等待结果）
    asyncio.create_task(extract_and_save_memory(user_msg, reply, session.user_id))
    
    return reply

async def extract_and_save_memory(user_msg, reply, user_id):
    # 用 LLM 提取关键信息
    extracted = await llm.extract(
        f"从以下对话提取用户偏好和关键事实：\n用户：{user_msg}\nAI：{reply}",
        schema=MemorySchema
    )
    await memory_db.upsert(user_id, extracted)
```

**记忆遗忘策略**：
1. **TTL 过期**：不重要的记忆设 30 天 TTL，自动过期
2. **重要性评分**：LLM 给每条记忆打重要性分（1-10），低分记忆优先淘汰
3. **访问频率**：长期未被检索到的记忆权重衰减
4. **用户主动删除**：GDPR 合规，支持"忘记我的偏好"

**记忆的更新 vs 追加**：
- 同类信息（"用户不吃辣"覆盖"用户不吃香菜"→ 都是饮食偏好）：更新
- 不同类信息（"用户提到女儿"+ "用户是程序员"）：追加

**考察点**：
1. 异步写入的可靠性保证（消息队列 vs fire-and-forget）
2. 记忆去重（向量相似度判断是否是同类信息）
3. 记忆隐私和合规（敏感信息不应存入长期记忆）

**示例答案**：
记忆写入最好异步，不阻塞主响应路径。实现上用 `asyncio.create_task` 启动后台任务，或者发 Kafka 消息让专门的记忆服务处理。提取什么记忆是关键：不是所有对话都值得记录，只提取"用户偏好"、"重要事实"、"决策结果"类信息，普通闲聊不存。记忆的生命周期管理：重要信息（用户的忌口、工作单位）设较长 TTL 或永久；普通偏好（"上次喜欢的餐厅"）设 30 天 TTL。记忆去重很关键，不能无限追加——用 embedding 相似度判断新记忆是否与已有记忆重复，重复则更新而非追加，避免记忆库无限膨胀。在 Critter 项目里我实现了这套机制：按类别（饮食/工作/爱好）分类存储，同类新信息覆盖旧信息，用 json 文件持久化，每次对话注入 system prompt。

---

### Q70: 如何设计多 Agent 系统的错误恢复和任务重试机制？

**🏢 高频公司**：字节、腾讯

**题目讲解**：

**错误类型分类**：
1. **可重试错误**：网络超时、API 限流（429）、临时服务不可用（503）
2. **不可重试错误**：参数格式错误（400）、权限不足（403）、业务逻辑错误
3. **需要人工干预**：工具调用返回了意外结果，Agent 无法自行处理

**重试策略**：
```python
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type((RateLimitError, TimeoutError)),
    reraise=True
)
async def call_tool(tool_name: str, args: dict):
    ...
```

**任务级恢复（Checkpoint-based）**：
```python
# LangGraph 的 Checkpointer 记录每步状态
# 失败时从最后成功的 checkpoint 恢复
graph_config = {"configurable": {"thread_id": "task-123"}}

try:
    result = await graph.ainvoke(input, graph_config)
except Exception as e:
    # 从检查点恢复（LangGraph 自动处理）
    result = await graph.ainvoke(None, graph_config)  # None 触发从 checkpoint 继续
```

**错误隔离（Circuit Breaker）**：
```python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, timeout=60):
        self.failures = 0
        self.state = "closed"   # closed/open/half-open
        self.last_failure_time = 0
    
    async def call(self, func, *args):
        if self.state == "open":
            if time.time() - self.last_failure_time > self.timeout:
                self.state = "half-open"
            else:
                raise Exception("Circuit breaker OPEN")
        try:
            result = await func(*args)
            if self.state == "half-open":
                self.state = "closed"; self.failures = 0
            return result
        except Exception as e:
            self.failures += 1
            self.last_failure_time = time.time()
            if self.failures >= self.failure_threshold:
                self.state = "open"
            raise
```

**优雅降级**：
- 工具 A 失败 → 尝试备用工具 B → 返回降级结果 → 通知用户
- 不允许 Agent 因单个工具故障而完全停止运行

**考察点**：
1. 幂等性对重试的重要性（重试前必须保证操作幂等）
2. Circuit Breaker 三态（Closed/Open/Half-Open）
3. LangGraph Checkpointer 的断点恢复机制

**示例答案**：
多 Agent 系统的错误恢复分三层。工具级：用 tenacity 的指数退避重试，只重试幂等操作（查询类），写操作必须先加幂等 ID 再重试。任务级：LangGraph Checkpointer 在每个节点执行后保存完整 state，失败时从最后成功节点恢复，不需要从头重跑。服务级：对外部工具调用加 Circuit Breaker，连续失败超阈值时熔断（短路），避免雪崩，定时探测恢复。设计原则是"让 Agent 感知错误并自主决策降级"：工具超时时，Agent 应该在下一个 Thought 里感知到（通过 tool_result 里的错误信息），自主选择备用方案或告知用户"该功能暂时不可用"，而不是对用户完全无响应。

---

### Q71: 如何设计 LLM 应用的多租户隔离（Multi-tenant）架构？

**🏢 高频公司**：阿里、腾讯

**题目讲解**：

**多租户的隔离维度**：
1. **数据隔离**：不同客户的知识库、向量数据、记忆不能混用
2. **模型配置隔离**：不同客户可能有不同的 system prompt、模型、温度
3. **限流隔离**：A 客户的高并发不影响 B 客户
4. **成本归因**：精确追踪每个客户的 token 消耗和费用

**架构方案**：

**向量数据库隔离**：
```python
# 方案1：Collection 级隔离（Qdrant）
client.create_collection(collection_name=f"tenant_{tenant_id}_knowledge")

# 方案2：Metadata 过滤（共享集合，查询时加 filter）
results = client.search(
    collection_name="shared_knowledge",
    query_vector=embedding,
    query_filter={"tenant_id": tenant_id}  # 严格隔离
)
```

**System Prompt 隔离**：
```python
def build_system_prompt(tenant_id: str) -> str:
    tenant_config = config_db.get(tenant_id)
    return f"""你是 {tenant_config.bot_name}，{tenant_config.persona}
公司信息：{tenant_config.company_info}
回答语言：{tenant_config.language}"""
```

**Rate Limiting 隔离**：
```python
# Redis 按 tenant_id 做限流
async def check_rate_limit(tenant_id: str) -> bool:
    key = f"rate:{tenant_id}:{int(time.time() // 60)}"
    count = await redis.incr(key)
    await redis.expire(key, 60)
    limit = tenant_limits.get(tenant_id, DEFAULT_LIMIT)
    return count <= limit
```

**成本归因**：
```python
# 每次 LLM 调用记录 tenant_id 和 token 使用量
await usage_db.insert({
    "tenant_id": tenant_id,
    "model": model,
    "input_tokens": response.usage.input_tokens,
    "output_tokens": response.usage.output_tokens,
    "timestamp": datetime.now()
})
```

**考察点**：
1. Collection 隔离 vs 共享 Collection + filter（成本 vs 严格隔离）
2. 配置的热更新（不重启服务修改租户配置）
3. 跨租户数据泄露的防御（注意 LLM 上下文污染）

**示例答案**：
多租户 LLM 架构的核心是数据和配置的严格隔离。向量数据库上，小租户用共享 Collection + metadata filter（省钱），大租户或安全要求高的给独立 Collection（强隔离）。System prompt 从数据库动态加载，每个租户有独立配置（bot 名字、人格、公司信息），热更新不需要重启服务。限流按 tenant_id 维度用 Redis 令牌桶，防止单个租户打垮整个服务。成本归因必须在 LLM 调用层记录，写入 ClickHouse，支持按租户、按日期、按模型多维度分析。最重要的安全原则：不同租户的对话上下文绝对不能混入，每次请求只携带当前租户的 system prompt 和知识库内容，禁止跨租户的任何信息传递。

---

### Q72: 什么是 Agent 的"计划-执行"模式（Plan-and-Execute）？与 ReAct 有何区别？

**🏢 高频公司**：字节、MiniMax

**题目讲解**：

**ReAct 模式（交替推理-执行）**：
- 每步：Thought → Action → Observation → Thought → ...
- 决策是即时的（执行一步后再决定下一步）
- 适合：短任务、任务复杂度未知、需要根据中间结果动态调整

**Plan-and-Execute 模式（先计划后执行）**：
- 先由"规划 Agent"生成完整计划（步骤列表）
- 再由"执行 Agent"按计划逐步执行，遇到问题可以重新规划
- 适合：长任务、步骤可以预先明确、需要并行执行多步

```python
# LangGraph Plan-and-Execute 结构
class PlanExecuteState(TypedDict):
    input: str
    plan: list[str]          # 计划步骤
    past_steps: list[tuple]  # (步骤, 执行结果)
    response: str

# 规划节点
def planner(state):
    plan = llm.invoke(f"为以下任务制定步骤计划：{state['input']}")
    return {"plan": plan.steps}

# 执行节点
def executor(state):
    task = state["plan"][0]
    result = agent.invoke(task)
    return {
        "past_steps": state["past_steps"] + [(task, result)],
        "plan": state["plan"][1:]
    }

# 重规划节点（可选，发现偏差时）
def replanner(state):
    # 根据已执行步骤重新规划剩余步骤
    ...
```

**两种模式对比**：
| | ReAct | Plan-and-Execute |
|---|---|---|
| 计划时机 | 每步即时 | 预先一次性 |
| 适合任务长度 | 短（3-5 步）| 长（10+ 步）|
| 并行可能性 | 天然串行 | 可以并行独立步骤 |
| 灵活性 | 高（随时调整）| 低（需重规划）|
| Token 消耗 | 每步都有 Thought | 规划 Token 多 |

**考察点**：
1. 何时应该重规划（Replan）
2. Plan 的粒度设计（太细则限制了执行 Agent 的自由度）
3. LangGraph 实现 Plan-and-Execute 的图结构

**示例答案**：
ReAct 每步都做即时决策，灵活但效率有限（每步都要 LLM 推理）；Plan-and-Execute 先花一次 LLM 调用生成完整计划，后续执行 Agent 按计划跑，对于长任务总体 LLM 调用次数更少，且计划可以识别并行步骤。实践中，对于"帮我研究一个主题并写报告"这类需要 10-20 个子任务的复杂请求，Plan-and-Execute 效果更好；对于"帮我查一下天气然后推荐穿衣"这类简单 2-3 步任务，ReAct 更合适（不需要规划开销）。重规划（Replan）是 Plan-and-Execute 的关键补丁：当执行结果与预期偏差较大时，触发 replanner 重新生成后续计划，保证最终目标还能完成。在 LangGraph 里，条件边判断"计划是否完成"和"是否需要重规划"，实现自适应的计划执行。

---

*本篇共 10 题（Q63-Q72），与前三篇合计 72 道 AI Agent 面试题。*
### Q63: 什么是 Structured Output（结构化输出）？如何保证 LLM 输出严格符合 JSON Schema？

**🏢 高频公司**：字节、阿里、小红书

**题目解析**：
LLM 生成非结构化文本，工程上需要解析成结构化数据，如何可靠地做到这点是生产级 AI 应用的核心问题。

**题目讲解**：

**方法一：Prompt 约束（不可靠）**：
在 prompt 里写"请以 JSON 格式输出"，模型有时会输出带 markdown 代码块的 JSON，有时格式不对，需要后处理，可靠性差。

**方法二：Function Calling / Tool Use（推荐）**：
让模型调用一个"虚拟工具"，工具定义即 JSON Schema，模型输出的工具调用参数天然符合 schema：
```python
tools = [{
    "name": "extract_info",
    "description": "提取用户信息",
    "input_schema": {
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "age":  {"type": "integer"},
            "city": {"type": "string"}
        },
        "required": ["name", "age"]
    }
}]
response = client.messages.create(model=..., tools=tools, ...)
# response.content[0].input 直接是符合 schema 的 dict
```

**方法三：constrained decoding（推理层约束）**：
- Outlines、Guidance、lm-format-enforcer 等库在 token 采样层面约束，只允许生成符合 grammar 的 token
- 100% 可靠，代价是推理速度略有下降
- vLLM 原生支持 `guided_json`

**方法四：Instructor / Pydantic 集成**：
```python
from pydantic import BaseModel
import instructor
client = instructor.from_anthropic(anthropic.Anthropic())

class UserInfo(BaseModel):
    name: str
    age: int
    city: str

user = client.messages.create(
    model="claude-opus-4-6",
    response_model=UserInfo,
    messages=[{"role": "user", "content": "我叫张三，28岁，住在北京"}]
)
# user 直接是 UserInfo 实例
```

**考察点**：
1. Function Calling 为什么比 prompt 约束更可靠
2. Constrained decoding 的实现原理（有限状态机 + token mask）
3. Instructor 库的内部实现（多次重试 + 错误反馈）

**示例答案**：
生产中最可靠的结构化输出方案是 Function Calling：定义工具的 JSON Schema，让模型调用工具，输出的参数天然满足 schema，API 层面就做了约束，不需要额外解析。对于需要 100% 格式保证的场景，constrained decoding 是终极方案，在 token 采样阶段用有限状态机过滤不合法的 token，但需要推理框架支持（vLLM 的 guided_json）。Instructor 是工程上很好用的封装，用 Pydantic 定义返回类型，自动处理格式错误重试，几行代码就能获得类型安全的 LLM 输出。

---

### Q64: 什么是 LLM 的 Tool Use 并行调用（Parallel Tool Use）？如何利用它提升 Agent 速度？

**🏢 高频公司**：字节、腾讯、MiniMax

**题目讲解**：
部分 LLM（Claude 3+、GPT-4 Turbo）支持在一次回复中输出多个工具调用请求，客户端并行执行后一起返回，大幅降低多步骤 Agent 的延迟。

**工作流对比**：
```
串行：
query → LLM → call tool_A → LLM → call tool_B → LLM → answer
延迟：3次LLM调用 + 2次工具调用

并行：
query → LLM → [call tool_A, call tool_B 同时] → LLM → answer
延迟：2次LLM调用 + 1次（并行）工具调用
```

**实现**：
```python
# Claude 可以在一次 response 里输出多个 tool_use block
response = client.messages.create(...)
tool_calls = [b for b in response.content if b.type == "tool_use"]

# 并行执行
import asyncio
results = await asyncio.gather(*[
    execute_tool(tc.name, tc.input) for tc in tool_calls
])

# 将所有结果一起返回
tool_results = [
    {"type": "tool_result", "tool_use_id": tc.id, "content": str(r)}
    for tc, r in zip(tool_calls, results)
]
```

**设计原则**：
- 独立的信息查询（查天气 + 查股价 + 查新闻）适合并行
- 有依赖的操作（查用户信息 → 基于结果查订单）必须串行
- Agent 框架设计时，工具描述里说明依赖关系，让模型自己决定是否并行

**考察点**：
1. 哪些工具可以并行（独立性判断）
2. 并行调用的错误处理（部分失败时的处理）
3. 在 LangGraph 中实现并行工具节点

**示例答案**：
Parallel Tool Use 是 Agent 性能优化的重要手段。Claude 可以一次回复输出多个 tool_use block，客户端用 asyncio.gather 并发执行，再将所有结果组成 tool_results 列表一起送回。这把 N 次独立工具调用的延迟从 O(N × LLM_latency) 压缩到近似 O(2 × LLM_latency)（一次决策 + 一次综合）。在 LangGraph 里可以用 Send API 实现并行节点：把工具调用列表拆分，每个工具调用 Send 到一个并行节点，所有节点完成后汇总到下一个节点。关键判断是哪些调用可以并行——查天气和查股价完全独立，可以并行；但"先查用户余额再决定推荐策略"有数据依赖，必须串行。

---

### Q65: 解释 LLM 的 Context Length vs Knowledge Cutoff 的区别，以及各自的工程应对

**🏢 高频公司**：字节、小红书、阿里

**题目讲解**：

**Context Length（上下文长度）**：
- 当前请求能输入的最大 token 数（当前会话的"工作记忆"）
- 技术上限制：KV Cache 显存、计算复杂度
- 解决方案：RAG（检索相关内容而非全部输入）、摘要压缩、分块处理

**Knowledge Cutoff（知识截止日期）**：
- 模型训练数据的时间截止点，之后发生的事情模型不知道
- 是训练数据的限制，不是推理时的限制
- 解决方案：RAG 接入实时数据、Tool Use（搜索 API）、持续预训练

**两者的工程影响对比**：
| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 模型不知道昨天的新闻 | Knowledge Cutoff | RAG / 搜索工具 |
| 模型忘记对话前面的内容 | Context Length 超限 | 摘要压缩 / 滑动窗口 |
| 模型无法处理 100 页 PDF | Context Length | Chunking + RAG |
| 模型对 2024 年后的事件一无所知 | Knowledge Cutoff | Fine-tuning / RAG |

**实际判断方法**：
- 模型说"我不知道 X"：可能是 Knowledge Cutoff 或 RAG 没覆盖
- 模型忘记之前说过的话：Context Length 问题
- 用 `max_context - current_usage` 监控上下文使用率

**考察点**：
1. 两者的根本区别（训练时 vs 推理时的限制）
2. 如何在 Agent 里检测上下文即将超限（预计算 token 数）
3. 知识截止日期问题的多种解决方案

**示例答案**：
Context Length 是推理时的技术限制（当前请求能看到多少 token），Knowledge Cutoff 是训练时的数据限制（模型知道截止什么时候的信息）。两者的解决方案不同：Context Length 问题用 RAG（只传相关片段）、摘要压缩（压缩历史对话）解决；Knowledge Cutoff 问题用 RAG + 实时搜索工具解决，让模型能查到最新信息。Agent 工程上要同时处理两个：用 tiktoken 实时估算 context 使用量，接近上限时触发摘要；同时给 Agent 配备搜索工具，遇到可能超出训练数据的问题（近期事件、实时数据）主动调用搜索。

---

### Q66: 什么是 Hypothetical Document Embedding（HyDE）？它如何提升 RAG 的召回率？

**🏢 高频公司**：小红书、字节、阿里

**题目讲解**：
**问题背景**：
用户的查询（Query）和数据库里的文档（Document）往往有语义距离：
- 查询："有没有关于量子计算的入门资料？"
- 文档："量子比特是量子计算机的基本单元，利用叠加态..."
- 两者的 embedding 相似度不高，但语义上相关

**HyDE 的思路**：
1. 让 LLM 根据查询生成一个"假设性回答"（Hypothetical Document）
2. 用这个假设性回答的 embedding 去检索，而不是用原始查询
3. 假设性回答的语言风格和文档库更接近，embedding 相似度更高

```python
def hyde_retrieve(query: str, vectorstore, llm_client) -> list:
    # 1. 生成假设性文档
    hypothesis = llm_client.messages.create(
        model="claude-haiku-4-5",
        messages=[{
            "role": "user",
            "content": f"请写一段关于以下问题的简短回答（100字以内）：{query}"
        }]
    ).content[0].text
    
    # 2. 用假设性文档检索
    results = vectorstore.similarity_search(hypothesis, k=5)
    return results
```

**效果与代价**：
- 对"询问式"查询（用户问问题）效果显著，召回率提升 10-20%
- 额外代价：一次 LLM 调用（约 100ms + token 费用）
- 对直接关键词查询效果一般（不如直接搜索）

**变体：多查询扩展（Multi-Query）**：
```python
# 生成 3-5 个查询变体，每个变体独立检索，结果取并集
queries = llm.generate_multiple_queries(original_query, n=3)
results = set()
for q in queries: results |= set(vectorstore.search(q))
```

**考察点**：
1. 为什么 hypothetical document 比 query 更接近真实文档
2. HyDE 的适用场景（长尾查询、专业术语查询）
3. 与 Multi-Query 的组合使用

**示例答案**：
HyDE 的洞察是：查询语言和文档语言有风格差距，直接用查询做向量检索会有系统性的 semantic gap。生成一个"假如我知道答案它大概长什么样"的假设性文档，再用这个文档去检索，因为和实际文档的风格、术语更一致，embedding 相似度更高。代价是多一次 LLM 调用，用 claude-haiku 可以控制在 50ms/次的额外延迟。实际测试，对于"如何解决 X 问题"这类查询，HyDE 召回率比直接检索高 15-20%；但对于已经是关键词风格的查询（"量子计算 叠加态 原理"），HyDE 的增益不明显。可以用查询分类器先判断查询类型，复杂询问式查询走 HyDE，关键词式查询直接检索。

---

