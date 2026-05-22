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

### Q7: 找到字符串中所有字母异位词 · LeetCode 438

**🏢 高频公司**：字节、腾讯
**难度**：中等 ⭐⭐

**题目**：找出 s 中所有 p 的字母异位词的起始索引。

**题目讲解**：
```python
from collections import Counter

def findAnagrams(s: str, p: str) -> list[int]:
    if len(s) < len(p): return []
    need = Counter(p)
    window = Counter(s[:len(p)])
    res = [0] if window == need else []
    
    for i in range(len(p), len(s)):
        # 右侧进窗口
        window[s[i]] += 1
        # 左侧出窗口
        left_char = s[i - len(p)]
        window[left_char] -= 1
        if window[left_char] == 0:
            del window[left_char]
        if window == need:
            res.append(i - len(p) + 1)
    return res
```

**复杂度**：时间 O(N)，空间 O(1)（字符集固定大小）

**考察点**：固定大小滑动窗口，Counter 比较

---

### Q8: 寻找两个有序数组的中位数 · LeetCode 4

**🏢 高频公司**：字节（必考困难题）、腾讯
**难度**：困难 ⭐⭐⭐

**题目**：找出两个有序数组合并后的中位数，要求 O(log(m+n))。

**题目讲解**：
二分分割：在较短数组上二分，找到分割点使左半部分元素数 = (m+n+1)/2。
```python
def findMedianSortedArrays(nums1: list[int], nums2: list[int]) -> float:
    # 确保 nums1 是较短的数组
    if len(nums1) > len(nums2):
        nums1, nums2 = nums2, nums1
    m, n = len(nums1), len(nums2)
    half = (m + n + 1) // 2
    lo, hi = 0, m
    
    while lo <= hi:
        i = (lo + hi) // 2      # nums1 的分割点
        j = half - i            # nums2 的分割点
        
        nums1_left_max  = nums1[i-1] if i > 0 else float('-inf')
        nums1_right_min = nums1[i]   if i < m else float('inf')
        nums2_left_max  = nums2[j-1] if j > 0 else float('-inf')
        nums2_right_min = nums2[j]   if j < n else float('inf')
        
        if nums1_left_max <= nums2_right_min and nums2_left_max <= nums1_right_min:
            # 找到正确分割
            left_max = max(nums1_left_max, nums2_left_max)
            if (m + n) % 2 == 1:
                return float(left_max)
            right_min = min(nums1_right_min, nums2_right_min)
            return (left_max + right_min) / 2
        elif nums1_left_max > nums2_right_min:
            hi = i - 1
        else:
            lo = i + 1
    return 0.0
```

**复杂度**：时间 O(log(min(m,n)))，空间 O(1)

**考察点**：
1. 二分搜索不只用于"查值"，这里用于"找分割点"
2. 边界（i=0 或 i=m 时的 ±inf 处理）

---

### Q9: 搜索旋转排序数组 · LeetCode 33

**🏢 高频公司**：字节、腾讯、阿里
**难度**：中等 ⭐⭐

**题目**：在旋转后的有序数组中搜索目标值。

**题目讲解**：
```python
def search(nums: list[int], target: int) -> int:
    l, r = 0, len(nums) - 1
    while l <= r:
        mid = (l + r) // 2
        if nums[mid] == target:
            return mid
        # 判断哪半边是有序的
        if nums[l] <= nums[mid]:   # 左半有序
            if nums[l] <= target < nums[mid]:
                r = mid - 1
            else:
                l = mid + 1
        else:                       # 右半有序
            if nums[mid] < target <= nums[r]:
                l = mid + 1
            else:
                r = mid - 1
    return -1
```

**复杂度**：时间 O(log N)，空间 O(1)

**考察点**：
1. 旋转数组中，mid 必然有一侧是有序的
2. 根据有序侧判断 target 是否在该范围内决定移动方向

---

### Q10: 寻找旋转排序数组中的最小值 · LeetCode 153

**🏢 高频公司**：字节、腾讯
**难度**：中等 ⭐⭐

**题目讲解**：
```python
def findMin(nums: list[int]) -> int:
    l, r = 0, len(nums) - 1
    while l < r:
        mid = (l + r) // 2
        if nums[mid] > nums[r]:
            l = mid + 1  # 最小值在右半
        else:
            r = mid      # 最小值在左半（含 mid）
    return nums[l]
```

**复杂度**：O(log N)

**考察点**：与 nums[r] 比较（不是 nums[l]），因为旋转点总在右侧

---

### Q11: 合并区间 · LeetCode 56

**🏢 高频公司**：字节、阿里
**难度**：中等 ⭐⭐

**题目**：合并所有重叠区间。

**题目讲解**：
```python
def merge(intervals: list[list[int]]) -> list[list[int]]:
    intervals.sort(key=lambda x: x[0])
    res = [intervals[0]]
    for start, end in intervals[1:]:
        if start <= res[-1][1]:           # 有重叠
            res[-1][1] = max(res[-1][1], end)
        else:
            res.append([start, end])
    return res
```

