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

### Q85: 设计一个数据分析 Agent（Text-to-SQL + 可视化）

**🏢 高频公司**：小红书（数据工具）、字节（DataFact 类产品）、阿里（Quick BI）

**题目解析**：
数据分析 Agent 将自然语言转化为 SQL 并生成洞察，是 BI 产品的智能化升级。考察 Text-to-SQL、多轮交互、安全防护。

---

**一、需求拆解**

**用户旅程**：
```
用户："过去 30 天，哪些商品的退货率最高？"
Agent：生成 SQL → 执行 → 返回结果表格 + 图表 + 文字洞察
用户："那这些商品的差评集中在哪些问题？"（追问）
Agent：理解上文，生成新 SQL → 返回结果
```

---

**二、核心架构**

**多步骤 Agent Loop（LangGraph 实现）**：
```
用户问题
    │
    ▼
[Schema 检索] 从向量库检索相关表/列定义（不把全量 Schema 塞进去）
    │
    ▼
[SQL 生成] LLM 生成 SQL，加注释说明每步逻辑
    │
    ▼
[SQL 校验] 语法检查 + 危险操作检测
    │
    ▼
[SQL 执行] 沙箱执行，超时 30s 强制中止
    │
    ├── 有错误 → [错误修复] LLM 看报错信息自修复（最多 3 次）
    │
    ▼
[结果解读] LLM 生成文字洞察（"TOP 3 商品退货率分别是...，主要原因可能是..."）
    │
    ▼
[图表推荐] 根据数据类型自动选择图表类型（时序→折线，占比→饼图）
    │
    ▼
返回：结果表格 + 图表 + 洞察文字
```

---

**三、关键设计细节**

**3.1 Schema 理解（关键难点）**

实际数仓有几千张表，不能把所有 DDL 全塞进 context（token 爆炸）：

```python
class SchemaRetriever:
    def __init__(self, schema_db):
        # 提前对所有表的注释和列描述做 Embedding
        self.embeddings = embed_all_schemas(schema_db)
    
    def retrieve(self, query: str, top_k=10) -> list[TableSchema]:
        # 用问题检索最相关的表
        query_emb = embed(query)
        relevant = similarity_search(query_emb, self.embeddings, k=top_k)
        
        # 对于检索到的表，只返回相关的列（不是所有列）
        return [trim_irrelevant_columns(table, query) for table in relevant]
```

**3.2 SQL 安全防护**

```python
class SQLValidator:
    FORBIDDEN_PATTERNS = [
        r'\bDROP\b', r'\bDELETE\b', r'\bTRUNCATE\b',
        r'\bUPDATE\b', r'\bINSERT\b', r'\bALTER\b',
        r'\bGRANT\b', r'\bREVOKE\b',
        r'information_schema',   # 禁止查系统表
    ]
    
    def validate(self, sql: str) -> ValidationResult:
        for pattern in self.FORBIDDEN_PATTERNS:
            if re.search(pattern, sql, re.IGNORECASE):
                return ValidationResult(safe=False, reason=f"含禁止操作: {pattern}")
        
        # 行数限制（防止全表扫描打垮 DB）
        if not re.search(r'\bLIMIT\b', sql, re.IGNORECASE):
            sql = sql.rstrip(';') + ' LIMIT 10000'
        
        return ValidationResult(safe=True, sql=sql)
```

**3.3 自修复循环**

```python
async def execute_with_retry(sql: str, db, max_retries=3) -> QueryResult:
    for attempt in range(max_retries):
        try:
            result = await db.execute(sql, timeout=30)
            return result
        except DatabaseError as e:
            if attempt == max_retries - 1:
                raise
            # 让 LLM 看错误信息修复 SQL
            sql = await fix_sql(sql, str(e))
```

**3.4 多轮对话上下文管理**

追问时需要理解前面生成的 SQL 和结果：
```python
def build_context(history: list[Turn]) -> str:
    context = []
    for turn in history[-3:]:  # 只保留最近 3 轮
        context.append(f"用户问: {turn.question}")
        context.append(f"生成SQL: {turn.sql}")
        context.append(f"结果摘要: {summarize_result(turn.result)}")
    return "\n".join(context)
```

---

**四、难点与权衡**

| 难点 | 解决方案 |
|------|---------|
| 歧义问题（"最近"是多久？）| 追问澄清 or 用默认值并在回答中说明 |
| Join 复杂逻辑 | 提供 Few-shot 示例教 LLM 正确 JOIN；提前维护常用宽表 |
| 中文字段名 | 用 `table_comment` 和 `column_comment` 作为检索依据，SQL 用原始英文字段名 |
| 执行超时 | 30s 超时，降级返回"查询太慢，请缩小时间范围" |
| 敏感数据 | 列级权限控制，检索 Schema 时过滤无权访问的列；结果中手机号/身份证脱敏 |

