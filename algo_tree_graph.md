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

### Q33: 腐烂的橘子 · LeetCode 994

**🏢 高频公司**：字节、小红书
**难度**：中等 ⭐⭐

**题目**：多源 BFS，求所有新鲜橘子腐烂的最少分钟数。

**题目讲解**：
```python
from collections import deque

def orangesRotting(grid: list[list[int]]) -> int:
    rows, cols = len(grid), len(grid[0])
    q = deque()
    fresh = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 2: q.append((r, c, 0))
            elif grid[r][c] == 1: fresh += 1
    
    minutes = 0
    while q:
        r, c, t = q.popleft()
        for dr, dc in [(0,1),(0,-1),(1,0),(-1,0)]:
            nr, nc = r+dr, c+dc
            if 0<=nr<rows and 0<=nc<cols and grid[nr][nc] == 1:
                grid[nr][nc] = 2
                fresh -= 1
                minutes = t + 1
                q.append((nr, nc, t+1))
    return minutes if fresh == 0 else -1
```

**考察点**：多源 BFS（所有腐烂橘子同时出发）；时间戳随 BFS 层数增加

---

### Q34: 课程表（拓扑排序）· LeetCode 207

**🏢 高频公司**：字节、腾讯
**难度**：中等 ⭐⭐

**题目**：判断课程能否完成（检测有向图是否有环）。

**题目讲解**（Kahn 算法 BFS 拓扑排序）：
```python
from collections import deque

def canFinish(numCourses: int, prerequisites: list[list[int]]) -> bool:
    in_degree = [0] * numCourses
    graph = [[] for _ in range(numCourses)]
    for a, b in prerequisites:
        graph[b].append(a)
        in_degree[a] += 1
    
    q = deque(i for i in range(numCourses) if in_degree[i] == 0)
    finished = 0
    while q:
        node = q.popleft()
        finished += 1
        for nxt in graph[node]:
            in_degree[nxt] -= 1
            if in_degree[nxt] == 0:
                q.append(nxt)
    return finished == numCourses
```

**考察点**：Kahn 算法（BFS 拓扑排序）；DFS 的三色标记法也可以

---

### Q35: 单词接龙 · LeetCode 127

**🏢 高频公司**：字节
**难度**：困难 ⭐⭐⭐

**题目**：找出 beginWord → endWord 的最短转换序列长度（每次只改一个字母，且必须在字典中）。

**题目讲解**（双向 BFS 优化）：
```python
from collections import deque

def ladderLength(beginWord: str, endWord: str, wordList: list[str]) -> int:
    word_set = set(wordList)
    if endWord not in word_set: return 0
    
    front, back = {beginWord}, {endWord}
    step = 1
    while front:
        step += 1
        next_front = set()
        for word in front:
            for i in range(len(word)):
                for c in 'abcdefghijklmnopqrstuvwxyz':
                    new_word = word[:i] + c + word[i+1:]
                    if new_word in back: return step
                    if new_word in word_set:
                        next_front.add(new_word)
                        word_set.discard(new_word)
        front = next_front
        if len(front) > len(back):   # 始终从小的一侧 BFS
            front, back = back, front
    return 0
```

**考察点**：双向 BFS 将复杂度从 O(b^d) 降到 O(b^(d/2))；b=分支因子，d=深度

---

### Q36: 全排列 · LeetCode 46

**🏢 高频公司**：字节、腾讯（回溯经典）
**难度**：中等 ⭐⭐

**题目讲解**：
```python
def permute(nums: list[int]) -> list[list[int]]:
    res = []
    def backtrack(path, used):
        if len(path) == len(nums):
            res.append(path[:])
            return
        for i, x in enumerate(nums):
            if used[i]: continue
            used[i] = True
            path.append(x)
            backtrack(path, used)
            path.pop()
            used[i] = False
    backtrack([], [False]*len(nums))
    return res
```

**考察点**：回溯三要素（选择/递归/撤销）；used 数组标记已用元素

---

### Q37: 子集 · LeetCode 78

**🏢 高频公司**：字节
**难度**：中等 ⭐⭐

**题目讲解**：
```python
def subsets(nums: list[int]) -> list[list[int]]:
    res = []
    def backtrack(start, path):
        res.append(path[:])   # 每个路径都是一个子集
        for i in range(start, len(nums)):
            path.append(nums[i])
            backtrack(i+1, path)
            path.pop()
    backtrack(0, [])
    return res
```

**考察点**：start 参数避免重复选择之前的元素；子集不需要"终止条件"，每个节点都记录

---

### Q38: 组合总和 · LeetCode 39

**🏢 高频公司**：字节、腾讯
**难度**：中等 ⭐⭐

