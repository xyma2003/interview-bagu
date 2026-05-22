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