**考察点**：
1. Schema 检索（不能全量注入）
2. SQL 注入和危险操作防护
3. 自修复循环设计（最多 N 次）
4. 多轮对话的上下文压缩

**示例答案**：

数据分析 Agent 的核心挑战是 Schema 太大（实际数仓几千张表）和 SQL 安全。

**Schema 处理**：不把全部 DDL 塞进 context，而是对每张表的注释和关键列描述做 Embedding，根据用户问题检索最相关的 Top-10 张表，再精简列到与问题相关的 10-20 列注入，整个 Schema context 控制在 2000 token 以内。

**SQL 生成到执行**：LangGraph 多步骤 Loop——生成 SQL → 语法和安全校验（正则拦截 DROP/DELETE/系统表访问）→ 沙箱执行（只读账号，30s 超时，自动加 LIMIT 1万）→ 如有错误用报错信息让 LLM 自修复（最多 3 次）→ 结果解读+图表生成。

**多轮理解**：追问时把最近 3 轮的问题、SQL、结果摘要一起注入，让 LLM 理解上下文。结果摘要而非原始数据（避免 token 爆炸）。

**质量监控**：用户执行次数和修复次数比是核心指标——如果 60% 的 SQL 需要修复说明 Schema 理解或 Few-shot 有问题；监控用户放弃（生成了 SQL 但用户不执行）也是重要信号。

---

### Q86: 设计一个多轮对话商品推荐 Agent（小红书/淘宝场景）

**🏢 高频公司**：小红书（必问）、阿里、字节

**题目解析**：
对话式推荐是"搜索 → 对话"范式转变的核心，考察候选人能否结合 LLM 对话能力和推荐系统工程。

---

**一、需求拆解**

用户旅程：
```
用户："我想买一款防晒霜"（宽泛需求）
Agent："您是日常通勤还是户外运动？肤质是什么类型？"（偏好探索）
用户："户外爬山用，油性皮肤，预算 150 以内"
Agent：返回 Top-3 推荐 + 理由 + 对比（个性化精排）
用户："第二款有没有替代品，我想看看其他品牌？"（继续对话）
```

---

**二、系统架构**

```
对话管理层（Session State）
    ├── 用户偏好实体（品类/功效/价位/肤质）
    └── 对话历史（最近 10 轮）

                │ 状态机驱动
                ▼

       ┌─────────────────┐
       │  意图分类器      │
       │（探索/精化/比较/购买）│
       └────────┬────────┘
                │
    ┌───────────┼───────────┐
    ▼           ▼           ▼
  探索模式    精化模式    比较模式
（追问偏好）（精排+推荐）（商品对比）
    │           │           │
    └───────────┴───────────┘
                │
        推荐引擎调用
        ├── 召回（协同过滤 + 向量相似）
        ├── 粗排（LTR 排序模型）
        └── 精排（LLM 个性化重排 + 解释生成）
```

---

**三、核心设计**

**3.1 偏好提取与状态管理**

```python
@dataclass
class UserPreference:
    # 已明确的偏好
    category: str | None = None       # "防晒霜"
    use_scenario: str | None = None   # "户外运动"
    skin_type: str | None = None      # "油性"
    budget_max: float | None = None   # 150
    
    # 隐式信号（从浏览/点击推断）
    preferred_brands: list[str] = field(default_factory=list)
    excluded_ingredients: list[str] = field(default_factory=list)
    
    def missing_fields(self) -> list[str]:
        """返回还没获取到的关键偏好"""
        return [f for f in ['use_scenario', 'skin_type'] if getattr(self, f) is None]

async def extract_preference(message: str, current: UserPreference) -> UserPreference:
    """用 LLM 从用户消息中提取偏好实体，合并到已有状态"""
    extracted = await llm.extract(message, schema=UserPreference)
    return merge(current, extracted)
```

**3.2 智能追问策略**

不是问完所有字段才推荐（用户会不耐烦），而是一次最多问 1-2 个最关键的缺失字段：
```python
def decide_next_action(pref: UserPreference) -> Action:
    missing = pref.missing_fields()
    
    if len(missing) >= 3:
        # 偏好太少，追问最关键的一个
        return Action(type="ASK", question=generate_question(missing[0]))
    elif len(missing) == 0 or pref.budget_max is not None:
        # 偏好足够，直接推荐
        return Action(type="RECOMMEND")
    else:
        # 边推荐边追问（给结果的同时问补充问题）
        return Action(type="RECOMMEND_AND_ASK")
```

**3.3 LLM 个性化重排和解释生成**