**题目**：找出数组中所有和为 target 的组合（元素可重复使用）。

**题目讲解**：
```python
def combinationSum(candidates: list[int], target: int) -> list[list[int]]:
    res = []
    candidates.sort()
    def backtrack(start, path, remaining):
        if remaining == 0:
            res.append(path[:]); return
        for i in range(start, len(candidates)):
            if candidates[i] > remaining: break   # 剪枝
            path.append(candidates[i])
            backtrack(i, path, remaining - candidates[i])  # i 不是 i+1（可重用）
            path.pop()
    backtrack(0, [], target)
    return res
```

**考察点**：可重复使用时传 `i`，不可重复时传 `i+1`；排序+剪枝提效

---

### Q39: N 皇后 · LeetCode 51

**🏢 高频公司**：字节（困难必考）
**难度**：困难 ⭐⭐⭐

**题目讲解**：
```python
def solveNQueens(n: int) -> list[list[str]]:
    res = []
    cols = set(); diag1 = set(); diag2 = set()  # 列、左斜、右斜
    board = [['.'] * n for _ in range(n)]
    
    def backtrack(row):
        if row == n:
            res.append([''.join(r) for r in board]); return
        for col in range(n):
            if col in cols or (row-col) in diag1 or (row+col) in diag2:
                continue
            cols.add(col); diag1.add(row-col); diag2.add(row+col)
            board[row][col] = 'Q'
            backtrack(row + 1)
            board[row][col] = '.'
            cols.discard(col); diag1.discard(row-col); diag2.discard(row+col)
    
    backtrack(0)
    return res
```

**考察点**：三个集合记录冲突；主对角线 `row-col` 相等，副对角线 `row+col` 相等

---

### Q40: 单词搜索 · LeetCode 79

**🏢 高频公司**：字节、腾讯
**难度**：中等 ⭐⭐

**题目讲解**：
```python
def exist(board: list[list[str]], word: str) -> bool:
    rows, cols = len(board), len(board[0])
    
    def dfs(r, c, k):
        if k == len(word): return True
        if not (0<=r<rows and 0<=c<cols) or board[r][c] != word[k]:
            return False
        tmp, board[r][c] = board[r][c], '#'  # 标记已访问
        found = any(dfs(r+dr, c+dc, k+1) for dr, dc in [(0,1),(0,-1),(1,0),(-1,0)])
        board[r][c] = tmp   # 回溯
        return found
    
    return any(dfs(r, c, 0) for r in range(rows) for c in range(cols))
```

**考察点**：原地修改标记已访问（不用 visited 矩阵），回溯时恢复

---

### Q41: 被围绕的区域 · LeetCode 130

**🏢 高频公司**：字节
**难度**：中等 ⭐⭐

**题目**：将所有不与边界相连的 'O' 改为 'X'。

**题目讲解**：
逆向思维：从边界的 'O' 出发 DFS，标记为 'S'（安全），最后 'O'→'X'，'S'→'O'：
```python
def solve(board: list[list[str]]) -> None:
    rows, cols = len(board), len(board[0])
    def dfs(r, c):
        if not (0<=r<rows and 0<=c<cols) or board[r][c] != 'O': return
        board[r][c] = 'S'
        for dr, dc in [(0,1),(0,-1),(1,0),(-1,0)]: dfs(r+dr, c+dc)
    # 从四条边出发
    for r in range(rows):
        for c in [0, cols-1]: dfs(r, c)
    for c in range(cols):
        for r in [0, rows-1]: dfs(r, c)
    # 转换
    for r in range(rows):
        for c in range(cols):
            if   board[r][c] == 'O': board[r][c] = 'X'
            elif board[r][c] == 'S': board[r][c] = 'O'
```

**考察点**：逆向 DFS（从答案反推），比正向判断更简洁

---

### Q42: 实现 Trie（前缀树）· LeetCode 208

**🏢 高频公司**：字节、腾讯
**难度**：中等 ⭐⭐

**题目讲解**：
```python
class Trie:
    def __init__(self):
        self.children = {}
        self.is_end = False
    
    def insert(self, word: str) -> None:
        node = self
        for c in word:
            if c not in node.children:
                node.children[c] = Trie()
            node = node.children[c]
        node.is_end = True
    
    def search(self, word: str) -> bool:
        node = self._find(word)
        return node is not None and node.is_end
    
    def startsWith(self, prefix: str) -> bool:
        return self._find(prefix) is not None
    
    def _find(self, s: str):
        node = self
        for c in s:
            if c not in node.children: return None
            node = node.children[c]
        return node
```

