# AI Agent 场景设计题

> 面试中最常见的开放式设计题：「如果让你设计一个 XXX 的 Agent，你会怎么做？」
>
> 每道题包含：需求拆解 / 架构设计 / 核心模块 / 难点权衡 / 示例答案
>
> 🏢 标注高频出现公司

---

### Q83: 设计一个企业级代码审查 Agent（Code Review Agent）

**🏢 高频公司**：字节、阿里、腾讯（内部工具岗）

**题目解析**：
代码审查是工程效率的核心场景，考察候选人能否把 LLM 能力与工程规范、流水线系统结合。
面试官考察：**需求分解能力 + RAG 设计 + 工具调用设计 + 生产可靠性思考**。

---

**一、需求拆解**

**功能需求**（先和面试官对齐边界）：
- 自动审查 PR/MR 中的代码变更（diff）
- 检查维度：Bug/空指针/安全漏洞/性能问题/代码风格/业务逻辑
- 支持多语言（Python/Java/Go/TypeScript）
- 可在 GitHub/GitLab CI 中集成，PR 创建时自动触发
- 人工可以对 Agent 评论进行追问

**非功能需求**（主动说出来加分）：
- 延迟：P90 < 60s（代码量大时允许异步）
- 准确率：误报率 < 10%，漏报率 < 20%（不能太严导致噪音，不能太松没价值）
- 可配置：不同团队可自定义规则集
- 可解释：每条评论需说明原因，而非直接给结论

---

**二、架构设计**

```
PR 创建/更新
     │
     ▼
Webhook 接收层
     │ 拿到 diff
     ▼
┌────────────────────────────────────┐
│          Code Review Agent          │
│                                    │
│  ┌──────────┐   ┌───────────────┐  │
│  │ 代码理解  │   │  规则知识库    │  │
│  │  Parser   │   │  (RAG)       │  │
│  └──────────┘   └───────────────┘  │
│         │               │          │
│         ▼               ▼          │
│     ┌───────────────────────┐      │
│     │     Review LLM        │      │
│     │  (Claude Opus / GPT4) │      │
│     └───────────────────────┘      │
│              │                     │
│     ┌────────┴────────┐            │
│     │  自检 Validator  │            │
│     │（误报过滤器）     │            │
│     └─────────────────┘            │
└────────────────────────────────────┘
          │
          ▼
    发布 PR 评论（按文件/行号）
```

---

**三、核心模块设计**

**3.1 代码预处理（Context 构建）**

单纯传 diff 给 LLM 是不够的，需要：
- **diff 解析**：提取变更文件、变更前后代码、变更行号
- **上下文扩展**：变更行附近 ±50 行，让 LLM 理解上下文
- **依赖感知**：如果函数签名改了，需要检索哪些地方调用了这个函数（基于 AST 或 grep）
- **文件粒度**：大 PR（>20 文件）分批处理，按文件并发 Review

```python
def build_review_context(diff: str, repo_path: str) -> list[ReviewContext]:
    files = parse_diff(diff)
    contexts = []
    for file_diff in files:
        # 提取变更行上下文
        full_code = get_file_content(repo_path, file_diff.path)
        context_code = extract_context(full_code, file_diff.changed_lines, window=50)
        
        # AST 分析：找到被调用的函数定义
        callee_contexts = find_callees(file_diff.path, context_code, repo_path)
        
        contexts.append(ReviewContext(
            file=file_diff.path,
            language=detect_language(file_diff.path),
            diff=file_diff.diff,
            context=context_code,
            callees=callee_contexts,
        ))
    return contexts
```

**3.2 规则知识库（RAG）**

不同团队有不同的代码规范，用 RAG 而非 Fine-tuning（规范会频繁更新）：
- **内容**：代码规范文档、典型 Bad Case 和 Good Case、安全规则、架构约束
- **检索策略**：根据语言和文件路径检索相关规则（Java 文件不需要 Python 规则）
- **Prompt 注入**：将相关规则注入 system prompt