传统推荐系统给分数，Agent 给**有原因的推荐**：
```python
RERANK_PROMPT = """
用户偏好：{preference}
候选商品（已按推荐算法粗排）：{candidates}

请根据用户偏好对候选商品重新排序，并为 Top-3 商品各生成一句个性化推荐理由。
理由要直接回应用户的诉求（如：户外爬山 → 防水性、SPF 值），不要泛泛而谈。

输出格式：
1. [商品名] - [个性化理由（25字以内）]
...
"""
```

**3.4 比较模式**

用户要比较两个商品时，生成结构化对比：
```python
def compare_products(prod_a: Product, prod_b: Product, user_focus: list[str]) -> str:
    # user_focus 从上下文提取（用户关心什么维度）
    dims = user_focus or ['价格', '防晒指数', '持妆时长', '适合肤质']
    comparison_table = build_comparison_table(prod_a, prod_b, dims)
    recommendation = llm.recommend_based_on_comparison(prod_a, prod_b, user_preference)
    return format_comparison(comparison_table, recommendation)
```

---

**四、难点与权衡**

| 难点 | 解决方案 |
|------|---------|
| 偏好漂移（用户说变就变）| 每轮对话后重新提取全部偏好，不依赖增量更新 |
| 冷启动（新用户无历史）| 对话式主动探索偏好，比默认热门推荐更个性化 |
| 幻觉商品信息 | 推荐理由只能基于真实商品属性生成，商品数据库是唯一来源 |
| 多轮上下文太长 | 只保留偏好状态 + 最近 5 轮对话，历史超出时摘要压缩 |
| 情感导购（用户聊情绪）| 识别情感意图，先共情再引导到具体需求 |

**考察点**：
1. 偏好状态机的设计（渐进式获取而非一次性问完）
2. 传统推荐系统与 LLM 的分工（粗排用 ML 模型，精排和解释用 LLM）
3. "推荐 + 解释"一体化的提示词设计

**示例答案**：

对话推荐 Agent 的核心是**渐进式偏好获取**——不是一开始就问 10 个问题，而是根据已有信息动态决定"继续问还是直接推荐"。

系统维护一个偏好状态机，每轮对话从用户消息中提取偏好实体（品类/场景/肤质/预算），合并更新状态。每轮后判断：如果关键偏好（使用场景+肤质）已知，立刻推荐；如果缺少超过 2 个关键维度，追问最重要的那一个；其他情况"推荐同时追问"（给结果又问补充）。

推荐分三层：协同过滤+向量相似度做召回（基础推荐系统），LTR 模型做粗排，LLM 只做最后的精排和解释生成——LLM 看用户偏好和粗排候选，重排 Top-3 并给每个商品生成一句直击用户诉求的理由（"户外爬山需要防水持久，这款 SPF50+/PA+++ 且防水 80 分钟"），而不是泛化的"这款很好用"。

防幻觉：推荐理由的每个属性（SPF 值/成分/价格）只能来自商品结构化数据，不允许 LLM 自行生成商品参数。上线前对所有推荐解释做人工抽检，确保没有捏造的规格数字。

---

### Q87: 设计一个自动化 Bug 排查 Agent（On-Call 值班助手）

**🏢 高频公司**：字节、腾讯（SRE 方向）

**题目解析**：
线上告警时工程师需要快速定位根因，Agent 可以自动化这个过程。考察系统工程 + LLM 推理能力。

---

**一、需求拆解**

**输入**：告警通知（错误类型 + 时间 + 影响面）
**输出**：根因定位报告 + 建议处置动作（及严重程度）

---

**二、系统架构与 Agent 工具集**

```python
tools = [
    # 日志查询
    Tool("query_logs", "查询 ElasticSearch 日志，按时间范围+关键词", 
         params={"start_time", "end_time", "keywords", "service", "level"}),
    
    # 指标查询  
    Tool("query_metrics", "查询 Prometheus/Grafana 指标",
         params={"metric_name", "service", "time_range", "labels"}),
    
    # 链路追踪
    Tool("query_traces", "查询 Jaeger 慢请求/错误链路",
         params={"service", "min_duration_ms", "time_range", "error_only"}),
    
    # 代码变更
    Tool("get_recent_deploys", "查询指定服务最近的部署记录",
         params={"service", "hours_back"}),
    
    # 关联告警
    Tool("get_related_alerts", "查询同时期其他服务的告警",
         params={"time_range", "exclude_service"}),
    
    # 知识库
    Tool("search_runbook", "搜索历史事故的处置手册",
         params={"keywords", "error_type"}),
]
```

---

**三、Agent 推理流程（ReAct）**

