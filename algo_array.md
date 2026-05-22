# 算法面试题库 · 数组 / 双指针 / 滑动窗口 / 二分查找

> 覆盖 LeetCode 高频题，每题含：思路分析 / Python 代码 / 复杂度 / 考察点 / 大厂追问
> 🏢 标注各题高频出现公司

---

### Q1: 两数之和 (Two Sum) · LeetCode 1

**🏢 高频公司**：字节、腾讯、阿里、小红书（几乎全部大厂必考）
**难度**：简单 ⭐

**题目**：给定整数数组 `nums` 和目标值 `target`，返回和为 `target` 的两个元素下标。

**题目解析**：
最基础的哈希表应用，考察候选人能否从 O(N²) 暴力优化到 O(N)，是大厂面试热身题。

**题目讲解**：
- 暴力：双重循环，O(N²) 时间，O(1) 空间
- 哈希表：一次遍历，对每个 `x` 查 `target-x` 是否已在表中，O(N) 时间，O(N) 空间

```python
def twoSum(nums: list[int], target: int) -> list[int]:
    seen = {}  # value -> index
    for i, x in enumerate(nums):
        complement = target - x
        if complement in seen:
            return [seen[complement], i]
        seen[x] = i
    return []
```

**复杂度**：时间 O(N)，空间 O(N)

**考察点**：
1. 哈希表 O(1) 查询替代线性搜索
2. 边界：同一元素不能用两次（用 index 区分）
3. 数组有序时可用双指针 O(1) 空间

**面试官更想听**：
主动说出"如果数组有序可以用双指针，空间降到 O(1)"，以及"如果有多对解怎么返回"。

**示例答案**：
核心思路是空间换时间：用哈希表记录已见过的值和对应下标，对当前值只需 O(1) 查找其补数是否存在。遍历一次即可，时间 O(N)。注意不能用同一元素两次，所以先查后存（不是先存后查）。有序数组的进阶版用双指针，左右指针夹逼，空间 O(1)。

---

### Q2: 三数之和 (3Sum) · LeetCode 15

**🏢 高频公司**：字节、腾讯、阿里（高频）
**难度**：中等 ⭐⭐

**题目**：找出数组中所有和为 0 的不重复三元组。

**题目解析**：
在两数之和基础上增加去重难度，考察双指针技巧和边界处理。

**题目讲解**：
```python
def threeSum(nums: list[int]) -> list[list[int]]:
    nums.sort()
    res = []
    for i in range(len(nums) - 2):
        if nums[i] > 0: break          # 已排序，最小数>0则无解
        if i > 0 and nums[i] == nums[i-1]: continue  # 跳过重复的第一个数
        l, r = i + 1, len(nums) - 1
        while l < r:
            s = nums[i] + nums[l] + nums[r]
            if s == 0:
                res.append([nums[i], nums[l], nums[r]])
                while l < r and nums[l] == nums[l+1]: l += 1  # 跳过重复
                while l < r and nums[r] == nums[r-1]: r -= 1
                l += 1; r -= 1
            elif s < 0: l += 1
            else: r -= 1
    return res
```

**复杂度**：时间 O(N²)，空间 O(1)（排序 O(N log N)，双指针 O(N)）

**考察点**：
1. 先排序，再双指针（O(N²) 是该题最优）
2. 三处去重：外层循环、左指针移动后、右指针移动后
3. 提前剪枝：nums[i] > 0 时后面不可能有解

**示例答案**：
排序后固定第一个数 `nums[i]`，用双指针在剩余部分找两数之和等于 `-nums[i]`。关键是去重：外层循环跳过相同的 `nums[i]`；找到一个解后，左右指针都要跳过连续重复元素再继续搜索。时间复杂度 O(N²) 是该问题的下界，无法优化到更低。

---

### Q3: 盛最多水的容器 · LeetCode 11

**🏢 高频公司**：字节、腾讯
**难度**：中等 ⭐⭐

**题目**：给定高度数组，找出两条线使容器装水最多。

**题目讲解**：
```python
def maxArea(height: list[int]) -> int:
    l, r = 0, len(height) - 1
    ans = 0
    while l < r:
        ans = max(ans, min(height[l], height[r]) * (r - l))
        # 移动较矮的一侧（移动较高侧只会让面积变小）
        if height[l] < height[r]:
            l += 1
        else:
            r -= 1
    return ans
```

**复杂度**：时间 O(N)，空间 O(1)

**考察点**：
1. 双指针从两端向中间夹逼
2. 贪心策略：移动较矮的一侧（移动较高侧，宽度减小且高度受限于较矮侧，面积只能变小或不变）

**示例答案**：
双指针从首尾向中间靠拢。每次计算当前容积，然后移动较矮的那根柱子——因为移动较高侧，宽度必然减小而高度上限不变（还是受较矮侧限制），面积不可能更大；移动较矮侧，宽度减小但高度有可能增大，值得一试。

---

