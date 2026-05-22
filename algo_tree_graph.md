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

### Q29: 二叉树中的最大路径和 · LeetCode 124

**🏢 高频公司**：字节（必考困难）、腾讯
**难度**：困难 ⭐⭐⭐

**题目讲解**：
```python
def maxPathSum(root) -> int:
    ans = float('-inf')
    def dfs(node) -> int:       # 返回以 node 为端点的最大路径和
        nonlocal ans
        if not node: return 0
        left  = max(dfs(node.left),  0)   # 负数不取
        right = max(dfs(node.right), 0)
        ans = max(ans, node.val + left + right)   # 经过 node 的完整路径
        return node.val + max(left, right)        # 只能选一侧向上传递
    dfs(root)
    return ans
```

**考察点**：
1. `dfs` 返回值 = 以该节点为端点的最大值（只能选一侧延伸）
2. 经过节点的完整路径（两侧都取）用 `nonlocal ans` 更新全局最大

---

### Q30: 二叉树的最近公共祖先 · LeetCode 236

**🏢 高频公司**：字节、腾讯（高频）
**难度**：中等 ⭐⭐

**题目讲解**：
```python
def lowestCommonAncestor(root, p, q):
    if not root or root == p or root == q:
        return root
    left  = lowestCommonAncestor(root.left,  p, q)
    right = lowestCommonAncestor(root.right, p, q)
    if left and right: return root   # p/q 分别在左右子树
    return left or right             # 都在同一侧
```

**考察点**：递归的语义——返回在该子树中找到的节点（None/p/q/LCA）

---

### Q31: 从前序与中序遍历序列构造二叉树 · LeetCode 105

**🏢 高频公司**：字节、腾讯
**难度**：中等 ⭐⭐

**题目讲解**：
```python
def buildTree(preorder: list[int], inorder: list[int]):
    if not preorder: return None
    root_val = preorder[0]
    root = TreeNode(root_val)
    mid = inorder.index(root_val)
    root.left  = buildTree(preorder[1:1+mid], inorder[:mid])
    root.right = buildTree(preorder[1+mid:],  inorder[mid+1:])
    return root
```

**优化**：用哈希表存 inorder 值→索引，避免每次 `index()` 的 O(N)，总体 O(N)

**考察点**：前序第一个 = 根，中序中根的位置划分左右子树

---

### Q32: 岛屿数量 · LeetCode 200

**🏢 高频公司**：字节、腾讯、阿里、小红书（超高频）
**难度**：中等 ⭐⭐

**题目讲解**：
```python
def numIslands(grid: list[list[str]]) -> int:
    if not grid: return 0
    rows, cols = len(grid), len(grid[0])
    
    def dfs(r, c):
        if not (0 <= r < rows and 0 <= c < cols) or grid[r][c] != '1':
            return
        grid[r][c] = '0'   # 标记已访问（原地修改）
        for dr, dc in [(0,1),(0,-1),(1,0),(-1,0)]:
            dfs(r+dr, c+dc)
    
    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                dfs(r, c)
                count += 1
    return count
```

**复杂度**：O(M×N)

**考察点**：DFS/BFS 都行；追问：BFS 写法？Union-Find 写法？

---

