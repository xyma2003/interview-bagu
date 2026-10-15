# 算法面试题库 · 第五批（冲刺 100 题）

<!-- navigation:start -->
[← 算法目录](README.md) · [12 周学习路线](../LEARNING_GUIDE.md) · [首页](../README.md)

<a id="question-index"></a>

<details>
<summary>本页题目（10 题，点击展开）</summary>

- [Q91 · 并查集（Union-Find）实现 · 省份数量 LC 547](#q91)
- [Q92 · 零矩阵 · LeetCode 73](#q92)
- [Q93 · 最长公共前缀（分治法）· LeetCode 14 进阶](#q93)
- [Q94 · 回文链表判断 · LeetCode 234](#q94)
- [Q95 · 字符串转整数（atoi）· LeetCode 8](#q95)
- [Q96 · 在排序矩阵中查找目标值 · LeetCode 240](#q96)
- [Q97 · 找到所有数字消失的数字 · LeetCode 448](#q97)
- [Q98 · 最短路径（Bellman-Ford）· LeetCode 787](#q98)
- [Q99 · 打乱数组（Fisher-Yates 洗牌算法）· LeetCode 384](#q99)
- [Q100 · 数字 1 的个数 · LeetCode 233](#q100)

</details>
<!-- navigation:end -->

> 来源状态：本页只核验 Q91。其他题中的旧公司／频率标签未有可追溯面经支持，不作为事实；范围见[来源规范与核验记录](../SOURCE_AUDIT.md)。

---

<a id="q91"></a>

<a id="review-algorithm-q91"></a>

### Q91: 并查集（Union-Find）实现 · 省份数量 LC 547

> **核验日期**：2026-10-15
>
> **适用范围**：Python 3.9+；LC 547 的非空、对称 0/1 邻接矩阵，主对角线为 1；采用按秩合并与路径压缩。
>
> **技术参考**：[LC 547：省份数量与矩阵约束](https://leetcode.com/problems/number-of-provinces/)；[Cornell ORIE 6125：Union-find](https://people.orie.cornell.edu/prs233/orie-6125/data-structures/union-find.html)
>
> **面经来源**：未提供可追溯面经；不标注公司或出现频率。

**难度**：中等 ⭐⭐

**题目**：给定城市之间直接连通关系的对称 0/1 矩阵，求连通分量数量。矩阵对角线为 1；遍历严格上三角即可处理每条无向关系一次。示例按原题约束使用，不适用于一般非对称矩阵。

**题目讲解**：
```python
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.components = n   # 连通分量数
    
    def find(self, x) -> int:
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # 路径压缩
        return self.parent[x]
    
    def union(self, x, y) -> bool:
        px, py = self.find(x), self.find(y)
        if px == py: return False
        # 按秩合并（矮树合并到高树）
        if self.rank[px] < self.rank[py]: px, py = py, px
        self.parent[py] = px
        if self.rank[px] == self.rank[py]: self.rank[px] += 1
        self.components -= 1
        return True

def findCircleNum(isConnected: list[list[int]]) -> int:
    n = len(isConnected)
    uf = UnionFind(n)
    for i in range(n):
        for j in range(i+1, n):
            if isConnected[i][j]: uf.union(i, j)
    return uf.components
```

**复杂度**：设 `N` 为城市数量（矩阵边长），`E` 为矩阵严格上三角（`i < j`）中值为 1 的元素个数，即调用 `union` 的次数。

- 初始化并查集需要 O(N)；双层循环无论城市是否相连，都会检查 `N(N−1)/2` 个矩阵元素，扫描成本为 O(N²)。
- 路径压缩与按秩合并使每次并查集操作的摊还成本为 O(α(N))，其中 α 是反阿克曼函数；`E` 次合并的摊还成本为 O(E × α(N))。
- 总时间上界为 **O(N² + E × α(N))**。由于 `E ≤ N(N−1)/2`，可写成最坏情形的摊还上界 **O(N² × α(N))**；实际规模下 α(N) 很小，可近似看作 O(N²)，不能忽略矩阵扫描而写成近似线性时间。
- 额外空间为 **O(N)**，用于 `parent`、`rank` 和递归调用栈；不计输入矩阵本身的 O(N²) 空间。

**考察点**：路径压缩 + 按秩合并的双重优化；岛屿数量也可用并查集

---

<a id="q92"></a>

### Q92: 零矩阵 · LeetCode 73

**🏢 高频公司**：字节
**难度**：中等 ⭐⭐

**题目**：矩阵中某元素为 0，则将其所在行列全置 0，O(1) 空间。

**题目讲解**（用第一行/列作标记）：
```python
def setZeroes(matrix: list[list[int]]) -> None:
    m, n = len(matrix), len(matrix[0])
    row0 = any(matrix[0][j] == 0 for j in range(n))
    col0 = any(matrix[i][0] == 0 for i in range(m))
    
    for i in range(1, m):
        for j in range(1, n):
            if matrix[i][j] == 0:
                matrix[i][0] = matrix[0][j] = 0
    
    for i in range(1, m):
        for j in range(1, n):
            if matrix[i][0] == 0 or matrix[0][j] == 0:
                matrix[i][j] = 0
    
    if row0:
        for j in range(n): matrix[0][j] = 0
    if col0:
        for i in range(m): matrix[i][0] = 0
```

**考察点**：用第一行/列当标记数组，先处理中间，后处理边界

---

<a id="q93"></a>

### Q93: 最长公共前缀（分治法）· LeetCode 14 进阶

**题目讲解**（分治法）：
```python
def longestCommonPrefix(strs: list[str]) -> str:
    def lcp(s1: str, s2: str) -> str:
        i = 0
        while i < len(s1) and i < len(s2) and s1[i] == s2[i]:
            i += 1
        return s1[:i]
    
    def divide(lo, hi) -> str:
        if lo == hi: return strs[lo]
        mid = (lo + hi) // 2
        left  = divide(lo, mid)
        right = divide(mid+1, hi)
        return lcp(left, right)
    
    return divide(0, len(strs) - 1) if strs else ""
```

**复杂度**：设 `N` 为字符串数量、`S` 为所有输入字符串的字符总数，时间为 O(N + S)；若字符串均非空，可简写为 O(S)。

**考察点**：分治将字符串数组拆为两半，分别求最长公共前缀（LCP），再合并两侧结果；这里没有构建 Trie。当前代码顺序执行左右递归；子问题相互独立，但并未实现并行。

---

<a id="q94"></a>

### Q94: 回文链表判断 · LeetCode 234

**🏢 高频公司**：腾讯
**难度**：简单 ⭐

**题目讲解**（快慢指针 + 翻转后半段，O(N) 时间 O(1) 空间）：
```python
def isPalindrome(head) -> bool:
    # 1. 找中点
    slow = fast = head
    while fast and fast.next:
        slow = slow.next; fast = fast.next.next
    
    # 2. 翻转后半段
    prev, curr = None, slow
    while curr:
        nxt = curr.next; curr.next = prev; prev = curr; curr = nxt
    
    # 3. 比较前后两段
    left, right = head, prev
    while right:
        if left.val != right.val: return False
        left = left.next; right = right.next
    return True
```

**考察点**：找中点 + 翻转后半 + 比较；做完可以还原链表（面试加分）

---

<a id="q95"></a>

### Q95: 字符串转整数（atoi）· LeetCode 8

**🏢 高频公司**：字节、腾讯
**难度**：中等 ⭐⭐

**题目讲解**（状态机）：
```python
def myAtoi(s: str) -> int:
    s = s.lstrip()
    if not s: return 0
    
    sign = 1
    i = 0
    if s[0] in '+-':
        sign = -1 if s[0] == '-' else 1
        i = 1
    
    result = 0
    INT_MAX, INT_MIN = 2**31 - 1, -(2**31)
    
    while i < len(s) and s[i].isdigit():
        result = result * 10 + int(s[i])
        i += 1
        if sign * result > INT_MAX: return INT_MAX
        if sign * result < INT_MIN: return INT_MIN
    
    return sign * result
```

**考察点**：处理顺序（去空格→判断符号→读数字→处理溢出）；溢出要提前判断

---

<a id="q96"></a>

### Q96: 在排序矩阵中查找目标值 · LeetCode 240

**🏢 高频公司**：字节
**难度**：中等 ⭐⭐

**题目**：行列均有序的矩阵中搜索目标值，O(M+N) 时间。

**题目讲解**（从右上角开始）：
```python
def searchMatrix(matrix: list[list[int]], target: int) -> bool:
    r, c = 0, len(matrix[0]) - 1
    while r < len(matrix) and c >= 0:
        val = matrix[r][c]
        if val == target: return True
        elif val < target: r += 1   # 当前行太小，向下走
        else: c -= 1                # 当前列太大，向左走
    return False
```

**考察点**：从右上角出发，每步排除一行或一列；类似"有序的决策树"

---

<a id="q97"></a>

### Q97: 找到所有数字消失的数字 · LeetCode 448

**🏢 高频公司**：腾讯
**难度**：简单 ⭐

**题目讲解**（原地标记，O(N) 时间 O(1) 空间）：
```python
def findDisappearedNumbers(nums: list[int]) -> list[int]:
    for n in nums:
        idx = abs(n) - 1
        if nums[idx] > 0:
            nums[idx] = -nums[idx]   # 标记 idx+1 出现过
    return [i+1 for i, v in enumerate(nums) if v > 0]
```

**考察点**：用负号标记"出现过"，不需要额外数组；最后正数位置对应消失的数字

---

<a id="q98"></a>

### Q98: 最短路径（Bellman-Ford）· LeetCode 787

**🏢 高频公司**：字节
**难度**：中等 ⭐⭐

**题目**：最多经过 K 站中转，从 src 到 dst 的最便宜机票价格。

**题目讲解**（Bellman-Ford K 次松弛）：
```python
def findCheapestPrice(n: int, flights: list[list[int]], src: int, dst: int, k: int) -> int:
    prices = [float('inf')] * n
    prices[src] = 0
    
    for _ in range(k + 1):   # 最多 k+1 条边
        tmp = prices[:]
        for u, v, w in flights:
            if prices[u] != float('inf') and prices[u] + w < tmp[v]:
                tmp[v] = prices[u] + w
        prices = tmp
    
    return prices[dst] if prices[dst] != float('inf') else -1
```

**考察点**：`tmp = prices[:]` 防止同一轮松弛中连续更新（同一轮只能用上一轮的结果）

---

<a id="q99"></a>

### Q99: 打乱数组（Fisher-Yates 洗牌算法）· LeetCode 384

**🏢 高频公司**：字节
**难度**：中等 ⭐⭐

**题目讲解**：
```python
import random

class Solution:
    def __init__(self, nums: list[int]):
        self.original = nums[:]
        self.nums = nums
    
    def reset(self) -> list[int]:
        self.nums[:] = self.original
        return self.nums
    
    def shuffle(self) -> list[int]:
        n = len(self.nums)
        for i in range(n-1, 0, -1):
            j = random.randint(0, i)   # 随机选 [0, i] 中的一个
            self.nums[i], self.nums[j] = self.nums[j], self.nums[i]
        return self.nums
```

**复杂度**：O(N) 时间，O(1) 空间（原地）

**考察点**：Fisher-Yates 每个排列出现概率相等（均匀随机）；Knuth 洗牌的数学证明

---

<a id="q100"></a>

### Q100: 数字 1 的个数 · LeetCode 233

**🏢 高频公司**：字节（数学题）
**难度**：困难 ⭐⭐⭐

**题目**：统计 1 到 n 中数字 1 出现的次数。

**题目讲解**（逐位统计）：
```python
def countDigitOne(n: int) -> int:
    count = 0
    factor = 1
    while factor <= n:
        higher = n // (factor * 10)
        current = (n // factor) % 10
        lower = n % factor
        
        if current == 0:
            count += higher * factor
        elif current == 1:
            count += higher * factor + lower + 1
        else:
            count += (higher + 1) * factor
        
        factor *= 10
    return count
```

**考察点**：分三种情况讨论当前位为 0/1/2+ 时的贡献；`factor` 从个位到最高位遍历

---

*本批共 10 题（Q91-Q100），算法分支题目达到 100 道整。*

---


<!-- navigation:start -->
[↑ 回到本页题目目录](#question-index) · [返回算法目录](README.md)
<!-- navigation:end -->
