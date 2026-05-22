# 算法面试题库 · 树 / 图 / BFS / DFS / 回溯

---

### Q26: 二叉树的最大深度 · LeetCode 104

**🏢 高频公司**：所有大厂（入门题）
**难度**：简单 ⭐

**题目讲解**：
```python
def maxDepth(root) -> int:
    if not root: return 0
    return 1 + max(maxDepth(root.left), maxDepth(root.right))

# BFS 迭代版
from collections import deque
def maxDepth_bfs(root) -> int:
    if not root: return 0
    q, depth = deque([root]), 0
    while q:
        depth += 1
        for _ in range(len(q)):
            node = q.popleft()
            if node.left:  q.append(node.left)
            if node.right: q.append(node.right)
    return depth
```

**考察点**：递归 vs 迭代 BFS，面试时两种都会

---