```
告警触发：order-service 错误率从 0.1% 升至 15%，时间 14:32

Thought: 先查错误日志，看具体错误类型
Action: query_logs(service="order-service", level="ERROR", start_time="14:30", end_time="14:35")
Observation: 大量 "Connection refused" 错误，指向 payment-service:8080

Thought: 下游 payment-service 不可达，查 payment-service 健康状态
Action: query_metrics(metric="up", service="payment-service", time_range="last_10min")
Observation: payment-service 在 14:31 开始 down，0 个实例在线

Thought: 查 payment-service 最近是否有部署
Action: get_recent_deploys(service="payment-service", hours_back=1)
Observation: 14:30 有一次部署，版本 v2.3.1

Thought: 部署时间和故障时间吻合，高度怀疑新版本有问题。查历史 runbook
Action: search_runbook(keywords="payment-service down after deploy")
Observation: 历史处置：回滚到上一版本，执行命令 kubectl rollout undo deployment/payment-service

根因报告：
- 根因：payment-service v2.3.1 部署后立即崩溃（时间吻合度 99%）
- 影响：order-service 全量依赖 payment-service，错误率 15%
- 置信度：95%
- 建议操作：立即回滚 payment-service 到 v2.3.0（命令已准备好）
- 预计恢复时间：2 分钟
```

---

**四、核心设计亮点**

**4.1 证据链追踪**

Agent 的每个结论都要有证据支撑，输出报告格式化为"根因 → 证据 → 操作建议"三层：
```python
report = {
    "root_cause": "payment-service v2.3.1 启动失败",
    "evidence": [
        {"type": "log", "content": "Connection refused to payment-service:8080"},
        {"type": "metric", "content": "payment-service up=0 since 14:31"},
        {"type": "deploy", "content": "payment-service v2.3.1 deployed at 14:30"},
    ],
    "confidence": 0.95,
    "actions": [
        {"priority": "P0", "action": "rollback", "command": "kubectl rollout undo..."},
    ],
    "estimated_recovery": "2 min",
}
```

**4.2 人工介入点**

高危操作（回滚、扩容、重启）不自动执行，需要 On-Call 工程师确认：
```python
if action.risk_level == "HIGH":
    send_notification(oncall_engineer, report)
    await interrupt({"report": report, "proposed_action": action})
    # 等待工程师确认后才执行
```

**4.3 时效性**

告警到根因报告 < 3 分钟（并发查询工具，不串行等待）：
```python
# 并发查询日志、指标、部署记录
logs, metrics, deploys = await asyncio.gather(
    query_logs(alert.service, alert.time),
    query_metrics(alert.service, alert.time),
    get_recent_deploys(alert.service, hours_back=2)
)
```

**考察点**：
1. 工具集的完整性（日志/指标/链路/变更/知识库）
2. 证据链设计（可审计的推理过程）
3. 并发工具调用降低延迟
4. 高危操作的 HITL 设计

**示例答案**：

On-Call Agent 的设计原则是**快速+可信**——3 分钟内给出根因，且每个结论必须有可验证的证据。

工具集是核心：日志查询（ES）、指标查询（Prometheus）、链路追踪（Jaeger）、部署记录（CD 平台）、历史 runbook（RAG 知识库）——五类工具覆盖了根因排查的 90% 场景。

执行流程用 ReAct：收到告警后，Agent 先查错误日志明确错误类型，再根据错误指向查下游服务状态，发现问题再查最近变更记录……像经验丰富的工程师一样沿着证据链推理。关键优化是**并发工具调用**：日志/指标/部署记录并发查，不串行等，3 分钟内完成。

输出报告结构化为"根因→证据→操作建议"三层，每条证据标注来源（日志行/指标截图/部署时间），置信度透明。高危操作（回滚/重启）通过 interrupt() 暂停等待工程师确认，Agent 负责分析，人负责决策，做到"AI 加速、人工把关"。

---

### Q88: 设计一个自动化简历筛选 Agent

**🏢 高频公司**：阿里（招聘系统）、字节 HR Tech

**题目解析**：
高频招聘场景，考察候选人如何用 AI 辅助 HR 工作，同时警惕算法偏见问题。

---

**一、需求拆解**

**目标**：从 100 份简历中筛选出 Top-20 进入电话面试，同时给每份简历一个评分报告。

**核心考量**：
- 匹配维度：技能匹配 + 经验相关度 + 项目质量 + 教育背景
- 公平性：不能因为学校/性别/年龄歧视候选人
- 可解释性：HR 需要看到每个维度的评分理由
- 人工可干预：HR 可以修改权重和入选名单

---

**二、系统架构**

```
JD（职位描述）
     │ 解析 + 结构化
     ▼
JD 要求矩阵：
  必须技能（Java/Python）
  加分技能（K8s/Flink）
  经验年限要求（3-5年）
  项目类型偏好（大规模分布式）

     ↓ （向量化）

简历 PDF/DOCX → 解析 → 结构化简历 → 多维度评分
                                          │
                         ┌────────────────┴────────────────────┐
                         │                │                     │
                  技能覆盖率 (35%)    经验相关度 (40%)    项目亮点 (25%)
                    （LLM 分析）        （LLM + 规则）      （LLM 评估）
                         │
                         ▼
                    综合评分 + 评语
                         │
                  HR 审核界面（可修改权重）
                         │
                         ▼
                    最终候选人名单
```