**3.3 多维度并发检查**

```python
async def review_file(context: ReviewContext) -> list[Comment]:
    # 并发执行多个专项检查
    results = await asyncio.gather(
        check_security(context),     # SQL 注入/XSS/敏感信息泄露
        check_bugs(context),         # 空指针/越界/资源未释放
        check_performance(context),  # N+1 查询/无缓存热点/无限循环
        check_style(context),        # 命名规范/注释缺失/函数过长
        check_business_logic(context) # 结合 PR 描述检查逻辑正确性
    )
    return merge_and_deduplicate(results)
```

**3.4 自检过滤器（降低误报）**

LLM 审查后，再用一个 Validator 过滤：
- 置信度 < 0.7 的评论删除
- 针对同一问题重复提示的合并
- 对"不确定"类评论降级为"建议"而非"必须修改"

**3.5 评论格式化（Inline Comment）**

```python
def format_comment(issue: Issue) -> GitHubComment:
    severity_emoji = {"error": "🔴", "warning": "🟡", "info": "🔵"}
    return GitHubComment(
        path=issue.file,
        line=issue.line_number,
        body=f"""
{severity_emoji[issue.severity]} **[{issue.category}]** {issue.title}

{issue.description}

💡 **建议修改**：
```{issue.language}
{issue.suggestion}
```

> 置信度: {issue.confidence:.0%} | 规则来源: {issue.rule_ref}
"""
    )
```

---

**四、难点与权衡**

| 难点 | 解决思路 |
|------|---------|
| **误报太多** | 专项检查 + 自检过滤 + 置信度阈值；先上线高精度规则，逐步扩展 |
| **大 PR 超时** | 按文件并发，优先审查关键文件（被多处引用的）；超时降级为摘要式审查 |
| **不理解业务逻辑** | PR 描述 + Jira/Linear 关联 issue 一起注入 context，提供业务背景 |
| **规则更新成本** | 知识库用 RAG，运营人员可以直接上传更新规则文档，无需重新训练 |
| **不同语言支持** | 每种语言独立的 system prompt，AST parser 用对应语言的工具（tree-sitter）|

**考察点**：
1. Context 构建的完整性（不只是 diff，还有上下文和调用链）
2. 如何用 RAG 实现可更新的规则库
3. 降低误报的工程手段（不能只说"用好模型"）
4. CI/CD 集成的延迟要求（同步 vs 异步）

**面试官更想听**：
- 主动说"我先和面试官确认边界：是 Lint 规则类的静态检查，还是包括业务逻辑审查？"
- 说明"误报是这个场景最关键的质量指标，因为噪音太多开发者会直接关掉 Agent"
- 说出"并发多维度检查 + 自检过滤器"这两个工程亮点

**示例答案（口头表达版）**：

设计代码审查 Agent 我会分四步走。

**第一步澄清需求**：边界很重要——是只看 diff 还是要理解整个项目上下文？是同步返回（会阻塞 CI 流水线）还是异步评论？我会假设审查单次 PR 的 diff，5 分钟内完成。

**第二步 Context 构建**：光给 LLM 看 diff 不够，它看不懂上下文。我会扩展变更行附近 ±50 行，对于涉及函数调用的变更，用 AST 解析找到被调函数的定义也一并注入；同时把 PR 描述和关联的需求文档注入，帮助 LLM 理解业务意图。

**第三步多维度并发检查**：拆成安全/Bug/性能/风格/业务逻辑五类，各自用专门的 system prompt 并发执行，最后合并去重。规范文档不 Fine-tuning 而用 RAG，方便团队随时更新规则。

**第四步降低误报**：LLM 审查后接一个自检过滤器：置信度 < 70% 的评论删除，同一问题多次提示的合并，把"可能有问题"类降为建议而非错误。评论按严重程度分级（🔴 必须修/🟡 建议/🔵 仅供参考），开发者能快速分辨优先级。

