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