**考察点**：Trie 的插入/搜索/前缀查找；追问：用数组替代字典（26 个字母时更快）

---

### Q43: 克隆图 · LeetCode 133

**🏢 高频公司**：字节
**难度**：中等 ⭐⭐

**题目讲解**：
```python
def cloneGraph(node):
    if not node: return None
    visited = {}
    def dfs(n):
        if n in visited: return visited[n]
        clone = Node(n.val)
        visited[n] = clone
        for neighbor in n.neighbors:
            clone.neighbors.append(dfs(neighbor))
        return clone
    return dfs(node)
```

**考察点**：哈希表记录已克隆节点（处理环形图）

---

### Q44: 网络延迟时间（Dijkstra）· LeetCode 743

**🏢 高频公司**：字节、腾讯
**难度**：中等 ⭐⭐

**题目**：单源最短路，求从 k 出发到达所有节点的最短时间。

**题目讲解**：
```python
import heapq
from collections import defaultdict

def networkDelayTime(times: list[list[int]], n: int, k: int) -> int:
    graph = defaultdict(list)
    for u, v, w in times:
        graph[u].append((v, w))
    
    dist = {i: float('inf') for i in range(1, n+1)}
    dist[k] = 0
    heap = [(0, k)]  # (distance, node)
    
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]: continue  # 已有更短路径，跳过
        for v, w in graph[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                heapq.heappush(heap, (dist[v], v))
    
    ans = max(dist.values())
    return ans if ans < float('inf') else -1
```

**复杂度**：O((V+E) log V)

**考察点**：Dijkstra 优先队列实现；`if d > dist[u]: continue` 懒删除优化

---

### Q45: 最长公共子序列 · LeetCode 1143

**🏢 高频公司**：字节、腾讯（DP 经典）
**难度**：中等 ⭐⭐

**题目讲解**：
```python
def longestCommonSubsequence(text1: str, text2: str) -> int:
    m, n = len(text1), len(text2)
    dp = [[0] * (n+1) for _ in range(m+1)]
    for i in range(1, m+1):
        for j in range(1, n+1):
            if text1[i-1] == text2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    return dp[m][n]
```

**复杂度**：O(MN) 时间，O(MN) 空间（可滚动数组压缩到 O(N)）

**考察点**：二维 DP 的状态定义；最长公共子串（连续）的状态转移不同

---

### Q46: 零钱兑换 · LeetCode 322

**🏢 高频公司**：字节、腾讯、阿里
**难度**：中等 ⭐⭐

**题目**：凑成 amount 的最少硬币数（完全背包）。

**题目讲解**：
```python
def coinChange(coins: list[int], amount: int) -> int:
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    for coin in coins:
        for a in range(coin, amount + 1):
            dp[a] = min(dp[a], dp[a - coin] + 1)
    return dp[amount] if dp[amount] != float('inf') else -1
```

**复杂度**：O(amount × N)

**考察点**：完全背包（正序遍历 amount）vs 0/1 背包（逆序）

---

### Q47: 最长递增子序列 · LeetCode 300

**🏢 高频公司**：字节、腾讯（必考 DP）
**难度**：中等 ⭐⭐

**方法一：DP O(N²)**：
```python
def lengthOfLIS(nums: list[int]) -> int:
    dp = [1] * len(nums)
    for i in range(1, len(nums)):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp)
```

**方法二：贪心+二分 O(N log N)**：
```python
import bisect
def lengthOfLIS(nums: list[int]) -> int:
    tails = []   # tails[i] = 长度为 i+1 的 LIS 的最小末尾元素
    for x in nums:
        pos = bisect.bisect_left(tails, x)
        if pos == len(tails): tails.append(x)
        else: tails[pos] = x
    return len(tails)
```

**考察点**：`bisect_left` 的语义（第一个 `>= x` 的位置）；tails 不是实际 LIS，只是辅助计数

---

### Q48: 编辑距离 · LeetCode 72

**🏢 高频公司**：字节（必考 DP）
**难度**：困难 ⭐⭐⭐

**题目讲解**：
```python
def minDistance(word1: str, word2: str) -> int:
    m, n = len(word1), len(word2)
    dp = list(range(n+1))
    for i in range(1, m+1):
        prev = dp[:]
        dp[0] = i
        for j in range(1, n+1):
            if word1[i-1] == word2[j-1]:
                dp[j] = prev[j-1]
            else:
                dp[j] = 1 + min(prev[j],    # 删除
                                dp[j-1],    # 插入
                                prev[j-1])  # 替换
    return dp[n]
```

**复杂度**：O(MN) 时间，O(N) 空间（滚动数组）

**考察点**：三种操作的状态转移；滚动数组压缩空间

---