最后说一下监控：统计每周评论的"采纳率"（开发者按建议修改的比例），采纳率 < 30% 说明误报太多需要收紧阈值；> 80% 说明 Agent 可能在点踩方面有 bias，需要抽样人工复核。

---

### Q84: 设计一个企业知识库问答 Agent（RAG-based Q&A Agent）

**🏢 高频公司**：小红书、阿里、字节（内部工具必问）

**题目解析**：
这是最高频的 Agent 设计题，几乎每家大厂内部都有类似系统。考察的是 RAG 工程的系统性认知，而非单点技术。

---

**一、需求拆解**

**典型场景**：员工可以用自然语言查询公司内部文档（产品手册/HR 政策/技术规范/会议纪要）

**功能需求**：
- 多格式文档摄入（PDF/Word/Confluence/飞书文档/代码仓库）
- 多轮对话（追问"上面说的第二点展开讲讲"）
- 来源引用（告诉用户答案来自哪个文档的哪一页）
- 权限隔离（不同部门只能访问自己的文档）
- 无法回答时明确说"不知道"而非编造

**非功能需求**：
- 首 Token 延迟 < 3s（用户感知）
- 新文档上传后 5 分钟内可查询
- 知识库规模：10 万文档，1 亿 token 级别

---

**二、系统架构**

```
离线索引流程：
文档上传 → 格式解析 → 智能分块 → Embedding → 向量库
                                              (Milvus)

在线查询流程：
用户提问 → 权限校验 → 意图识别
                          ├─→ 可直接回答 → LLM 直答
                          └─→ 需检索 →
                                │
                         查询改写（HyDE/多查询）
                                │
                         混合检索（向量 + BM25）
                                │
                         Reranker 精排（Top 5）
                                │
                         Context 构建
                                │
                         LLM 生成（含来源）
                                │
                         幻觉检测
                                │
                         输出 + 引用标注
```

---

**三、核心模块深度设计**

**3.1 智能分块策略**

不同文档用不同分块策略：
```python
def smart_chunk(doc: Document) -> list[Chunk]:
    if doc.type == "api_doc":
        # API 文档按接口分块（每个 endpoint 是一个 chunk）
        return chunk_by_api_endpoint(doc)
    elif doc.type == "pdf_report":
        # PDF 报告按章节分块（识别标题层级）
        return chunk_by_heading(doc)
    elif doc.type == "faq":
        # FAQ 按问答对分块
        return chunk_by_qa_pair(doc)
    else:
        # 通用：递归分块，优先在段落边界切割
        return recursive_chunk(doc, chunk_size=512, overlap=64)
```

父子分块（Parent-Child Chunking）：
- **检索 chunk**（小，256 token）：用于精准匹配
- **注入 chunk**（大，1024 token）：检索命中后，注入其父级大块，保留上下文

**3.2 查询理解和改写**

```python
async def understand_query(query: str, history: list[Message]) -> ProcessedQuery:
    # 1. 指代消解：把"上面说的那个方法"还原为具体名称
    resolved = await resolve_coreference(query, history)
    
    # 2. 意图判断：是否需要检索
    intent = await classify_intent(resolved)
    if intent == "chit_chat":
        return ProcessedQuery(needs_retrieval=False, queries=[resolved])
    
    # 3. 多查询扩展（一个问题生成 3 个角度的查询）
    expanded = await expand_queries(resolved, n=3)
    
    # 4. HyDE（对复杂问题生成假设性回答用于检索）
    if intent == "complex_reasoning":
        hypothesis = await generate_hypothesis(resolved)
        expanded.append(hypothesis)
    
    return ProcessedQuery(needs_retrieval=True, queries=expanded)
```

**3.3 权限隔离**