---

**三、关键设计**

**3.1 JD 结构化**

```python
class JDRequirements(BaseModel):
    must_have_skills: list[str]    # 必须具备
    nice_to_have: list[str]        # 加分项
    experience_years: tuple[int, int]  # 经验年限范围
    education: str                 # 学历要求
    key_project_types: list[str]  # 偏好的项目类型
    seniority: str                 # 初/中/高级

# 用 LLM 从 JD 文本提取
jd_req = await llm.extract(jd_text, response_model=JDRequirements)
```

**3.2 多维度评分**

```python
async def score_resume(resume: Resume, jd: JDRequirements) -> ScoreReport:
    # 并发计算各维度
    skill_score, exp_score, project_score = await asyncio.gather(
        score_skills(resume, jd),         # 技能覆盖率
        score_experience(resume, jd),     # 经验相关度  
        score_projects(resume, jd),       # 项目质量和规模
    )
    
    total = skill_score * 0.35 + exp_score * 0.40 + project_score * 0.25
    
    return ScoreReport(
        total=total,
        skill_score=skill_score,
        exp_score=exp_score,
        project_score=project_score,
        strengths=extract_strengths(resume, jd),
        gaps=extract_gaps(resume, jd),
        recommendation=classify(total),   # Strong Yes / Yes / Maybe / No
    )
```

**3.3 偏见防御**

```python
# 简历匿名化：在评分前移除姓名/性别/年龄/照片/学校名称
def anonymize_resume(resume: Resume) -> AnonymizedResume:
    return AnonymizedResume(
        # 保留：技能/经验年限/项目描述/成就
        skills=resume.skills,
        years_of_experience=resume.years_of_experience,
        projects=resume.projects,
        achievements=resume.achievements,
        # 移除：姓名/性别/学校/照片/出生年月
    )
```

**3.4 HR 审核界面**

Agent 给建议，HR 做最终决定：
- 显示评分分布（百分位）
- 允许 HR 调整权重（拖拽滑块）
- 对每份简历的评分 HR 可以打 override（覆盖 Agent 建议）
- 每周生成偏见报告（入选者属性分布，检测算法偏见）

**考察点**：
1. 匿名化处理（消除可能的歧视维度）
2. 评分可解释性（每个维度有具体理由）
3. Human-in-the-loop（HR 可以覆盖 Agent 决策）
4. 公平性监控（事后审查入选者分布）

**面试官更想听**：
- 主动提出"偏见防御是这个场景最重要的非功能需求，不亚于准确率"
- 说出具体的匿名化策略（不只是说"防止歧视"）
- 区分"辅助 HR 决策"和"替代 HR 决策"——Agent 不应该有最终决定权

**示例答案**：

简历筛选 Agent 设计里，公平性和可解释性的优先级不低于准确性。

核心流程：JD → LLM 结构化提取必须技能/加分技能/经验要求 → 简历解析 → 匿名化（移除姓名/学校/照片/年龄，只保留技能和经验）→ 多维度并发评分（技能覆盖率 35%/经验相关度 40%/项目质量 25%）→ 生成带理由的评分报告 → HR 审核。

匿名化是关键设计——评分时模型看不到候选人的名字、学校、性别，只看能力和经验，避免"名校光环"或性别偏见影响打分。技能评分用规则（匹配度直接计算），经验和项目质量用 LLM（需要语义理解），两者各有优势。

最重要的是：Agent 只给建议，HR 有最终决定权，界面上显示每个候选人的评分细节（"缺少 K8s 经验"-3分），HR 可以一键 override。每季度生成一次入选者属性分布报告，如果某个维度（如特定大学占比异常高）出现偏差，说明 Agent 或 JD 描述有偏见，需要调整。

---

### Q89: 设计一个旅游规划 Agent

**🏢 高频公司**：字节（旅游赛道）、小红书

**题目解析**：
旅游规划是典型的"复杂多步骤 + 多工具 + 个性化"场景，很适合考察 Agent 的综合设计能力。

---

**一、需求拆解**

**用户输入**："我想去日本东京玩 5 天，预算 1.5 万，喜欢美食和拍照，有一个 6 岁小孩"
**输出**：完整的旅行方案（行程/酒店/交通/预算分配/注意事项）

---

**二、工具集设计**

