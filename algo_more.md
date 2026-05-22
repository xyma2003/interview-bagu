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

