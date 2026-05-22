# 算法面试题库 · 第五批（冲刺 100 题）

---

### Q91: 并查集（Union-Find）实现 · 朋友圈 LC 547

**🏢 高频公司**：字节、腾讯
**难度**：中等 ⭐⭐

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

**复杂度**：近似 O(N × α(N))，α 是反阿克曼函数，实际近似 O(1)

**考察点**：路径压缩 + 按秩合并的双重优化；岛屿数量也可用并查集

---

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

### Q93: 最长公共前缀（Trie 优化）· LeetCode 14 进阶

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

**考察点**：分治将问题拆为两半，每半求 LCP，合并；时间同样 O(S)，但更利于并行

---

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

