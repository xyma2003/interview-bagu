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

### Q4: 接雨水 · LeetCode 42

**🏢 高频公司**：字节（必考）、腾讯、阿里
**难度**：困难 ⭐⭐⭐

**题目**：给定高度数组，计算可以接的雨水总量。

**题目讲解**：
每个位置能接的水 = `min(左侧最高, 右侧最高) - 当前高度`

**方法一：预处理左右最大值数组，O(N) 时间，O(N) 空间**：
```python
def trap(height: list[int]) -> int:
    n = len(height)
    left_max  = [0] * n  # left_max[i]  = max(height[0..i])
    right_max = [0] * n  # right_max[i] = max(height[i..n-1])
    left_max[0] = height[0]
    for i in range(1, n):
        left_max[i] = max(left_max[i-1], height[i])
    right_max[-1] = height[-1]
    for i in range(n-2, -1, -1):
        right_max[i] = max(right_max[i+1], height[i])
    return sum(min(left_max[i], right_max[i]) - height[i] for i in range(n))
```

**方法二：双指针，O(N) 时间，O(1) 空间**：
```python
def trap(height: list[int]) -> int:
    l, r = 0, len(height) - 1
    left_max = right_max = 0
    ans = 0
    while l < r:
        if height[l] < height[r]:
            if height[l] >= left_max: left_max = height[l]
            else: ans += left_max - height[l]
            l += 1
        else:
            if height[r] >= right_max: right_max = height[r]
            else: ans += right_max - height[r]
            r -= 1
    return ans
```

**复杂度**：O(N) 时间，O(1) 空间（双指针法）

**考察点**：
1. 单调栈解法（另一种 O(N) 思路）
2. 双指针维护 left_max/right_max 的正确性证明

**示例答案**：
先用 O(N) 空间预处理左右最大值是最直觉的做法。进阶到 O(1) 空间的双指针：当 `height[l] < height[r]` 时，右侧最大值至少是 `height[r]`，所以左侧的水量完全由 `left_max` 决定，可以直接计算并移动左指针。反之亦然。

---

### Q5: 最长无重复子串 · LeetCode 3

**🏢 高频公司**：字节、腾讯、小红书、阿里（超高频）
**难度**：中等 ⭐⭐

**题目**：找出字符串中不含重复字符的最长子串的长度。

**题目讲解**：
```python
def lengthOfLongestSubstring(s: str) -> int:
    char_index = {}  # char -> 最近出现的下标
    left = 0
    ans = 0
    for right, c in enumerate(s):
        if c in char_index and char_index[c] >= left:
            left = char_index[c] + 1  # 窗口左边收缩到重复字符的下一位
        char_index[c] = right
        ans = max(ans, right - left + 1)
    return ans
```

**复杂度**：时间 O(N)，空间 O(字符集大小)

**考察点**：
1. 滑动窗口的标准模板
2. `char_index[c] >= left` 的判断（字符可能在窗口外）

**示例答案**：
滑动窗口：右指针向右扩展，遇到已在窗口内的字符时，左指针跳到该字符上次出现位置的右边。用哈希表记录每个字符最后出现的下标，注意要判断其是否在当前窗口内（`>= left`），否则窗口外的旧记录会错误收缩左指针。

---

### Q6: 最小覆盖子串 · LeetCode 76

**🏢 高频公司**：字节（高频）、腾讯
**难度**：困难 ⭐⭐⭐

**题目**：找出 s 中包含 t 所有字符的最小子串。

**题目讲解**：
```python
from collections import Counter

def minWindow(s: str, t: str) -> str:
    need = Counter(t)
    window = {}
    left = 0
    valid = 0          # 已满足条件的字符数
    start, min_len = 0, float('inf')
    
    for right, c in enumerate(s):
        if c in need:
            window[c] = window.get(c, 0) + 1
            if window[c] == need[c]:
                valid += 1
        # 已覆盖所有字符，尝试收缩左窗口
        while valid == len(need):
            if right - left + 1 < min_len:
                start, min_len = left, right - left + 1
            lc = s[left]
            left += 1
            if lc in need:
                if window[lc] == need[lc]:
                    valid -= 1
                window[lc] -= 1
    
    return s[start:start+min_len] if min_len != float('inf') else ""
```

**复杂度**：时间 O(N+M)，空间 O(字符集)

**考察点**：
1. 滑动窗口"扩右-缩左"的双计数器模板
2. `valid` 计数器的维护（字符数刚好满足才计数）

**示例答案**：
滑动窗口进阶版：用 `need` 记录目标计数，`window` 记录当前窗口计数，`valid` 记录已完全满足的字符种数。右扩时更新 window；当 valid == 所需字符种数时，记录答案并收缩左边。这是"可变滑动窗口"的标准模板，背会后可以解决一类题。

---

