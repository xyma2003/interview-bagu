# 示例验证：运行文档里的代码

[返回首页](README.md#example-checks) · [算法导航](algorithm/README.md) · [来源核验](SOURCE_AUDIT.md) · [报告错误](CONTRIBUTING.md)

当前自动检查 **17 / 341 道题**：15 道算法题、前端 Q37 的四个 Promise 实现，以及 Q39 的取消与重试。同一题的多种实现不重复计数。这里记录代码检查范围；[23 / 341 题的技术来源核验](SOURCE_AUDIT.md)是另一项工作，两者有重叠，不能相加。

## 如何运行

在仓库根目录执行，无需安装第三方包，也不需要 API Key：

```bash
# Python 3.12+：15 道算法题，使用标准库 unittest
python3 -m unittest discover -s tests -p 'test_algorithm*.py' -v

# Node.js 22+：Q37 Promise 与 Q39 取消重试示例
node --test tests/promise-*.test.cjs tests/fetch-retry.test.cjs
```

两条命令都应退出为 0；Python 显示 `OK`，Node 显示失败数为 0。命令只执行本地文档和测试，不访问在线题库。修改代码后运行相关检查，再观察报错中的题目位置和失败输入。

Python 的 [提取器](tests/markdown_examples.py)按文件和 Q 题号读取唯一 Python 代码块，在独立命名空间中执行，并保留原 Markdown 行号；块缺失或多义会直接报错。测试只补节点夹具、输入与预期值，不复制答案。Promise 测试从前端 Q37 提取对应实现，在隔离的 VM 中与未改写的原生实现对照。这些执行环境用于隔离定义，并不是运行不可信代码的安全沙箱。

<a id="algorithm-checks"></a>

## 15 道算法题的检查范围

题号为本库 Q 号。测试以有效输入为主；额外允许的空输入列在表中，不把任意非法参数处理当作题目要求。固定种子的生成案例可重复运行，小规模独立参照用于发现遗漏，并非全输入证明。

| 题目 | 检查内容与独立参照 | 输入与副作用边界 |
|---|---|---|
| [Q1 两数之和](algorithm/algo_array.md#q1) | 重复值、负数、零；枚举索引对，对照唯一解 | 至少两个整数，恰有一解；不复用同一索引，不改变输入 |
| [Q2 三数之和](algorithm/algo_array.md#q2) | 无解、全零、多解与去重；枚举三元组合 | 整数数组；本实现会原地排序，结果顺序不限 |
| [Q5 最长无重复子串](algorithm/algo_array.md#q5) | 空串、重复窗口、空格；枚举子串，另加中文扩展示例 | 中文是本实现的额外检查；按 Python 字符串元素处理，不按用户可见字形聚合 |
| [Q19 二分查找](algorithm/algo_array.md#q19) | 首尾、单元素、命中与缺失；线性查找参照 | 非空、严格递增整数数组 |
| [Q21 查找首尾位置](algorithm/algo_array.md#q21) | 空数组、重复段、边界缺失；枚举全部匹配位置 | 非递减整数数组；`target + 1` 写法按整数范围使用 |
| [Q22 有效括号](algorithm/algo_array.md#q22) | 错误嵌套、孤立闭括号、长嵌套；反复消去相邻括号对 | 只包含 `()[]{}`，不扩展为一般文本解析器 |
| [Q26 二叉树最大深度](algorithm/algo_tree_graph.md#q26) | 递归与 BFS 对照路径深度；深树单独检查 BFS | 无环树，可为空；递归版受调用栈限制 |
| [Q27 层序遍历](algorithm/algo_tree_graph.md#q27) | 空树、稀疏树、重复值与深树，核对层次顺序 | 无环树；不改写节点 |
| [Q28 验证 BST](algorithm/algo_tree_graph.md#q28) | 两实现检查重复值和祖先约束；迭代版检查深树 | 无环整数二叉树，按严格 BST 判断，重复值判假；空树返回真为额外约定，递归版受调用栈限制 |
| [Q32 岛屿数量](algorithm/algo_tree_graph.md#q32) | 分离岛、对角不连通、小网格并查集参照、300×300 全陆地 | 矩形字符网格，允许空网格；上下左右相连，原地清除陆地 |
| [Q34 课程表](algorithm/algo_tree_graph.md#q34) | 无依赖、自环、多节点环与分离分量；枚举课程顺序 | 课程编号有效；不要求返回具体拓扑顺序 |
| [Q36 全排列](algorithm/algo_tree_graph.md#q36) | 单元素、多元素与独立结果列表；对照标准库 permutations | 输入整数互不相同，不承诺重复值去重；额外约定空数组返回 `[[]]` |
| [Q46 零钱兑换](algorithm/algo_tree_graph.md#q46) | 金额零、不可达、非贪心最优、多币种；小金额独立搜索 | 面额为正整数，金额非负；不把负面额当有效输入 |
| [Q51 反转链表](algorithm/algo_linked_design.md#q51) | 两实现、空链、节点身份、末尾断链；迭代版另测长链 | 无环单链表，原地反转；递归版仅用于浅链 |
| [Q58 LRU 缓存](algorithm/algo_linked_design.md#q58) | 容量一、更新与读取刷新顺序、淘汰；固定操作流对照 OrderedDict | 正整数容量；不要求线程安全或持久化 |

测试文件：[数组、字符串与 LRU](tests/test_algorithm_arrays.py) · [树、图、动态规划与链表](tests/test_algorithm_structures.py)。

<a id="promise-checks"></a>

## Promise 检查范围

[前端 Q37](frontend/frontend_bigco.md#q37)的 `myAll` / `myAny` 覆盖空输入、稀疏数组、可迭代对象、thenable、成功与拒绝顺序、迭代异常等边界；简化 `myRace` 检查普通稠密数组的竞争顺序与异步回调。仍为教学实现，不宣称完整 polyfill。

简化 [`myAllSettled` 的独立回归](tests/promise-allsettled.test.cjs)同时提取本题的 `myAll` 依赖与 `myAllSettled`，与原生 `Promise.allSettled` 对照普通稠密数组：空输入、普通值、全成功/全拒绝/混合结果、thenable、`status` 与 `value`/`reason` 字段、值和拒绝原因的对象身份、逆序完成仍保持输入顺序、等待未完成项、异步回调，以及调用返回后修改原数组不改变已收集任务。

`myAllSettled` 仍不支持稀疏数组和通用 iterable；数组访问器/代理在映射期间改写输入、映射阶段同步异常、Promise 子类及被改写的内建方法不在支持范围内。thenable 自身的 `then` getter 抛错由原生 `Promise.resolve` 转成拒绝，属于已检查场景。组合实现增加 Promise 链，不保证与原生方法具有完全相同的微任务时序。Q37 四个实现均有各自限定范围的回归，不等于完整规范一致性验证。

<a id="fetch-retry-checks"></a>

## 取消与重试检查范围

[前端 Q39](frontend/frontend_bigco.md#q39)的[独立回归](tests/fetch-retry.test.cjs)直接提取原文的重试函数和组合函数，用真实 `AbortController`、固定 fetch 响应及可控计时器验证：请求前取消、请求中取消、退避等待中取消、取消后不再请求、计时器和监听器清理，以及直接返回可调用的 `cancel()`。

保留 `maxRetries=3`、`delay=1000`、`backoff=2` 和原有 `shouldRetry` 规则，并检查正常成功、重试耗尽和自定义停止条件。组合函数合并外部信号与自身取消信号，要求支持 `AbortSignal.any` 的现代浏览器或 Node.js 22+。测试不发真实网络请求，不验证服务器端取消、真实网络耗时或所有浏览器版本。这仍是教学示例，没有新增超时、jitter 或请求幂等策略。

## 这轮检查带来的修正

- Q32：递归 DFS 改为显式栈，避免 300×300 连通网格触发递归深度限制；保持原地修改行为。
- Q51：迭代 `reverseList` 与递归 `reverseList_recursive` 分别命名，避免复制整段后只剩递归版本。
- Q28：补 `isValidBST_iterative` 处理深树；Q26 明确深树使用已有 BFS。递归版本保留讲解用途，不宣称支持任意树高。
- Q2：修正 CPython 排序辅助空间与结果空间说明，限定全解枚举的最坏输出成本。

依据：[Python 3.12 递归限制说明](https://docs.python.org/3.12/library/sys.html#sys.setrecursionlimit)、[CPython 3.12 排序实现说明](https://github.com/python/cpython/blob/3.12/Objects/listsort.txt)，以及 [LC 200](https://leetcode.com/problems/number-of-islands/description/)、[LC 206](https://leetcode.com/problems/reverse-linked-list/description/)、[LC 104](https://leetcode.com/problems/maximum-depth-of-binary-tree/description/)、[LC 98](https://leetcode.com/problems/validate-binary-search-tree/description/)的输入约束。没有通过提高递归上限掩盖问题。

## CI 与尚未覆盖的部分

[Example checks](.github/workflows/examples.yml)在 Node.js 22 / 24 和 Python 3.12 / 3.13 上运行上述两套检查。执行状态以对应提交的 [Actions 记录](https://github.com/xyma2003/interview-bagu/actions/workflows/examples.yml)为准。

其余 324 道题未纳入这组自动回归，算法手册中的相似实现也不自动算作已测。测试不证明最优复杂度、所有运行时版本、极限资源消耗或真实服务效果；递归示例尤其需要结合深度限制阅读。发现问题时用[内容纠错表单](https://github.com/xyma2003/interview-bagu/issues/new?template=content-correction.yml)提交具体输入和依据，修改方式见[贡献说明](CONTRIBUTING.md)。
