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

### Q27: 二叉树的层序遍历 · LeetCode 102

**🏢 高频公司**：字节、腾讯（高频）
**难度**：中等 ⭐⭐

**题目讲解**：
```python
from collections import deque

def levelOrder(root) -> list[list[int]]:
    if not root: return []
    res, q = [], deque([root])
    while q:
        level = []
        for _ in range(len(q)):
            node = q.popleft()
            level.append(node.val)
            if node.left:  q.append(node.left)
            if node.right: q.append(node.right)
        res.append(level)
    return res
```

**考察点**：BFS 标准模板；`for _ in range(len(q))` 处理逐层

---

### Q28: 验证二叉搜索树 · LeetCode 98

**🏢 高频公司**：字节、腾讯、阿里
**难度**：中等 ⭐⭐

**题目讲解**：
```python
def isValidBST(root, lo=float('-inf'), hi=float('inf')) -> bool:
    if not root: return True
    if not (lo < root.val < hi): return False
    return (isValidBST(root.left,  lo, root.val) and
            isValidBST(root.right, root.val, hi))
```

**考察点**：传递上下界（不只是和父节点比），中序遍历结果必须严格递增

---