```python
tools = [
    # 信息查询类
    Tool("search_attractions", "搜索景点信息、评分、适合人群、最佳游览时间"),
    Tool("search_restaurants", "搜索餐厅、菜系、人均价格、是否适合小孩"),
    Tool("get_weather", "查询旅行日期的天气预报"),
    Tool("search_hotels", "查询酒店信息、价格、位置、儿童友好设施"),
    Tool("get_transport_options", "查询两地交通方式和时间（地铁/公交/出租）"),
    
    # 预订类（可选，需要用户授权）
    Tool("check_flight_price", "查询机票价格"),
    Tool("check_hotel_availability", "查询酒店可用房型和价格"),
    
    # 实用信息
    Tool("get_visa_info", "查询签证要求"),
    Tool("get_exchange_rate", "查询汇率"),
    Tool("search_travel_notes", "搜索小红书/知乎游记"),  # RAG 知识库
]
```

---

**三、规划策略**

**分步骤生成，而非一次生成所有内容**：

```
Step 1: 理解需求 → 提取关键信息（人数/预算/偏好/限制）
Step 2: 制定框架 → 每天分配区域（减少交通时间）
Step 3: 填充景点 → 按偏好查询并筛选适合的景点
Step 4: 安排餐食 → 结合景点位置推荐餐厅
Step 5: 安排住宿 → 根据每天活动区域选合适酒店
Step 6: 预算验算 → 汇总费用，超出预算则调整
Step 7: 生成最终方案 → 按天格式化输出
```

**个性化处理**：
```python
def personalize_plan(user_profile: TravelProfile) -> PlanConstraints:
    constraints = []
    
    if "小孩" in user_profile.companions:
        constraints += [
            "景点过滤：排除年龄限制的游乐设施",
            "每天最多 3 个景点（小孩体力有限）",
            "行程节奏：上午景点 → 午休 → 下午景点",
            "餐厅要求：有儿童椅，菜品口味不太重",
        ]
    
    if user_profile.interests == "拍照":
        constraints += [
            "优先包含上镜景点（teamLab/浅草寺）",
            "安排黄金拍照时段（日出/日落）",
        ]
    
    return constraints
```

**预算管理**：
```python
class BudgetTracker:
    def __init__(self, total: float, currency: str = "CNY"):
        self.total = total
        self.allocated = defaultdict(float)
    
    def allocate(self, category: str, amount: float) -> bool:
        remaining = self.total - sum(self.allocated.values())
        if amount > remaining:
            return False  # 超预算，需要调整
        self.allocated[category] += amount
        return True
    
    def suggest_adjustment(self) -> str:
        """超预算时给出调整建议"""
        ...
```

---

**四、难点与权衡**

| 难点 | 解决方案 |
|------|---------|
| 信息时效性（价格/营业时间会变）| 所有查询加时间戳，提示用户"以实际为准" |
| 方案太长用户看不下去 | 先输出摘要（每天一句话），详细内容按需展开 |
| 多人偏好冲突（一人喜欢博物馆，一人喜欢购物）| 主动询问优先级，或按半天拆分满足不同偏好 |
| 实时价格不准确 | 只给价格区间（参考），引导用户自行预订 |
| 突发情况处理（天气不好）| 提供 Plan B 备选方案 |

**考察点**：
1. 工具调用的顺序和依赖（必须先定区域框架再查景点，先查景点再查餐厅）
2. 预算约束的实时管理
3. 个性化约束的提取和应用
4. 用户确认节点的设计（生成粗略方案后让用户调整，再细化）

**示例答案**：

旅游规划 Agent 的关键挑战是"规划是有顺序和依赖的"——不能同时查所有东西，必须先定框架再填细节。

**分步骤规划**：先从用户需求提取约束（5天/预算1.5万/带小孩/美食+拍照）→ 设计每天的区域框架（减少不必要移动）→ 按区域查询景点（过滤掉不适合小孩的）→ 匹配餐厅（位置近 + 儿童友好）→ 选住宿（中间位置，有儿童设施）→ 预算校验。

带小孩的特殊处理：每天景点不超过 3 个，加入午休时间段，餐厅必须有儿童椅，机票/酒店优先考虑儿童设施——这些约束从用户描述里提取，主动代入规划逻辑，不需要用户反复提醒。

用户确认节点：先输出"每天一句话的框架"（Day1: 浅草+上野，重点拍照），用户确认后再展开详细时间表。超预算时不是报错，而是说"方案合计约 1.8 万，超出 3000 元，建议调整：(1)酒店降一档-2000 (2)减少一天行程-1500，您更倾向哪种方案？"

---

### Q90: 设计一个 AI 写作助手 Agent（面向小红书内容创作者）

**🏢 高频公司**：小红书（内部创作者工具）、字节

**题目解析**：
内容创作是小红书的核心业务，AI 写作助手帮助创作者提效，考察 Agent 与创作流程的深度结合。

---

**一、需求拆解**

**创作者痛点**：
- 标题不吸引人，数据差
- 正文结构乱，逻辑不清
- 关键词埋入生硬，SEO 差
- 多平台发布（小红书/微博/公众号）格式不同