**复杂度**：时间 O(N log N)，空间 O(N)

**考察点**：排序后贪心合并，注意 `max(res[-1][1], end)` 处理完全包含的情况

---

### Q12: 除自身以外数组的乘积 · LeetCode 238

**🏢 高频公司**：字节、腾讯
**难度**：中等 ⭐⭐

**题目**：返回数组中除自身外所有元素的乘积，不能用除法，O(N) 时间。

**题目讲解**：
```python
def productExceptSelf(nums: list[int]) -> list[int]:
    n = len(nums)
    res = [1] * n
    # 第一遍：res[i] = nums[0..i-1] 的乘积
    prefix = 1
    for i in range(n):
        res[i] = prefix
        prefix *= nums[i]
    # 第二遍：乘上 nums[i+1..n-1] 的乘积
    suffix = 1
    for i in range(n-1, -1, -1):
        res[i] *= suffix
        suffix *= nums[i]
    return res
```

**复杂度**：时间 O(N)，空间 O(1)（输出数组不算）

**考察点**：前缀积 × 后缀积，一次左扫一次右扫，原地更新

---

### Q13: 子数组最大和 (Kadane 算法) · LeetCode 53

**🏢 高频公司**：字节、腾讯、阿里
**难度**：中等 ⭐⭐

**题目讲解**：
```python
def maxSubArray(nums: list[int]) -> int:
    cur = best = nums[0]
    for x in nums[1:]:
        cur = max(x, cur + x)   # 要么从 x 重新开始，要么延续之前的子数组
        best = max(best, cur)
    return best
```

**复杂度**：O(N) 时间，O(1) 空间

**考察点**：Kadane 算法；追问：分治解法 O(N log N)，线段树维护可修改版本

---

### Q14: 跳跃游戏 · LeetCode 55

**🏢 高频公司**：字节、阿里
**难度**：中等 ⭐⭐

**题目**：判断能否从第一个位置跳到最后一个位置。

**题目讲解**：
```python
def canJump(nums: list[int]) -> bool:
    max_reach = 0
    for i, jump in enumerate(nums):
        if i > max_reach: return False    # 当前位置不可达
        max_reach = max(max_reach, i + jump)
    return True
```

**复杂度**：O(N)，贪心维护最远可达位置

---

### Q15: 颜色分类（荷兰国旗）· LeetCode 75

**🏢 高频公司**：字节
**难度**：中等 ⭐⭐

**题目**：将 0/1/2 三种颜色排序，要求 O(N) 一次遍历。

**题目讲解**：三指针（low/mid/high），low 左边都是 0，high 右边都是 2：
```python
def sortColors(nums: list[int]) -> None:
    low, mid, high = 0, 0, len(nums) - 1
    while mid <= high:
        if nums[mid] == 0:
            nums[low], nums[mid] = nums[mid], nums[low]
            low += 1; mid += 1
        elif nums[mid] == 1:
            mid += 1
        else:
            nums[mid], nums[high] = nums[high], nums[mid]
            high -= 1   # mid 不动，因为换来的数还未检查

def sortColors(nums):
    pass
```

**考察点**：荷兰国旗三指针；mid 遇到 2 时不前移（换来的数未知）

---

### Q16: 下一个排列 · LeetCode 31

**🏢 高频公司**：字节（高频）
**难度**：中等 ⭐⭐

**题目**：找出给定数字排列的下一个字典序排列。

**题目讲解**：
```python
def nextPermutation(nums: list[int]) -> None:
    n = len(nums)
    # 1. 从右找第一个"下降点" i（nums[i] < nums[i+1]）
    i = n - 2
    while i >= 0 and nums[i] >= nums[i+1]:
        i -= 1
    
    if i >= 0:
        # 2. 从右找第一个大于 nums[i] 的数 j
        j = n - 1
        while nums[j] <= nums[i]:
            j -= 1
        nums[i], nums[j] = nums[j], nums[i]
    
    # 3. 翻转 i+1 到末尾（变为最小排列）
    nums[i+1:] = nums[i+1:][::-1]
```

**考察点**：原地操作，三步骤（找下降点→找交换点→翻转后缀）

---

### Q17: 旋转图像 · LeetCode 48

**🏢 高频公司**：字节、腾讯
**难度**：中等 ⭐⭐

**题目**：将 N×N 矩阵顺时针旋转 90 度（原地）。

**题目讲解**：
先沿主对角线转置，再水平翻转（等价于顺时针 90°）：
```python
def rotate(matrix: list[list[int]]) -> None:
    n = len(matrix)
    # 转置
    for i in range(n):
        for j in range(i+1, n):
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
    # 每行翻转
    for row in matrix:
        row.reverse()
```

**考察点**：转置 + 翻转 = 顺时针 90°；逆时针 = 转置 + 竖向翻转

---

### Q18: 螺旋矩阵 · LeetCode 54

**🏢 高频公司**：腾讯、字节
**难度**：中等 ⭐⭐