不同用户只能搜到有权限的文档：
```python
class PermissionAwareRetriever:
    def search(self, query_embedding, user: User, top_k=50):
        # 检索时加权限过滤器
        results = self.vector_db.search(
            vector=query_embedding,
            filter={
                "department": {"$in": user.departments},
                "confidentiality": {"$lte": user.clearance_level}
            },
            limit=top_k
        )
        return results
```

**3.4 来源引用和幻觉防御**

```python
SYSTEM_PROMPT = """
你是企业知识助手。回答必须严格基于以下检索到的文档。
规则：
1. 每个事实声明必须标注来源（用 [文档名-页码] 格式）
2. 如果文档中没有相关信息，明确回复"根据当前知识库，暂无相关信息"
3. 不允许结合外部知识推断或补充

检索到的文档：
{retrieved_docs}
"""
```

回答后验证引用：
```python
def verify_citations(answer: str, docs: list[Doc]) -> float:
    claims = extract_claims(answer)  # 提取事实声明
    verified = sum(1 for claim in claims if is_supported(claim, docs))
    return verified / len(claims) if claims else 1.0  # faithfulness score
```

**3.5 增量索引（文档更新）**

新文档上传后：
1. 异步触发索引任务（Celery/队列）
2. 解析 → 分块 → Embedding（批量处理，降低 API 成本）
3. 写入向量库（Qdrant 的 Upsert，按文档 ID 更新）
4. 文档元数据（版本/时间/作者）存 PostgreSQL

目标：**5 分钟内可查询**（对 95% 的文档更新）

---

**四、难点与权衡**

| 难点 | 解决方案 |
|------|---------|
| 多格式解析质量 | PDF 用 `unstructured` 库（表格/公式保留率高），代码用 AST 感知分块 |
| 跨文档推理 | 检索多文档注入，prompt 里要求 LLM 综合多个来源回答 |
| 答案时效性 | 文档元数据含更新时间，优先使用近期文档；提示用户"该文档于 X 月更新" |
| 知识库冷启动 | 初始只索引核心 FAQ 和政策文档，逐步扩展，避免早期质量差影响口碑 |
| 多语言文档 | 使用多语言 Embedding 模型（bge-m3），自动检测语言，中英混合检索 |

**考察点**：
1. 父子分块的设计（小块检索 + 大块注入）
2. 权限隔离在向量检索层的实现
3. 增量更新的异步架构
4. 幻觉防御的具体工程手段（不只是说"用 RAG"）

**面试官更想听**：
- 主动问"知识库规模大概多大？实时性要求怎样？"
- 说出父子分块的创新点：检索精确性和注入完整性不是对立的
- 提出"faithfulness score"作为核心质量指标，而非模糊的"准确率"

**示例答案**：

设计企业知识库问答 Agent，我的核心原则是**让 Agent 知道自己不知道**——比能回答更重要的是不编造。

系统分离线和在线两条流水线。离线索引：文档上传后异步解析（PDF/Word/Confluence 各自用适配的解析器），用**父子分块**策略——512 token 的小块用于高精度检索，命中后自动扩展到 1024 token 的父块注入 LLM，兼顾检索精准和上下文完整。Embedding 用 bge-m3（支持中英混合）存 Qdrant，按部门和密级打标签做权限过滤。

在线查询：用户提问先做意图判断（闲聊直接回答，不浪费检索资源），需要检索时用多查询扩展生成 3 个角度的查询词，混合检索（向量 + BM25 融合），Reranker 从 Top-50 精排到 Top-5，注入 LLM 生成。

防幻觉三重保障：system prompt 要求所有事实必须来自文档并标注来源；回答后用 NLI 计算 faithfulness score，低于 0.7 触发重生成；无相关文档时明确回复"知识库暂无相关信息"而非强行回答。

权限隔离在向量检索层实现（filter），不在 LLM 层，因为不能让模型看到无权访问的文档内容再决定是否引用。

---