**Agent 能力**：
- 给定主题 → 一键生成内容大纲
- 草稿完善（补充细节/增加互动钩子）
- 标题 A/B 测试建议（生成 5 个标题变体）
- SEO 关键词建议和自然植入
- 多平台适配（字数/格式/风格调整）
- 爆款内容参考（RAG 检索同类热门内容）

---

**二、核心工作流**

```
用户输入：主题/关键词/内容类型
    │
    ▼
[创作意图理解]
  - 内容类型（测评/教程/日记/好物分享）
  - 目标受众（学生/职场/宝妈）
  - 风格偏好（干货/种草/故事性）
    │
    ▼
[灵感激发层]
  - 搜索同类热门内容（小红书内部数据 + RAG）
  - 分析爆款共同特征（标题结构/封面规律/互动点）
    │
    ▼
[大纲生成] → 用户确认/修改
    │
    ▼
[正文生成]（流式输出，用户可实时干预）
    │
    ▼
[多维度优化]
  ├── 标题优化（生成 5 个变体，预估点击率）
  ├── 关键词植入（SEO 优化，自然度检查）
  ├── 互动钩子添加（问题/投票/话题标签）
  └── 多平台适配（字数/格式转换）
    │
    ▼
一键发布 or 导出
```

---

**三、关键技术**

**3.1 爆款特征学习（RAG + 结构化知识）**

```python
# 索引热门笔记，提取爆款规律
class ViralContentKnowledge:
    def get_template(self, content_type: str, category: str) -> ContentTemplate:
        # 检索同类热门内容的结构模板
        examples = self.rag.search(f"{content_type} {category} 爆款", k=5)
        pattern = analyze_common_pattern(examples)
        return ContentTemplate(
            title_patterns=pattern.title_structures,
            opening_hooks=pattern.opening_strategies,
            key_sections=pattern.section_types,
            cta_patterns=pattern.call_to_action_styles,
        )
```

**3.2 个性化风格保留**

```python
# 分析用户历史作品，建立写作风格模型
def extract_writing_style(user_posts: list[Post]) -> StyleProfile:
    return StyleProfile(
        tone=analyze_tone(user_posts),           # 活泼/严肃/幽默
        avg_sentence_length=calc_avg_len(user_posts),
        emoji_usage=calc_emoji_frequency(user_posts),
        common_phrases=extract_phrases(user_posts),
        preferred_structure=analyze_structure(user_posts),
    )
```

**3.3 标题 CTR 预估**

```python
# 用历史数据训练的标题评分模型，预估点击率
def score_title(title: str, category: str) -> TitleScore:
    features = {
        "has_number": bool(re.search(r'\d', title)),
        "has_emoji": bool(re.search(r'[\U00010000-\U0010ffff]', title)),
        "length": len(title),
        "has_question": '？' in title or '?' in title,
        "category_match": compute_relevance(title, category),
        "sentiment": analyze_sentiment(title),
    }
    return model.predict(features)
```

---

**四、难点与权衡**

| 难点 | 解决方案 |
|------|---------|
| 生成内容太"AI 味" | Fine-tuning 用户自己的笔记风格；让用户描述自己的风格关键词 |
| 关键词植入生硬 | 先写完再插入，Natural Language Paraphrasing 保证流畅度 |
| 抄袭风险（RAG 参考爆款）| 只参考结构不参考具体词句；输出前做重复度检测 |
| 创作者对 AI 依赖过度 | 强调"辅助"定位，不提供"一键复制"，要求用户参与修改 |
| 平台规则变化 | 规则知识库 RAG 化，运营人员随时更新 |

**考察点**：
1. RAG 知识库用于学习爆款规律（不只是问答）
2. 个性化风格的提取和保留
3. 多轮协作的工作流（生成→确认→优化，不是一次性输出）
4. 平台规则合规检查

**示例答案**：

小红书写作助手 Agent 的核心是**"辅助"而非"替代"**——最好的体验是创作者觉得"Agent 懂我，帮我把想说的说得更好"。

爆款学习用 RAG：索引平台热门笔记，提取结构模板（标题规律/开篇钩子/常用句式/话题标签），根据用户的内容类型（测评/教程/好物）检索对应模板作为参考。注意是参考结构而非内容，防抄袭。

个性化是差异化关键：分析用户历史 20 篇笔记，提取写作风格（语气/emoji 密度/句子长度/惯用开篇词），生成内容时注入风格约束，让 AI 写出来的内容和用户平时的风格一致，降低"AI 味"。

多轮协作工作流：大纲确认（用户可以调整方向）→ 正文流式生成（用户可以打断修改）→ 优化阶段（标题变体+关键词建议+互动钩子）→ 多平台适配。每个阶段都是用户可控的，Agent 不做独裁者。

