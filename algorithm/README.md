# 算法学习目录

[← 首页](../README.md) · [12 周学习路线](../LEARNING_GUIDE.md) · [来源与核验记录](../SOURCE_AUDIT.md)

这里有两种读法：**按题型理解方法**，或**按题号练习**。题库共 100 题；算法手册是补充讲解，与题库有重复题，不另计入全库 338 题。

## 按题型学

打开[算法题型通关手册](algorithm-handbook.md)，从识别信号、模板到经典例题逐步阅读。手册提供章节与例题目录。

| 当前想练的内容 | 手册入口 |
|---|---|
| 指针与窗口 | [双指针](algorithm-handbook.md#handbook-two-pointers) · [滑动窗口](algorithm-handbook.md#handbook-sliding-window) |
| 查找与状态转移 | [二分](algorithm-handbook.md#handbook-binary-search) · [动态规划](algorithm-handbook.md#handbook-dp) |
| 队列与区间技巧 | [单调栈](algorithm-handbook.md#handbook-monotonic-stack) · [单调队列](algorithm-handbook.md#handbook-monotonic-queue) · [前缀和](algorithm-handbook.md#handbook-prefix-sum) |
| 搜索与连通性 | [回溯](algorithm-handbook.md#handbook-backtracking) · [BFS](algorithm-handbook.md#handbook-bfs) · [并查集](algorithm-handbook.md#handbook-union-find) |
| 其他专题 | [堆](algorithm-handbook.md#handbook-heap) · [贪心](algorithm-handbook.md#handbook-greedy) · [字符串](algorithm-handbook.md#handbook-strings) · [树](algorithm-handbook.md#handbook-trees) · [图](algorithm-handbook.md#handbook-graphs) |

## 按题目练

每篇页首可展开逐题目录。注意题库 Q 编号与 LeetCode 编号是两套编号，以题目标题为准。

| 材料 | 题目 | 主要内容 |
|---|---|---|
| [数组与查找](algo_array.md#question-index) | Q1–Q25 · 25 题 | 数组、双指针、窗口、二分、单调栈等 |
| [树、图与动态规划](algo_tree_graph.md#question-index) | Q26–Q50 · 25 题 | 树、图、BFS/DFS、回溯、动态规划 |
| [链表、设计与字符串](algo_linked_design.md#question-index) | Q51–Q70 · 20 题 | 链表、栈、缓存、字符串与 KMP |
| [综合练习](algo_bigco.md#question-index) | Q71–Q90 · 20 题 | 投票、单调队列、DP、链表与树等 |
| [并查集、矩阵与数学](algo_more.md#question-index) | Q91–Q100 · 10 题 | 并查集、矩阵、洗牌与数学等 |

**从一道题开始**：[两数之和 Q1](algo_array.md#q1) → [接雨水 Q4](algo_array.md#q4) → [滑动窗口最大值 Q73](algo_bigco.md#q73)。前者可作起步，后两题适合在学过对应方法后练习；这三题已纳入首批来源核验。

遇到不会的题，可先看对应手册章节，再独立重写并检查输入边界。手册模板不一定是可直接运行的程序；本轮只整理导航，完整示例验证仍按后续清单推进。