**题目讲解**：
```python
def spiralOrder(matrix: list[list[int]]) -> list[int]:
    res = []
    top, bottom, left, right = 0, len(matrix)-1, 0, len(matrix[0])-1
    while top <= bottom and left <= right:
        for c in range(left, right+1):   res.append(matrix[top][c])
        top += 1
        for r in range(top, bottom+1):   res.append(matrix[r][right])
        right -= 1
        if top <= bottom:
            for c in range(right, left-1, -1): res.append(matrix[bottom][c])
            bottom -= 1
        if left <= right:
            for r in range(bottom, top-1, -1): res.append(matrix[r][left])
            left += 1
    return res
```

**考察点**：四个边界变量，收缩方向时注意判断是否还有行/列

---

### Q19: 二分查找（标准模板）· LeetCode 704

**🏢 高频公司**：所有大厂
**难度**：简单 ⭐

**题目讲解**：
```python
def search(nums: list[int], target: int) -> int:
    l, r = 0, len(nums) - 1
    while l <= r:             # 注意：闭区间 [l, r]
        mid = l + (r - l) // 2  # 防止溢出（Python 不溢出，但好习惯）
        if nums[mid] == target: return mid
        elif nums[mid] < target: l = mid + 1
        else: r = mid - 1
    return -1
```

**追问**：`l <= r` vs `l < r`？左闭右开 vs 左闭右闭？
- 用 `l <= r` + `l=mid+1, r=mid-1`（闭区间写法，不会漏掉）

---

### Q20: 搜索插入位置 · LeetCode 35

**🏢 高频公司**：字节、腾讯
**难度**：简单 ⭐

**题目讲解**：找到目标值或应该插入的位置（等价于找第一个 `>= target` 的位置）：
```python
def searchInsert(nums: list[int], target: int) -> int:
    l, r = 0, len(nums)   # r = n（target 可能插在末尾）
    while l < r:
        mid = (l + r) // 2
        if nums[mid] < target:
            l = mid + 1
        else:
            r = mid       # 左闭右开：r = mid 而非 mid-1
    return l
```

**考察点**：二分的"左边界"模板（`l < r`，`r=mid`）；这两种模板要熟练切换

---

### Q21: 在排序数组中查找元素的第一个和最后一个位置 · LeetCode 34

**🏢 高频公司**：字节、腾讯（高频）
**难度**：中等 ⭐⭐

**题目讲解**：
```python
def searchRange(nums: list[int], target: int) -> list[int]:
    def lower_bound(nums, target):      # 第一个 >= target 的位置
        l, r = 0, len(nums)
        while l < r:
            mid = (l + r) // 2
            if nums[mid] < target: l = mid + 1
            else: r = mid
        return l
    
    left  = lower_bound(nums, target)
    right = lower_bound(nums, target + 1) - 1
    
    if left <= right and left < len(nums) and nums[left] == target:
        return [left, right]
    return [-1, -1]
```

**考察点**：统一用 `lower_bound` 封装，right = lower_bound(target+1) - 1

---

### Q22: 有效的括号 · LeetCode 20

**🏢 高频公司**：所有大厂（超高频）
**难度**：简单 ⭐

**题目讲解**：
```python
def isValid(s: str) -> bool:
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    for c in s:
        if c in mapping:
            top = stack.pop() if stack else '#'
            if mapping[c] != top: return False
        else:
            stack.append(c)
    return not stack
```

**考察点**：栈的经典应用；追问：最长有效括号 LC32（DP 或栈）

---

### Q23: 最大矩形 · LeetCode 84（柱状图中最大的矩形）

**🏢 高频公司**：字节（困难必考）
**难度**：困难 ⭐⭐⭐

**题目讲解**：
单调栈（维护递增栈，遇到比栈顶小的高度时弹出并计算面积）：
```python
def largestRectangleArea(heights: list[int]) -> int:
    heights = [0] + heights + [0]  # 哨兵
    stack = [0]
    ans = 0
    for i in range(1, len(heights)):
        while heights[i] < heights[stack[-1]]:
            h = heights[stack.pop()]
            w = i - stack[-1] - 1
            ans = max(ans, h * w)
        stack.append(i)
    return ans
```

**复杂度**：O(N) 时间，O(N) 空间

**考察点**：单调栈经典应用；宽度计算 `w = i - stack[-1] - 1`（两个"边界"的距离）

---

### Q24: 前 K 个高频元素 · LeetCode 347

**🏢 高频公司**：字节、腾讯
**难度**：中等 ⭐⭐

**题目讲解**：
```python
import heapq
from collections import Counter

def topKFrequent(nums: list[int], k: int) -> list[int]:
    count = Counter(nums)
    # 最小堆（大小 k），维护频率最大的 k 个元素
    heap = []
    for num, freq in count.items():
        heapq.heappush(heap, (freq, num))
        if len(heap) > k:
            heapq.heappop(heap)
    return [num for freq, num in heap]
```

**复杂度**：时间 O(N log K)，空间 O(N)

**考察点**：
1. 大小为 K 的最小堆（维护最大的 K 个）
2. 桶排序方案 O(N)：下标 = 频率，O(N) 空间

---

