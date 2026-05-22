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

