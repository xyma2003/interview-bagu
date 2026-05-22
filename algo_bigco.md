# 算法面试题库 · 大厂高频专项

> 字节/腾讯/小红书/阿里 真实面试算法题，含详细解析

---

### Q71: 字节 面试：找到数组中出现次数超过 n/3 的所有元素 · LeetCode 229

**🏢 高频公司**：字节
**难度**：中等 ⭐⭐

**题目**：找出数组中出现次数大于 ⌊n/3⌋ 的所有元素，要求 O(N) 时间 O(1) 空间。

**题目讲解**（Boyer-Moore 投票算法）：
超过 n/3 的元素最多有 2 个，维护两个候选者：
```python
def majorityElement(nums: list[int]) -> list[int]:
    cand1 = cand2 = None
    cnt1 = cnt2 = 0
    for n in nums:
        if n == cand1:
            cnt1 += 1
        elif n == cand2:
            cnt2 += 1
        elif cnt1 == 0:
            cand1, cnt1 = n, 1
        elif cnt2 == 0:
            cand2, cnt2 = n, 1
        else:
            cnt1 -= 1; cnt2 -= 1
    # 验证候选者是否真的超过 n/3
    return [c for c in (cand1, cand2) if c is not None and nums.count(c) > len(nums) // 3]
```
**复杂度**：O(N) 时间，O(1) 空间

**考察点**：Boyer-Moore 投票算法的推广（超过 n/k 最多 k-1 个候选）

---

### Q72: 字节 面试：最长连续序列 · LeetCode 128

**🏢 高频公司**：字节（必考）、腾讯
**难度**：中等 ⭐⭐

**题目**：找出数组中最长连续整数序列的长度，要求 O(N)。

**题目讲解**：
```python
def longestConsecutive(nums: list[int]) -> int:
    num_set = set(nums)
    ans = 0
    for n in num_set:
        if n - 1 not in num_set:   # 只从序列起点开始计数
            cur = n
            streak = 1
            while cur + 1 in num_set:
                cur += 1; streak += 1
            ans = max(ans, streak)
    return ans
```
**复杂度**：O(N) —— 每个数字最多被访问两次

**考察点**：先判断是否是序列起点（n-1 不在 set），避免重复计算

---

### Q73: 腾讯 面试：滑动窗口最大值 · LeetCode 239

**🏢 高频公司**：腾讯、字节（困难高频）
**难度**：困难 ⭐⭐⭐

**题目**：给定数组和窗口大小 k，返回每个滑动窗口的最大值。

**题目讲解**（单调递减双端队列）：
```python
from collections import deque

def maxSlidingWindow(nums: list[int], k: int) -> list[int]:
    dq = deque()   # 存下标，维护单调递减（队首是当前窗口最大值的下标）
    res = []
    for i, x in enumerate(nums):
        # 移出窗口外的元素
        while dq and dq[0] < i - k + 1:
            dq.popleft()
        # 维护单调性：移出所有比当前值小的
        while dq and nums[dq[-1]] < x:
            dq.pop()
        dq.append(i)
        if i >= k - 1:
            res.append(nums[dq[0]])
    return res
```
**复杂度**：O(N) 时间，O(K) 空间

**考察点**：单调双端队列；队首是窗口最大值，入队前清理比当前值小的元素

---

### Q74: 字节 面试：最长有效括号 · LeetCode 32（DP 解法）

**🏢 高频公司**：字节
**难度**：困难 ⭐⭐⭐

**DP 解法**：
```python
def longestValidParentheses(s: str) -> int:
    n = len(s)
    dp = [0] * n   # dp[i] = 以 s[i] 结尾的最长有效括号长度
    ans = 0
    for i in range(1, n):
        if s[i] == ')':
            if s[i-1] == '(':
                dp[i] = (dp[i-2] if i >= 2 else 0) + 2
            elif dp[i-1] > 0:
                j = i - dp[i-1] - 1   # 与当前 ')' 配对的 '(' 的位置
                if j >= 0 and s[j] == '(':
                    dp[i] = dp[i-1] + 2 + (dp[j-1] if j > 0 else 0)
            ans = max(ans, dp[i])
    return ans
```

**考察点**：DP 状态转移的两种情况（前一个是 `(`；前面是有效子串，再往前是 `(`）

---

### Q75: 阿里 面试：单词拆分 · LeetCode 139

**🏢 高频公司**：阿里、字节
**难度**：中等 ⭐⭐

**题目**：判断字符串能否由字典中的单词拼接而成。

**题目讲解**（完全背包 DP）：
```python
def wordBreak(s: str, wordDict: list[str]) -> bool:
    word_set = set(wordDict)
    n = len(s)
    dp = [False] * (n + 1)
    dp[0] = True
    for i in range(1, n + 1):
        for j in range(i):
            if dp[j] and s[j:i] in word_set:
                dp[i] = True
                break
    return dp[n]
```
**复杂度**：O(N² × M)，N = len(s)，M = 平均单词长度

**考察点**：dp[i] 的含义（前 i 个字符能否被拆分）；追问：打印所有可能的拆分方案（回溯）

---

### Q76: 字节 面试：最小路径和 · LeetCode 64

**🏢 高频公司**：字节、腾讯
**难度**：中等 ⭐⭐

**题目讲解**：
```python
def minPathSum(grid: list[list[int]]) -> int:
    m, n = len(grid), len(grid[0])
    for i in range(m):
        for j in range(n):
            if i == 0 and j == 0: continue
            elif i == 0: grid[i][j] += grid[i][j-1]
            elif j == 0: grid[i][j] += grid[i-1][j]
            else: grid[i][j] += min(grid[i-1][j], grid[i][j-1])
    return grid[-1][-1]
```
**复杂度**：O(MN) 时间，O(1) 空间（原地修改）

---

### Q77: 腾讯 面试：不同路径 II（含障碍物）· LeetCode 63

**题目讲解**：
```python
def uniquePathsWithObstacles(grid: list[list[int]]) -> int:
    m, n = len(grid), len(grid[0])
    dp = [0] * n
    dp[0] = 1
    for i in range(m):
        for j in range(n):
            if grid[i][j] == 1:
                dp[j] = 0
            elif j > 0:
                dp[j] += dp[j-1]
    return dp[-1]
```

---

### Q78: 字节 面试：打家劫舍 III（树形 DP）· LeetCode 337

**🏢 高频公司**：字节
**难度**：中等 ⭐⭐

**题目**：二叉树中不能偷相邻节点，求最大能偷的金额。

**题目讲解**：
```python
def rob(root) -> int:
    def dfs(node):
        if not node: return (0, 0)  # (不偷当前节点的最大值, 偷当前节点的最大值)
        l_no, l_yes = dfs(node.left)
        r_no, r_yes = dfs(node.right)
        no  = max(l_no, l_yes) + max(r_no, r_yes)  # 不偷当前，左右各取最大
        yes = node.val + l_no + r_no                # 偷当前，左右只能不偷
        return (no, yes)
    return max(dfs(root))
```

**考察点**：每个节点返回"偷/不偷"两种状态，避免重复计算

---