标题是转化关键，提供 5 个变体并预估点击率（用历史数据训练的特征模型），让用户自己选择或组合，效果远好于 AI 直接给一个"最优标题"。

---

### Q91: 设计一个智能财务报告分析 Agent

**🏢 高频公司**：阿里、腾讯

**题目解析**：
财务数据分析是高价值 AI 应用场景，涉及结构化数据理解、图表解读、风险识别，也考察安全和合规意识。

---

**一、核心能力**

- 解读财务报告（资产负债表/利润表/现金流量表）
- 识别异常指标（毛利率下滑/债务攀升/现金流异常）
- 多报告对比分析（同比/环比/行业对标）
- 自然语言查询（"应收账款周转天数趋势如何？"）
- 风险预警（潜在财务风险的早期信号）

---

**二、系统设计**

**多模态输入处理**：
```python
class FinancialReportParser:
    def parse(self, doc: Document) -> StructuredReport:
        if doc.type == "pdf":
            # 1. OCR + 表格识别（财报里大量是表格）
            tables = extract_tables_with_ocr(doc)
            # 2. 识别报表类型（资产负债表/利润表/现金流）
            classified = classify_tables(tables)
            # 3. 标准化为统一数据模型
            return normalize_to_standard(classified)
```

**核心指标计算 Agent**：
```python
# 内置财务指标计算工具（不依赖 LLM 计算，避免数字幻觉）
@tool
def calculate_ratios(report: StructuredReport) -> FinancialRatios:
    return FinancialRatios(
        gross_margin    = report.gross_profit / report.revenue,
        current_ratio   = report.current_assets / report.current_liabilities,
        debt_to_equity  = report.total_debt / report.total_equity,
        ar_days         = report.accounts_receivable / report.revenue * 365,
        # ...
    )
```

**关键原则：数字计算用代码，文字解读用 LLM**：
```python
# 不让 LLM 做数字计算（幻觉风险极高）
# LLM 只做定性分析和文字解读
analysis_prompt = f"""
基于以下计算好的财务指标，提供专业分析：
{ratios.to_dict()}

重点关注：
1. 哪些指标出现了异常变化（超出行业基准）
2. 变化的可能原因
3. 潜在的风险提示

注意：所有数字结论必须来自上面提供的数据，不要自行计算或估算。
"""
```

**风险预警规则（规则 + LLM 双引擎）**：
```python
RISK_RULES = [
    Rule("应收账款周转天数连续 3 季度上升", severity="medium"),
    Rule("经营性现金流为负且净利润为正（利润质量差）", severity="high"),
    Rule("资产负债率超过行业平均值 20%", severity="high"),
    Rule("存货增速超过收入增速 50%", severity="medium"),
]

# 规则触发后，LLM 生成详细解读
if rule.triggered:
    explanation = await llm.explain_risk(rule, report_data, industry_context)
```

---

**三、安全与合规**

```python
# 财务数据极度敏感，需要严格权限控制
class FinancialDataAccessControl:
    def check_access(self, user: User, report: Report) -> bool:
        # 只有 CFO/财务团队/合规审计 可以访问完整报告
        return user.role in report.authorized_roles
    
    def audit_log(self, user: User, action: str, report: Report):
        # 每次访问都留下审计记录
        audit_db.log(user_id, action, report_id, timestamp)

# Agent 输出必须标注"仅供参考，不构成投资建议"
DISCLAIMER = "以上分析基于提供的财务数据，仅供内部参考，不构成投资建议。"
```

**考察点**：
1. 数字计算用代码工具（不用 LLM 算数，防止幻觉）
2. 规则引擎 + LLM 的双引擎风险识别
3. 财务数据的安全和权限控制
4. 合规免责声明

**示例答案**：

财务分析 Agent 最大的技术挑战是**防止数字幻觉**——LLM 对数字计算不可靠，财务场景里数字错误代价极大。

核心设计原则：数字由代码计算，语言由 LLM 解读。所有财务比率（毛利率/流动比率/应收账款周转天数）用 Python 代码直接计算，LLM 只负责解读这些已经算好的数字（"毛利率从 35% 下降到 28%，降幅显著，可能原因是..."）。这样做把幻觉风险降到最低。

风险识别用双引擎：规则引擎（逻辑清晰，可审计）负责触发已知风险模式（"经营性现金流为负且净利润为正"是典型利润质量差信号），LLM 负责对触发的规则生成详细背景分析和可能原因。新的风险模式由 LLM 发现，但需要人工审核后才加入规则库。

多报告对比时，强调"同比"和"行业基准"，孤立地看一个数字没意义——应收账款周转天数 60 天，在快消行业是正常的，在软件行业就异常高了。知识库里存了行业基准数据，检索后作为对比参照注入分析 prompt。

安全上，财务数据加严格权限控制，每次访问记录审计日志，所有输出加"仅供内部参考"免责声明。

---

