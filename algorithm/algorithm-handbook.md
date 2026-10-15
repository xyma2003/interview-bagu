# 算法题型通关手册

[仓库首页](../README.md) · [算法目录](README.md) · [学习路线](../LEARNING_GUIDE.md)

> 本轮仅整理导航，未新增算法内容核验。仓库已详细核验的 20 题及其范围见[来源核验记录](../SOURCE_AUDIT.md)。

> 本文档按题型组织，每个题型包含核心思想、识别信号、模板骨架、经典题详解。每道题列出所有主流解法，逐一细致讲解。代码统一用 Python。

---

<a id="handbook-toc"></a>

## 目录

- [一、双指针](#handbook-two-pointers)
- [二、二分法](#handbook-binary-search)
- [三、滑动窗口](#handbook-sliding-window)
- [四、动态规划](#handbook-dp)
- [五、前缀和 + 差分](#handbook-prefix-sum)
- [六、单调栈](#handbook-monotonic-stack)
- [七、单调队列](#handbook-monotonic-queue)
- [八、堆 / 优先队列](#handbook-heap)
- [九、回溯](#handbook-backtracking)
- [十、BFS / 拓扑排序](#handbook-bfs)
- [十一、并查集](#handbook-union-find)
- [十二、贪心](#handbook-greedy)
- [十三、字符串算法（KMP / Rabin-Karp / Trie）](#handbook-strings)
- [十四、树](#handbook-trees)
- [十五、图论](#handbook-graphs)
- [学习路径建议](#handbook-learning-path)

---

<a id="handbook-two-pointers"></a>

## 一、双指针

[返回总目录](#handbook-toc) · [查看学习路线](../LEARNING_GUIDE.md)

<details>
<summary>本章经典例题（4 个入口）</summary>

- [LC 11 · 盛最多水的容器](#handbook-lc11)
- [LC 283 · 移动零](#handbook-lc283)
- [LC 287 · 寻找重复数](#handbook-lc287)
- [LC 15 · 三数之和](#handbook-lc15)

</details>

### 核心思想

两个指针协同移动，避免嵌套循环。本质是「**利用单调性剪枝**」——某条搜索路径一旦知道走不下去就直接跳过，把 `O(n²)` 压成 `O(n)`。

### 识别信号

- 输入有序（或可先排序）
- 要求线性时间找一对元素
- 链表上的环/中点/倒数问题
- 原地去重/分区

### 三个子类

| 子类 | 指针走向 | 典型场景 |
|------|---------|---------|
| 对撞指针 | 两端向中间 | 有序数组两数之和、回文、容器 |
| 快慢指针 | 同向不同速 | 链表找环、找中点、删除倒数第 N |
| 同向双指针 | 同向都前进 | 原地去重、分区、移动零 |

### 模板骨架

```python
# 对撞指针
l, r = 0, len(arr) - 1
while l < r:
    if 满足条件:
        return / 记录
    if 应该左移右指针:
        r -= 1
    else:
        l += 1

# 同向双指针
slow = 0
for fast in range(len(arr)):
    if arr[fast] 满足某条件:
        arr[slow] = arr[fast]
        slow += 1
return slow  # 新数组长度

# 快慢指针（链表找环）
slow = fast = head
while fast and fast.next:
    slow = slow.next
    fast = fast.next.next
    if slow is fast:
        return True  # 有环
return False
```

---

<a id="handbook-lc11"></a>

### 经典题 1：盛最多水的容器（LeetCode 11）

> 给定数组 `height`，找两条线与 x 轴构成的容器，使容器盛水最多。返回最大水量。

#### 解法一：对撞双指针

```python
class Solution:
    def maxArea(self, height: list[int]) -> int:
        l, r = 0, len(height) - 1
        ans = 0
        while l < r:
            area = (r - l) * min(height[l], height[r])
            ans = max(ans, area)
            if height[l] < height[r]:
                l += 1
            else:
                r -= 1
        return ans
```

**为什么这么移动是对的**：

容器水量 = `宽度 × min(左高, 右高)`。宽度随指针靠近而变小。

关键论证：假设 `height[l] < height[r]`，此时如果不动 `l` 而去动 `r`（右指针左移），那么：
- 宽度一定变小
- 新的高度 = `min(height[l], height[r'])`，但因为 `height[l]` 是瓶颈，只要 `r'` 还在 `l` 右边，`min` 仍被 `height[l]` 卡住，顶多不变
- 所以水量一定不会更大

**结论**：较短的那根不可能成为更大容器的边界，直接挪掉它，剪掉以它为左端的所有可能。这一剪就是 `O(n)` 步，避免了 `O(n²)` 暴力枚举。

**复杂度**：时间 `O(n)`，空间 `O(1)`。

[返回本章例题目录](#handbook-two-pointers) · [返回总目录](#handbook-toc)

---

<a id="handbook-lc283"></a>

### 经典题 2：移动零（LeetCode 283）

> 把数组中所有 0 移到末尾，保持非零元素相对顺序，原地操作。

#### 解法一：同向双指针

```python
class Solution:
    def moveZeroes(self, nums: list[int]) -> None:
        slow = 0  # 指向下一个待填位置
        for fast in range(len(nums)):
            if nums[fast] != 0:
                nums[slow], nums[fast] = nums[fast], nums[slow]
                slow += 1
```

**机制**：`slow` 始终指向第一个 0 的位置（或者还没填的位置）。`fast` 扫描整个数组，遇到非零就和 `slow` 交换，然后 `slow` 前进。

**走一遍** `nums = [0,1,0,3,12]`：

| fast | nums[fast] | slow | 操作 | 数组状态 |
|------|-----------|------|------|---------|
| 0 | 0 | 0 | 跳过 | [0,1,0,3,12] |
| 1 | 1 | 0 | swap(0,1) | [1,0,0,3,12] |
| 2 | 0 | 1 | 跳过 | [1,0,0,3,12] |
| 3 | 3 | 1 | swap(1,3) | [1,3,0,0,12] |
| 4 | 12 | 2 | swap(2,4) | [1,3,12,0,0] |

**复杂度**：`O(n)` 一次扫描，`O(1)` 原地。

[返回本章例题目录](#handbook-two-pointers) · [返回总目录](#handbook-toc)

---

<a id="handbook-lc287"></a>

### 经典题 3：寻找重复数（LeetCode 287）

> 数组 `nums` 长度 `n+1`，元素在 `[1, n]` 范围内，只有一个数重复，找出它。不能修改数组。

#### 解法一：快慢指针（把数组当链表）

```python
class Solution:
    def findDuplicate(self, nums: list[int]) -> int:
        slow = fast = 0
        # 第一阶段：找相遇点
        while True:
            slow = nums[slow]
            fast = nums[nums[fast]]
            if slow == fast:
                break
        # 第二阶段：找环入口
        slow2 = 0
        while slow != slow2:
            slow = nums[slow]
            slow2 = nums[slow2]
        return slow
```

**核心思想**：把 `nums[i]` 看作「从节点 i 指向节点 nums[i] 的边」。因为元素值都在 `[1, n]`，所有节点都指向某个有效节点，而节点 0 没有入边，所以从 0 出发一定进入一个环。环的入口就是重复的数（因为有两个不同位置都指向它）。

**两阶段找环入口**：和链表找环完全一样——快慢指针相遇后，再用一个指针从起点出发，三者同步前进，相遇点就是环入口。

**复杂度**：`O(n)`，`O(1)`。

#### 解法二：二分答案

```python
class Solution:
    def findDuplicate(self, nums: list[int]) -> int:
        lo, hi = 1, len(nums) - 1
        while lo < hi:
            mid = (lo + hi) // 2
            cnt = sum(1 for x in nums if x <= mid)
            if cnt > mid:
                hi = mid
            else:
                lo = mid + 1
        return lo
```

**核心思想**：如果不存在重复，那么 `≤ mid` 的数恰好有 `mid` 个。如果有重复，计数会 `> mid`。利用这个单调性二分答案。

**为什么单调**：设重复数为 `target`。对任意 `mid`：
- `mid < target`：`≤mid` 的数正常分布，`cnt ≤ mid`
- `mid ≥ target`：`target` 被多算一次，`cnt > mid`

所以「`cnt > mid`」这个条件恰好等价于「`mid ≥ target`」，可以用二分找最小满足的 `mid`。

**复杂度**：`O(n log n)`，`O(1)`。比解法一慢但思路非常值得学——「**鸽笼原理 + 二分答案**」是一类套路。

[返回本章例题目录](#handbook-two-pointers) · [返回总目录](#handbook-toc)

---

<a id="handbook-lc15"></a>

### 经典题 4：三数之和（LeetCode 15）

> 数组中找所有三元组，使三数之和为 0。结果不重复。

#### 解法一：排序 + 对撞双指针

```python
class Solution:
    def threeSum(self, nums: list[int]) -> list[list[int]]:
        nums.sort()
        ans = []
        for i in range(len(nums) - 2):
            if i > 0 and nums[i] == nums[i-1]:
                continue  # 跳过重复的第一个数
            l, r = i + 1, len(nums) - 1
            while l < r:
                s = nums[i] + nums[l] + nums[r]
                if s == 0:
                    ans.append([nums[i], nums[l], nums[r]])
                    while l < r and nums[l] == nums[l+1]: l += 1
                    while l < r and nums[r] == nums[r-1]: r -= 1
                    l += 1; r -= 1
                elif s < 0:
                    l += 1
                else:
                    r -= 1
        return ans
```

**为什么这么做**：固定一个数 `nums[i]`，剩下两个数就是「有序数组两数之和 = `-nums[i]`」问题，用对撞指针 `O(n)` 解决。整体 `O(n²)`。

**去重关键**：
- 外层 `i` 跳过相同的 `nums[i]`
- 内层 `l, r` 找到答案后，各自跳过相同的数

**复杂度**：时间 `O(n²)`，空间 `O(1)`（不计排序栈）。

[返回本章例题目录](#handbook-two-pointers) · [返回总目录](#handbook-toc)

---

<a id="handbook-binary-search"></a>

## 二、二分法

[返回总目录](#handbook-toc) · [查看学习路线](../LEARNING_GUIDE.md)

<details>
<summary>本章经典例题（5 个入口）</summary>

- [LC 704 · 二分查找](#handbook-lc704)
- [LC 33 · 搜索旋转排序数组](#handbook-lc33)
- [LC 410 · 分割数组的最大值](#handbook-lc410)
- [LC 4 · 寻找两个正序数组中位数](#handbook-lc4)
- [LC 792 · 匹配子序列数](#handbook-lc792)

</details>

### 核心思想

每次砍掉一半搜索空间。难点不在写二分，在**判断问题是否具备单调性**——能否定义一个条件 `check(x)`，使得答案一侧全为真、另一侧全为假。

### 识别信号

- 输入有序
- 答案空间具有单调性（「`≤ mid` 可行 ⇒ `≤ mid-1` 也可行」这种）
- 求最大值最小化 / 最小值最大化
- 「使……最大的最小……」

### 三种形式

| 形式 | 干什么 | 何时用 |
|------|-------|-------|
| 精确查找 | 找 `== target` | 数组有序、找特定值 |
| 上界/下界 | 找第一个 `>` / `≥ target` | 找插入位置、找最接近的 |
| 二分答案 | 把"求最优解"转成"判可行性" | 答案空间单调的最优化问题 |

### 模板骨架

```python
# 形式1：精确查找
lo, hi = 0, len(arr) - 1
while lo <= hi:
    mid = (lo + hi) // 2
    if arr[mid] == target:
        return mid
    elif arr[mid] < target:
        lo = mid + 1
    else:
        hi = mid - 1
return -1

# 形式2：找第一个 >= target 的位置（bisect_left）
lo, hi = 0, len(arr)
while lo < hi:
    mid = (lo + hi) // 2
    if arr[mid] < target:
        lo = mid + 1
    else:
        hi = mid
return lo  # lo == len(arr) 表示都 < target

# 形式3：二分答案
lo, hi = 答案下界, 答案上界
while lo < hi:
    mid = (lo + hi) // 2
    if check(mid):  # mid 这个答案可行吗
        hi = mid     # 可行，试试更小
    else:
        lo = mid + 1 # 不行，必须更大
return lo
```

**写二分最容易踩的坑**：`lo <= hi` vs `lo < hi`、`hi = mid` vs `hi = mid - 1`、死循环。建议背三套模板（上面对应三种形式），不要现场发挥。

---

<a id="handbook-lc704"></a>

### 经典题 1：二分查找（LeetCode 704）

> 在有序数组中找 target，返回下标，找不到返回 -1。

#### 解法：标准精确查找模板

```python
class Solution:
    def search(self, nums: list[int], target: int) -> int:
        lo, hi = 0, len(nums) - 1
        while lo <= hi:
            mid = (lo + hi) // 2
            if nums[mid] == target:
                return mid
            elif nums[mid] < target:
                lo = mid + 1
            else:
                hi = mid - 1
        return -1
```

**机制**：每次比较中点，砍掉一半。循环条件 `lo <= hi` 因为答案是精确匹配，可能就落在 `mid` 上，需要允许 `lo == hi` 这一轮比较。

**复杂度**：`O(log n)`。

[返回本章例题目录](#handbook-binary-search) · [返回总目录](#handbook-toc)

---

<a id="handbook-lc33"></a>

### 经典题 2：搜索旋转排序数组（LeetCode 33）

> 升序数组在某个点旋转了，找 target。如 `[4,5,6,7,0,1,2]`，找 0 返回 4。

#### 解法一：分类讨论的二分

```python
class Solution:
    def search(self, nums: list[int], target: int) -> int:
        lo, hi = 0, len(nums) - 1
        while lo <= hi:
            mid = (lo + hi) // 2
            if nums[mid] == target:
                return mid
            # 判断 mid 落在哪个有序段
            if nums[lo] <= nums[mid]:  # 左半有序
                if nums[lo] <= target < nums[mid]:
                    hi = mid - 1
                else:
                    lo = mid + 1
            else:  # 右半有序
                if nums[mid] < target <= nums[hi]:
                    lo = mid + 1
                else:
                    hi = mid - 1
        return -1
```

**核心思想**：旋转数组虽然整体无序，但**任意一刀切下去，至少有一半是有序的**。判断 mid 落在哪一半有序，再看 target 在不在这一半里：
- 在 → 砍掉另一半
- 不在 → target 必在另一半

**关键判断 `nums[lo] <= nums[mid]`**：用 `<=` 不是 `<`，因为 `lo == mid`（区间只有两个元素时）也要算左半有序。

**复杂度**：`O(log n)`。

[返回本章例题目录](#handbook-binary-search) · [返回总目录](#handbook-toc)

---

<a id="handbook-lc410"></a>

### 经典题 3：分割数组的最大值（LeetCode 410）

> 把非负数组分成 `k` 个连续非空子数组，使各子数组和的最大值最小，返回这个最小值。

#### 解法一：二分答案

```python
class Solution:
    def splitArray(self, nums: list[int], k: int) -> int:
        def check(limit):
            """和不超过 limit 时，至少需要几段"""
            cnt, cur = 1, 0
            for x in nums:
                if cur + x > limit:
                    cnt += 1
                    cur = x
                else:
                    cur += x
            return cnt

        lo, hi = max(nums), sum(nums)
        while lo < hi:
            mid = (lo + hi) // 2
            if check(mid) <= k:
                hi = mid  # mid 这么大就够了，试试更小
            else:
                lo = mid + 1  # 太小了，分段数超了
        return lo
```

**核心思想**：直接求最小最大和很难，但「**最大和 ≤ limit 时，最少需要几段**」是 `O(n)` 可计算的。而且「需要的段数」随 `limit` 单调递减（limit 越大，需要的段越少）——这就是单调性。

**为什么这是二分答案**：把「求最优解」转换成「判可行性」。原问题是「找最小 X，使得分段数 ≤ k」，转化为「给定 X，分段数 ≤ k 吗」这个判定问题。

**走一遍** `nums = [7,2,5,10,8]`, `k = 2`：
- `lo=10, hi=32`
- `mid=21`：分段 = `[7,2,5] | [10,8]`，段数 2 ≤ 2 ✓ → `hi=21`
- `mid=15`：分段 = `[7,2,5] | [10] | [8]`，段数 3 > 2 ✗ → `lo=16`
- `mid=18`：分段 = `[7,2,5] | [10,8]`，段数 2 ✓ → `hi=18`
- ... 最终 `lo=hi=18`

**复杂度**：`O(n log(sum-max))`，比 DP 的 `O(n²k)` 快得多。

[返回本章例题目录](#handbook-binary-search) · [返回总目录](#handbook-toc)

---

<a id="handbook-lc4"></a>

### 经典题 4：寻找两个正序数组中位数（LeetCode 4）

> 两个有序数组 `nums1`, `nums2`，找合并后中位数，要求 `O(log(m+n))`。

#### 解法一：在较短数组上二分分割线

```python
class Solution:
    def findMedianSortedArrays(self, nums1: list[int], nums2: list[int]) -> float:
        if len(nums1) > len(nums2):
            nums1, nums2 = nums2, nums1  # 保证 nums1 较短
        m, n = len(nums1), len(nums2)
        lo, hi = 0, m  # nums1 切走 [0, m] 个
        half = (m + n + 1) // 2  # 左半部分总数
        while lo <= hi:
            i = (lo + hi) // 2  # nums1 左半长度
            j = half - i        # nums2 左半长度
            if i > 0 and nums1[i-1] > nums2[j]:
                hi = i - 1  # nums1 切多了
            elif i < m and nums2[j-1] > nums1[i]:
                lo = i + 1  # nums1 切少了
            else:
                # 找到正确切分
                left_max = max(
                    nums1[i-1] if i > 0 else float('-inf'),
                    nums2[j-1] if j > 0 else float('-inf')
                )
                if (m + n) % 2:
                    return left_max
                right_min = min(
                    nums1[i] if i < m else float('inf'),
                    nums2[j] if j < n else float('inf')
                )
                return (left_max + right_min) / 2
        return 0.0
```

**核心思想**：中位数 = 把两个数组合并后切成左右两半，使左半最大 ≤ 右半最小，且左半元素数 = (m+n+1)//2。

切分线由 `i`（nums1 切走多少）决定，`j = half - i` 自动确定。**二分 `i`**：
- `nums1[i-1] > nums2[j]` → nums1 切多了，左移
- `nums2[j-1] > nums1[i]` → nums1 切少了，右移
- 否则切对了

**为什么在较短数组上二分**：保证 `j = half - i ≥ 0`，避免越界。

**复杂度**：`O(log(min(m, n)))`。这是 Hard 的核心难度——思路不难但边界处理极烦。

[返回本章例题目录](#handbook-binary-search) · [返回总目录](#handbook-toc)

---

<a id="handbook-lc792"></a>

### 经典题 5：匹配子序列数（LeetCode 792）

> 给定字符串 `s` 和字符串数组 `words`，统计 `words` 里多少个是 `s` 的子序列。`s="ahbgdc"`, `words=["a","bb","acd","ace"]` → 2。

这道题是「**预处理 + 二分查找上界**」的典型组合题——把一个看似简单的问题重复 N 次的结构，识别到"查询对象不变"，用预处理把线性因子压成对数。

#### 解法一：暴力双指针 `O(|s| × len(words))`（TLE）

```python
class Solution:
    def numMatchingSubseq(self, s: str, words: List[str]) -> int:
        def match(word):
            i = 0
            for j in range(len(s)):
                if i < len(word) and s[j] == word[i]:
                    i += 1
            return i == len(word)
        return sum(1 for w in words if match(w))
```

**机制**：每个 word 独立扫一遍 s，双指针贪心匹配（392 Is Subsequence 的标准做法）。每个 word `O(|s| + |word|)`，总 `O(len(words) × |s|)`。

**瓶颈**：`s` 被反复扫描，同一个 `s` 被 `len(words)` 次从头到尾扫。最坏 `5·10⁴ × 5000 = 2.5·10⁸` → TLE。

#### 解法二：预处理 pos + bisect `O(|s| + Σ|word| × log |s|)`

```python
from bisect import bisect_right
from collections import defaultdict
from typing import List

class Solution:
    def numMatchingSubseq(self, s: str, words: List[str]) -> int:
        # 预处理：字符 → 出现位置升序列表
        pos = defaultdict(list)
        for idx, c in enumerate(s):
            pos[c].append(idx)

        def match(word):
            cur = -1  # 上次匹配到的 s 位置
            for c in word:
                lst = pos[c]
                k = bisect_right(lst, cur)  # 找第一个 > cur 的位置
                if k == len(lst):
                    return False  # 之后没有这个字符
                cur = lst[k]
            return True

        return sum(1 for w in words if match(w))
```

**核心思想**：
1. 预处理 `s` 为 `pos[c] = [c 在 s 中所有位置，升序]`。`s` 只扫一次。
2. 对每个 word，维护 `cur = 上次匹配位置`。每个字符 `c` 在 `pos[c]` 上二分找第一个 `> cur` 的位置（即 `bisect_right` 的语义）。
3. 找到则 `cur` 前移；找不到则不是子序列。

**为什么 `bisect_right(lst, cur)` 是对的**：`bisect_right` 返回「把 cur 插入到升序数组保持有序的位置」——即第一个 `> cur` 的元素索引。这正是「下一个 c 出现在 cur 之后」的位置。

**走一遍** `s = "ahbgdc"`, `word = "acg"`：
```
pos = {a:[0], h:[1], b:[2], g:[3], d:[4], c:[5]}
```

| word 字符 | pos[c] | cur（之前） | bisect_right 找 > cur | 结果 | cur（之后）|
|----------|--------|-----------|----------------------|------|----------|
| 'a' | [0] | -1 | 0 | ✓ | 0 |
| 'c' | [5] | 0 | 5 | ✓ | 5 |
| 'g' | [3] | 5 | 1（数组长度 1，没找到）| ✗ | 失败 |

`g` 在 s 里**存在**（位置 3），但 3 ≤ 5（cur），违反顺序约束 → 不是子序列。

#### 解法三：手写二分 + 普通 dict（不 import）

```python
from typing import List

class Solution:
    def numMatchingSubseq(self, s: str, words: List[str]) -> int:
        pos = {}
        for idx, c in enumerate(s):
            pos.setdefault(c, []).append(idx)

        def first_greater(lst, target):
            # 手写 bisect_right：在升序数组找第一个 > target 的位置
            lo, hi = 0, len(lst)
            while lo < hi:
                mid = (lo + hi) // 2
                if lst[mid] <= target:
                    lo = mid + 1
                else:
                    hi = mid
            return lo

        def match(word):
            cur = -1
            for c in word:
                lst = pos.get(c)
                if not lst:
                    return False
                k = first_greater(lst, cur)
                if k == len(lst):
                    return False
                cur = lst[k]
            return True

        return sum(1 for w in words if match(w))
```

**两个替代点**：
- `bisect_right(lst, cur)` → 手写 `first_greater`：标准二分模板，`lo` 收敛到第一个 `> target` 的位置；`== len(lst)` 表示全 `≤ target`。
- `defaultdict(list)` → `pos.setdefault(c, []).append(idx)`：一次搞定"不存在则初始化空 list"。

二分模板的判断方向是关键：
- `lst[mid] <= target` → 答案在 mid 右侧，`lo = mid + 1`
- 否则 `hi = mid`（mid 本身可能是答案，不能跳过）

#### 解法四：按字符分桶并行匹配（最优雅）

```python
from collections import defaultdict
from typing import List

class Solution:
    def numMatchingSubseq(self, s: str, words: List[str]) -> int:
        # 按下一个待匹配字符分桶
        buckets = defaultdict(list)
        for i, w in enumerate(words):
            if w:  # 跳过空串
                buckets[w[0]].append((i, 0))  # (word 索引, 已匹配到第几位)

        matched = 0
        for c in s:
            old_bucket = buckets[c]
            buckets[c] = []  # 清空，准备接收下一轮
            for word_idx, ptr in old_bucket:
                ptr += 1
                if ptr == len(words[word_idx]):
                    matched += 1
                else:
                    buckets[words[word_idx][ptr]].append((word_idx, ptr))

        return matched
```

**核心思想**：一次遍历 `s` 同时推进所有 words 的匹配进度。每个 word 用 `(索引, 下一个待匹配位置)` 表示状态，按"下一个要的字符"分桶。`s` 走到字符 `c` 时，把所有"当前在等 c"的 word 推进一步，再按新的待匹配字符重新分桶。

**复杂度**：`O(|s| + Σ|word|)`——比二分解法还快一个 log 因子。缺点是空间较大、思路稍绕。

#### 四种解法对比

| 解法 | 时间 | 空间 | 思路要点 |
|------|------|------|---------|
| 暴力双指针 | `O(|s| × len(words))` | `O(1)` | 每个 word 独立扫 s，TLE |
| 预处理 + bisect | `O(|s| + Σ|word| × log |s|)` | `O(|s|)` | 把"扫 s"换成"查 pos + 二分" |
| 手写二分 | 同上 | `O(|s|)` | 不依赖 import，逻辑等价 |
| 按字符分桶 | `O(|s| + Σ|word|)` | `O(Σ|word|)` | 一遍 s 推进所有 word，最优 |

**这道题的精华不在解法二本身，而在「识别 pattern」**：
- 同一个查询对象被反复扫 → 预处理一次
- 答案空间单调（升序数组找上界）→ 二分

这两个 pattern 在中等题里反复出现，学透了能解一类题。

[返回本章例题目录](#handbook-binary-search) · [返回总目录](#handbook-toc)

---

<a id="handbook-sliding-window"></a>

## 三、滑动窗口

[返回总目录](#handbook-toc) · [查看学习路线](../LEARNING_GUIDE.md)

<details>
<summary>本章经典例题（3 个入口）</summary>

- [LC 3 · 无重复字符的最长子串](#handbook-lc3)
- [LC 76 · 最小覆盖子串](#handbook-lc76)
- [LC 239 · 滑动窗口最大值](#handbook-lc239-sliding-window)

</details>

### 核心思想

维护一个窗口 `[left, right]`，**right 扩张探索、left 收缩保持窗口合法**。两个指针都只前进不后退，所以总操作 `O(n)`。

类比：一个蠕虫，头一直往前探，发现食物中毒（窗口不合法）就把尾巴缩回来，直到重新合法。每段路只走一次。

### 识别信号

- 连续子数组 / 子串
- 求"最长 / 最短"满足某条件
- 条件是关于窗口内元素计数/和的

### 和双指针的关系

滑动窗口是双指针的特例：一定同向、且维护窗口内某种聚合量（计数、和、最值）。双指针可以是对撞或快慢，不一定有"窗口"语义。

### 模板骨架

```python
# 求最长合法窗口
left = 0
count = {}
for right in range(len(s)):
    # 右端进窗
    count[s[right]] = count.get(s[right], 0) + 1
    # 窗口不合法时收缩左端
    while 窗口不合法:
        count[s[left]] -= 1
        left += 1
    ans = max(ans, right - left + 1)

# 求最短合法窗口
left = 0
for right in range(len(s)):
    count[s[right]] = count.get(s[right], 0) + 1
    while 窗口合法:  # 合法时疯狂收缩求最小
        ans = min(ans, right - left + 1)
        count[s[left]] -= 1
        left += 1
```

**最长 vs 最短的差别**：最长是"不合法才收缩"，最短是"合法就收缩"。记住这个区别，模板就不会写反。

---

<a id="handbook-lc3"></a>

### 经典题 1：无重复字符的最长子串（LeetCode 3）

> 找不含重复字符的最长子串长度。

#### 解法一：哈希表滑窗

```python
class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        left = 0
        last = {}  # 字符 → 上次出现位置
        ans = 0
        for right, c in enumerate(s):
            if c in last and last[c] >= left:
                left = last[c] + 1  # 直接跳到重复字符之后
            last[c] = right
            ans = max(ans, right - left + 1)
        return ans
```

**机制**：维护窗口内无重复。遇到 `s[right]` 时，如果它上次出现位置 `≥ left`（在窗口内），就把 `left` 跳到 `last[c]+1`，**一次跳到位**而不是一格一格挪。

**走一遍** `s = "abcabcbb"`：

| right | c | last[c] 之前 | left | 窗口 | ans |
|-------|---|-------------|------|------|-----|
| 0 | a | 无 | 0 | "a" | 1 |
| 1 | b | 无 | 0 | "ab" | 2 |
| 2 | c | 无 | 0 | "abc" | 3 |
| 3 | a | 0 ≥ 0 | 1 | "bca" | 3 |
| 4 | b | 1 ≥ 1 | 2 | "cab" | 3 |
| 5 | c | 2 ≥ 2 | 3 | "abc" | 3 |
| 6 | b | 4 ≥ 3 | 5 | "cb" | 3 |
| 7 | b | 6 ≥ 5 | 7 | "b" | 3 |

#### 解法二：标准模板（计数滑窗）

```python
class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        left = 0
        count = {}
        ans = 0
        for right, c in enumerate(s):
            count[c] = count.get(c, 0) + 1
            while count[c] > 1:  # 出现重复
                count[s[left]] -= 1
                left += 1
            ans = max(ans, right - left + 1)
        return ans
```

**对比**：解法一是「跳指针」——直接把 `left` 跳到 `last[c]+1`，需要记录每个字符的最后位置。解法二是「标准滑窗」——一格一格挪 `left` 直到窗口合法。两者都 `O(n)`，但解法一常数更小、解法二模板更通用。

[返回本章例题目录](#handbook-sliding-window) · [返回总目录](#handbook-toc)

---

<a id="handbook-lc76"></a>

### 经典题 2：最小覆盖子串（LeetCode 76）

> 字符串 `s`, `t`，找 `s` 中包含 `t` 所有字符的最小子串。`s="ADOBECODEBANC"`, `t="ABC"` → `"BANC"`。

#### 解法一：计数滑窗（求最短）

```python
from collections import Counter

class Solution:
    def minWindow(self, s: str, t: str) -> str:
        need = Counter(t)
        missing = len(t)  # 还差多少个字符（按 t 的需求计数）
        left = 0
        start, end = 0, float('inf')
        for right, c in enumerate(s):
            if c in need:
                if need[c] > 0:
                    missing -= 1
                need[c] -= 1
            # 窗口合法时疯狂收缩
            while missing == 0:
                if right - left < end - start:
                    start, end = left, right
                lc = s[left]
                if lc in need:
                    need[lc] += 1
                    if need[lc] > 0:
                        missing += 1
                left += 1
        return s[start:end+1] if end != float('inf') else ""
```

**核心思想**：`missing` 表示「窗口还差几个字符才能覆盖 t」。`need[c]` 是「窗口内 c 还可以多容纳几次」（正=需要，负=过剩）。

**为什么这样设计**：
- `right` 扩张时，遇到的字符 `c` 若是 `t` 需要的，且 `need[c] > 0`（确实缺这个），`missing -= 1`
- `need[c] -= 1`（不管是不是需要的都减，方便后面窗口收缩时恢复）
- `missing == 0` 时窗口已覆盖 `t`，开始收缩左端。左端字符如果是 `t` 需要的，恢复时 `need[lc]` 越过 0 表示又缺这个了，`missing += 1`

**走一遍**（简化）：`s="ADOBECODEBANC"`, `t="ABC"`
- right 探到 5（"ADOBEC"）→ missing=0，合法
- 收缩到 "BEC"（去掉 ADOB）→ missing=1（A 没了）
- 继续扩 right 到 10（"BECODEBA"）→ missing=0，合法
- 收缩到 "CODEBA"→"ODEBA"→"DEBA"→"EBA"→"BA"→ missing=1
- 继续到 "BANC"（right=12）→ missing=0
- 收缩到 "BANC"（left=9）→ 长度 4
- 最终答案 `"BANC"`

**复杂度**：`O(|s| + |t|)`。

[返回本章例题目录](#handbook-sliding-window) · [返回总目录](#handbook-toc)

---

<a id="handbook-lc239-sliding-window"></a>

### 经典题 3：滑动窗口最大值（LeetCode 239）

> 数组 `nums` 和窗口大小 `k`，返回每个窗口的最大值。

#### 解法一：单调队列

```python
from collections import deque

class Solution:
    def maxSlidingWindow(self, nums: list[int], k: int) -> list[int]:
        dq = deque()  # 存索引，对应值单调递减
        ans = []
        for i, x in enumerate(nums):
            # 入窗：维护单调递减，踢掉比 x 小的
            while dq and nums[dq[-1]] <= x:
                dq.pop()
            dq.append(i)
            # 出窗：队首过期
            if dq[0] <= i - k:
                dq.popleft()
            # 窗口成形后开始记录
            if i >= k - 1:
                ans.append(nums[dq[0]])
        return ans
```

**核心思想**：维护一个**单调递减的索引队列**。队首永远是当前窗口最大值。

**为什么踢掉比 x 小的**：它们在 x 离开窗口前永远当不了最大值（x 比它们大、还比它们晚离开）——所以存着没用。

**走一遍** `nums = [1,3,-1,-3,5,3,6,7]`, `k = 3`：

| i | x | 入窗前踢掉 | dq（索引） | 窗口范围 | ans |
|---|---|-----------|-----------|---------|-----|
| 0 | 1 | 无 | [0] | - | - |
| 1 | 3 | 0(=1≤3) | [1] | - | - |
| 2 | -1 | 无 | [1,2] | [1,3,-1] | [3] |
| 3 | -3 | 无 | [1,2,3] | [3,-1,-3] | [3,3] |
| 4 | 5 | 踢 3,2,1 | [4] | [-1,-3,5] | [3,3,5] |
| 5 | 3 | 无 | [4,5] | [-3,5,3] | [3,3,5,5] |
| 6 | 6 | 踢 5 | [6] | [5,3,6] | [3,3,5,5,6] |
| 7 | 7 | 踢 6 | [7] | [3,6,7] | [3,3,5,5,6,7] |

**复杂度**：`O(n)`——每个元素入队出队各一次。

#### 解法二：堆

```python
import heapq

class Solution:
    def maxSlidingWindow(self, nums: list[int], k: int) -> list[int]:
        heap = []  # (-val, idx) 大根堆用负数模拟
        ans = []
        for i, x in enumerate(nums):
            heapq.heappush(heap, (-x, i))
            while heap[0][1] <= i - k:  # 队首过期
                heapq.heappop(heap)
            if i >= k - 1:
                ans.append(-heap[0][0])
        return ans
```

**对比**：堆也能做，但每个元素都可能被多次 pop（堆顶过期时），均摊仍是 `O(n log n)`——比单调队列 `O(n)` 慢。但思路更直观：动态维护窗口内最大值。

[返回本章例题目录](#handbook-sliding-window) · [返回总目录](#handbook-toc)

---

<a id="handbook-dp"></a>

## 四、动态规划

[返回总目录](#handbook-toc) · [查看学习路线](../LEARNING_GUIDE.md)

<details>
<summary>本章经典例题（7 个入口）</summary>

- [LC 70 · 爬楼梯](#handbook-lc70)
- [LC 198 · 打家劫舍](#handbook-lc198)
- [LC 300 · 最长递增子序列](#handbook-lc300)
- [LC 72 · 编辑距离](#handbook-lc72)
- [LC 5 · 最长回文子串](#handbook-lc5)
- [LC 322 · 零钱兑换](#handbook-lc322)
- [LC 416 · 分割等和子集](#handbook-lc416)

</details>

### 核心思想

**状态 + 转移 + 边界**。把大问题表达成小问题的函数，递推填表，避免暴力枚举的指数爆炸。

类比：爬楼梯问题——你想知道 100 阶有几种爬法，不需要枚举所有路径，只需要知道「第 n 阶 = 第 n-1 阶 + 第 n-2 阶的爬法数」（因为最后一步要么跨 1 阶、要么跨 2 阶）。把答案存成一张表，从 1 阶填到 100 阶。

### 识别信号

- 求最优解 / 方案数
- 问题可分解为子问题
- 子问题重叠（同一个小问题被反复用到）
- 通常暴力搜索会 TLE

### 三步走

1. **定义状态**：`dp[i]` 或 `dp[i][j]` 表达什么？（**这一步最关键**，定义错了全盘皆输）
2. **写转移方程**：`dp[i] = f(dp[i-1], dp[i-2], ...)`
3. **确定边界**：`dp[0] = ?`，遍历顺序。

### 和贪心的区别

贪心每步做局部最优选择，不回头；DP 是穷举所有选择后取最优。能用贪心的题一定能用 DP，但 DP 不一定能优化成贪心。判断方法：能举出反例说明贪心不优 → 必须 DP。

### 分类

| 分类 | 识别信号 | 代表题 |
|------|---------|-------|
| 一维 DP | 线性序列、第 i 步只依赖前几步 | 70 爬楼梯、198 打家劫舍 |
| 二维 DP | 两序列对比 / 网格 | 72 编辑距离、62 不同路径 |
| 区间 DP | 合并、切割问题 | 5 最长回文子串、312 戳气球 |
| 背包 DP | 选物品、容量约束 | 322 零钱兑换、416 分割等和子集 |
| 状压 DP | 选取子集、N ≤ 20 | 旅行商、526 美丽排列 |

---

<a id="handbook-lc70"></a>

### 经典题 1：爬楼梯（LeetCode 70）

> n 阶楼梯，每次跨 1 或 2 阶，几种爬法？

#### 解法一：一维 DP

```python
class Solution:
    def climbStairs(self, n: int) -> int:
        if n <= 2: return n
        a, b = 1, 2  # dp[1], dp[2]
        for _ in range(3, n + 1):
            a, b = b, a + b  # dp[i] = dp[i-1] + dp[i-2]
        return b
```

**状态**：`dp[i]` = 爬到第 i 阶的爬法数。
**转移**：`dp[i] = dp[i-1] + dp[i-2]`（最后一步跨 1 阶或 2 阶）。
**边界**：`dp[1] = 1, dp[2] = 2`。
**空间优化**：只依赖前两项，用两个变量滚动即可。

**复杂度**：`O(n)`，空间 `O(1)`。

[返回本章例题目录](#handbook-dp) · [返回总目录](#handbook-toc)

---

<a id="handbook-lc198"></a>

### 经典题 2：打家劫舍（LeetCode 198）

> 数组表示每家可偷的钱，不能偷相邻两家，求最大金额。

#### 解法一：一维 DP

```python
class Solution:
    def rob(self, nums: list[int]) -> int:
        prev, cur = 0, 0  # dp[i-2], dp[i-1]
        for x in nums:
            prev, cur = cur, max(cur, prev + x)
        return cur
```

**状态**：`dp[i]` = 前 i 家能偷的最大金额。
**转移**：`dp[i] = max(dp[i-1], dp[i-2] + nums[i])`
- 不偷第 i 家：`dp[i-1]`
- 偷第 i 家：必须不偷 i-1，所以 `dp[i-2] + nums[i]`

**边界**：`dp[0] = 0`（无家可偷），`dp[-1] = 0`（虚拟）。

**走一遍** `nums = [2,7,9,3,1]`：
- `prev=0, cur=0`
- x=2: `prev=0, cur=max(0, 0+2)=2`
- x=7: `prev=2, cur=max(2, 0+7)=7`
- x=9: `prev=7, cur=max(7, 2+9)=11`
- x=3: `prev=11, cur=max(11, 7+3)=11`
- x=1: `prev=11, cur=max(11, 11+1)=12`

答案 12（偷第 1、3、5 家：2+9+1）。

**复杂度**：`O(n)`，空间 `O(1)`。

[返回本章例题目录](#handbook-dp) · [返回总目录](#handbook-toc)

---

<a id="handbook-lc300"></a>

### 经典题 3：最长递增子序列（LeetCode 300）

> 找严格递增子序列的最大长度。

#### 解法一：标准 DP `O(n²)`

```python
class Solution:
    def lengthOfLIS(self, nums: list[int]) -> int:
        dp = [1] * len(nums)  # dp[i] = 以 nums[i] 结尾的最长 LIS
        for i in range(len(nums)):
            for j in range(i):
                if nums[j] < nums[i]:
                    dp[i] = max(dp[i], dp[j] + 1)
        return max(dp)
```

**状态**：`dp[i]` = 以 `nums[i]` 结尾的 LIS 长度。**必须以 i 结尾**，这样才能用 `nums[j] < nums[i]` 接上。
**转移**：对所有 `j < i` 且 `nums[j] < nums[i]`，`dp[i] = max(dp[i], dp[j] + 1)`。
**复杂度**：`O(n²)`。

#### 解法二：贪心 + 二分 `O(n log n)`

```python
import bisect

class Solution:
    def lengthOfLIS(self, nums: list[int]) -> int:
        tails = []  # tails[i] = 长度为 i+1 的所有 LIS 末尾的最小值
        for x in nums:
            i = bisect.bisect_left(tails, x)
            if i == len(tails):
                tails.append(x)  # x 比所有 tail 大，扩展
            else:
                tails[i] = x  # 否则替换，让 tail 更小更有潜力
        return len(tails)
```

**核心思想**：维护一个 `tails` 数组，`tails[i]` 表示「长度为 `i+1` 的递增子序列末尾的最小值」。这个数组天然递增——长度 i+1 的最小末尾 < 长度 i+2 的最小末尾。

每个新元素 `x`：
- 若 `x` 比所有 `tails` 大 → 扩展长度（append）
- 否则用 `x` 替换第一个 `≥ x` 的 tail → 让该长度的末尾更小，后面更有可能扩展

**只求长度，不重建子序列**。重建版本会复杂很多。

**走一遍** `nums = [10,9,2,5,3,7,101,18]`：

| x | tails（变化后）|
|---|----------------|
| 10 | [10] |
| 9 | [9] |
| 2 | [2] |
| 5 | [2,5] |
| 3 | [2,3] |
| 7 | [2,3,7] |
| 101 | [2,3,7,101] |
| 18 | [2,3,7,18] |

长度 4。

**复杂度**：`O(n log n)`。这是 LIS 问题最经典的优化——「**DP + 二分**」是一类套路，类似的有「最长递增子序列的子序列问题」。

[返回本章例题目录](#handbook-dp) · [返回总目录](#handbook-toc)

---

<a id="handbook-lc72"></a>

### 经典题 4：编辑距离（LeetCode 72）

> 字符串 a → b 的最少操作次数（插入/删除/替换）。

#### 解法：二维 DP

```python
class Solution:
    def minDistance(self, word1: str, word2: str) -> int:
        m, n = len(word1), len(word2)
        dp = [[0] * (n + 1) for _ in range(m + 1)]
        # 边界：a 空 → 全插入；b 空 → 全删除
        for i in range(m + 1): dp[i][0] = i
        for j in range(n + 1): dp[0][j] = j
        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if word1[i-1] == word2[j-1]:
                    dp[i][j] = dp[i-1][j-1]  # 字符相等，无需操作
                else:
                    dp[i][j] = 1 + min(
                        dp[i-1][j-1],  # 替换
                        dp[i-1][j],    # 删除 a[i]
                        dp[i][j-1]     # 插入 b[j]
                    )
        return dp[m][n]
```

**状态**：`dp[i][j]` = `a[:i]` 变成 `b[:j]` 的最少操作数。
**转移**：
- `a[i-1] == b[j-1]`：不用操作，`dp[i][j] = dp[i-1][j-1]`
- 否则三选一取最小：
  - 替换：`dp[i-1][j-1] + 1`（a[i-1] 换成 b[j-1]）
  - 删除：`dp[i-1][j] + 1`（删 a[i-1]）
  - 插入：`dp[i][j-1] + 1`（插入 b[j-1] 到 a）

**边界**：`dp[i][0] = i`（a 前 i 全删）、`dp[0][j] = j`（a 空全插）。

**走一遍** `a="horse"`, `b="ros"`：

| | "" | r | o | s |
|---|---|---|---|---|
| "" | 0 | 1 | 2 | 3 |
| h | 1 | 1 | 2 | 3 |
| o | 2 | 2 | 1 | 2 |
| r | 3 | 2 | 2 | 2 |
| s | 4 | 3 | 3 | 2 |
| e | 5 | 4 | 4 | 3 |

答案 3（horse → rorse → rose → ros）。

**复杂度**：`O(mn)`。

[返回本章例题目录](#handbook-dp) · [返回总目录](#handbook-toc)

---

<a id="handbook-lc5"></a>

### 经典题 5：最长回文子串（LeetCode 5）

> 找最长回文子串。

#### 解法一：区间 DP

```python
class Solution:
    def longestPalindrome(self, s: str) -> str:
        n = len(s)
        dp = [[False] * n for _ in range(n)]
        start, max_len = 0, 1
        for i in range(n): dp[i][i] = True  # 单字符回文
        for L in range(2, n + 1):  # 枚举区间长度
            for i in range(n - L + 1):
                j = i + L - 1
                if s[i] == s[j] and (L == 2 or dp[i+1][j-1]):
                    dp[i][j] = True
                    if L > max_len:
                        start, max_len = i, L
        return s[start:start + max_len]
```

**状态**：`dp[i][j]` = `s[i..j]` 是否回文。
**转移**：`dp[i][j] = (s[i] == s[j]) and dp[i+1][j-1]`。边界 `L==2` 时直接看两端相等。
**枚举顺序**：必须按区间长度从小到大填——长区间依赖短区间。

**复杂度**：`O(n²)`，空间 `O(n²)`。

#### 解法二：中心扩展

```python
class Solution:
    def longestPalindrome(self, s: str) -> str:
        def expand(l, r):
            while l >= 0 and r < len(s) and s[l] == s[r]:
                l -= 1; r += 1
            return l + 1, r - 1  # 回文左右端

        start, end = 0, 0
        for i in range(len(s)):
            l1, r1 = expand(i, i)     # 奇数中心
            l2, r2 = expand(i, i+1)   # 偶数中心
            if r1 - l1 > end - start:
                start, end = l1, r1
            if r2 - l2 > end - start:
                start, end = l2, r2
        return s[start:end+1]
```

**核心思想**：回文以中心对称。枚举每个中心（2n-1 个：n 个奇数中心 + n-1 个偶数中心），向外扩展到不再对称。

**对比**：DP 更通用（可以扩展到「回文子序列」等问题），中心扩展更直观、空间 `O(1)`。两者时间都是 `O(n²)`。

#### 解法三：Manacher 算法 `O(n)`

工程上极少用到，了解即可。核心是把奇偶中心统一化（插入分隔符），用已计算的回文半径跳过重复计算。

[返回本章例题目录](#handbook-dp) · [返回总目录](#handbook-toc)

---

<a id="handbook-lc322"></a>

### 经典题 6：零钱兑换（LeetCode 322）

> 不同面值硬币 `coins`，凑成 `amount` 的最少硬币数。

#### 解法：完全背包 DP

```python
class Solution:
    def coinChange(self, coins: list[int], amount: int) -> int:
        dp = [float('inf')] * (amount + 1)
        dp[0] = 0
        for coin in coins:
            for x in range(coin, amount + 1):
                dp[x] = min(dp[x], dp[x - coin] + 1)
        return dp[amount] if dp[amount] != float('inf') else -1
```

**状态**：`dp[x]` = 凑到金额 x 的最少硬币数。
**转移**：`dp[x] = min(dp[x], dp[x - coin] + 1)`——尝试每个硬币，选最少。
**边界**：`dp[0] = 0`（金额 0 不需要硬币）。

**为什么是「完全背包」**：每个硬币可以用无限次。如果每个只能用一次（01 背包），内层要倒序遍历。

**遍历顺序的玄机**：
- 完全背包（物品无限）：内层正序 `for x in range(coin, amount+1)`
- 01 背包（物品一次）：内层倒序 `for x in range(amount, coin-1, -1)`

倒序是为了不让同一个物品在一轮内被多次使用——正序时 `dp[x]` 依赖的 `dp[x-coin]` 可能已经用了同一硬币。

**复杂度**：`O(|coins| × amount)`。

[返回本章例题目录](#handbook-dp) · [返回总目录](#handbook-toc)

---

<a id="handbook-lc416"></a>

### 经典题 7：分割等和子集（LeetCode 416）

> 数组能否分成两个子集使和相等。

#### 解法：01 背包 DP

```python
class Solution:
    def canPartition(self, nums: list[int]) -> bool:
        s = sum(nums)
        if s % 2: return False
        target = s // 2
        dp = [False] * (target + 1)
        dp[0] = True
        for x in nums:
            for t in range(target, x - 1, -1):  # 倒序！
                dp[t] = dp[t] or dp[t - x]
        return dp[target]
```

**核心思想**：等价于「能否选若干元素使和为 sum/2」。这是经典 01 背包——每个数选或不选。

**为什么倒序**：每个数只能用一次。如果正序，`dp[t]` 依赖的 `dp[t-x]` 可能已经包含了当前这个 x，导致同一数被多次选。

**复杂度**：`O(n × target)`。

[返回本章例题目录](#handbook-dp) · [返回总目录](#handbook-toc)

---

<a id="handbook-prefix-sum"></a>

## 五、前缀和 + 差分

[返回总目录](#handbook-toc) · [查看学习路线](../LEARNING_GUIDE.md)

<details>
<summary>本章经典例题（3 个入口）</summary>

- [LC 303 · 区域和检索](#handbook-lc303)
- [LC 560 · 和为 K 的子数组](#handbook-lc560)
- [LC 1109 · 航班预订统计—— 差分](#handbook-lc1109)

</details>

### 核心思想

把"区间查询"从 `O(n)` 压到 `O(1)`。类比：你经常问「1 月到 5 月销售额是多少」，与其每次重新累加，不如预先存一张累计表，一次查询用减法即可。

### 识别信号

- 多次区间和查询
- 区间批量加减操作（差分）

<a id="handbook-lc303"></a>

### 经典题 1：区域和检索（LeetCode 303）

```python
class NumArray:
    def __init__(self, nums: list[int]):
        self.prefix = [0]
        for x in nums:
            self.prefix.append(self.prefix[-1] + x)

    def sumRange(self, left: int, right: int) -> int:
        return self.prefix[right + 1] - self.prefix[left]
```

`prefix[i] = nums[0..i-1]` 之和。`sum(l, r) = prefix[r+1] - prefix[l]`。

[返回本章例题目录](#handbook-prefix-sum) · [返回总目录](#handbook-toc)

<a id="handbook-lc560"></a>

### 经典题 2：和为 K 的子数组（LeetCode 560）

```python
from collections import defaultdict

class Solution:
    def subarraySum(self, nums: list[int], k: int) -> int:
        cnt = defaultdict(int)
        cnt[0] = 1  # 前缀和为 0 出现 1 次（空前缀）
        cur = 0
        ans = 0
        for x in nums:
            cur += x
            ans += cnt[cur - k]  # 多少个前缀和 == cur - k
            cnt[cur] += 1
        return ans
```

**核心思想**：`sum(l..r) = prefix[r+1] - prefix[l] = k` 等价于 `prefix[l] = prefix[r+1] - k`。一边累加当前前缀和 `cur`，一边查之前出现过几次 `cur - k`——哈希表 `O(1)` 查询。

**复杂度**：`O(n)`。比暴力 `O(n²)` 快了一个数量级。

[返回本章例题目录](#handbook-prefix-sum) · [返回总目录](#handbook-toc)

<a id="handbook-lc1109"></a>

### 经典题 3：航班预订统计（LeetCode 1109）—— 差分

```python
class Solution:
    def corpFlightBookings(self, bookings: list[list[int]], n: int) -> list[int]:
        diff = [0] * (n + 1)
        for first, last, seats in bookings:
            diff[first - 1] += seats    # 起点加
            diff[last] -= seats         # 终点后一位减
        # 恢复
        ans = []
        cur = 0
        for i in range(n):
            cur += diff[i]
            ans.append(cur)
        return ans
```

**差分**：对区间 `[l, r]` 全体加 v，只需 `diff[l] += v` 和 `diff[r+1] -= v`，最后做一次前缀和恢复。多次区间操作从 `O(n)` 每次 → 总 `O(n + 操作数)`。

[返回本章例题目录](#handbook-prefix-sum) · [返回总目录](#handbook-toc)

---

<a id="handbook-monotonic-stack"></a>

## 六、单调栈

[返回总目录](#handbook-toc) · [查看学习路线](../LEARNING_GUIDE.md)

<details>
<summary>本章经典例题（3 个入口）</summary>

- [LC 739 · 每日温度](#handbook-lc739)
- [LC 84 · 柱状图最大矩形](#handbook-lc84)
- [LC 42 · 接雨水](#handbook-lc42)

</details>

### 核心思想

栈内元素保持单调（递增或递减），用来回答「下一个更大 / 更小元素」类问题。每个元素入栈前会踢掉所有"无未来"的元素。

### 识别信号

- 找下一个更大/更小
- 环形数组找下界
- 柱状图最大矩形

<a id="handbook-lc739"></a>

### 经典题 1：每日温度（LeetCode 739）

```python
class Solution:
    def dailyTemperatures(self, temps: list[int]) -> list[int]:
        stack = []  # 存索引，对应温度单调递减
        ans = [0] * len(temps)
        for i, t in enumerate(temps):
            while stack and temps[stack[-1]] < t:
                j = stack.pop()
                ans[j] = i - j
            stack.append(i)
        return ans
```

**机制**：栈里存的是"还没找到更大值"的索引，对应温度单调递减。遇到 `t` 大于栈顶温度时，栈顶就找到了它的"下一个更大值"，弹出并填答案。

**复杂度**：`O(n)`——每个元素入栈出栈各一次。

[返回本章例题目录](#handbook-monotonic-stack) · [返回总目录](#handbook-toc)

<a id="handbook-lc84"></a>

### 经典题 2：柱状图最大矩形（LeetCode 84）

```python
class Solution:
    def largestRectangleArea(self, heights: list[int]) -> int:
        stack = []
        ans = 0
        heights = heights + [0]  # 哨兵，强制清空栈
        for i, h in enumerate(heights):
            while stack and heights[stack[-1]] > h:
                top = stack.pop()
                width = i if not stack else i - stack[-1] - 1
                ans = max(ans, heights[top] * width)
            stack.append(i)
        return ans
```

**核心思想**：以每根柱子为高度时，矩形能向左向右延伸到哪？答案：延伸到第一根更矮的柱子之前。单调栈维护递增序列，遇到更矮的柱子时，把比它高的柱子一个个弹出并计算面积。

**哨兵技巧**：末尾加一个 0，强制清空栈——避免循环结束后还剩元素需要单独处理。

**复杂度**：`O(n)`。

[返回本章例题目录](#handbook-monotonic-stack) · [返回总目录](#handbook-toc)

<a id="handbook-lc42"></a>

### 经典题 3：接雨水（LeetCode 42）

> 给定柱高，计算能接多少雨水。

#### 解法一：双指针 `O(n)`

```python
class Solution:
    def trap(self, height: list[int]) -> int:
        left, right = 0, len(height) - 1
        left_max = right_max = 0
        ans = 0
        while left < right:
            if height[left] < height[right]:
                if height[left] >= left_max:
                    left_max = height[left]
                else:
                    ans += left_max - height[left]
                left += 1
            else:
                if height[right] >= right_max:
                    right_max = height[right]
                else:
                    ans += right_max - height[right]
                right -= 1
        return ans
```

**关键观察**：每根柱子能接的雨水量 = `min(左边最高, 右边最高) - 自己的高度`（若为正）。

**双指针为什么对**：哪边最大值更小，就处理哪边——因为那边的最大值就是瓶颈，决定了该柱子的水位。

#### 解法二：单调栈

```python
class Solution:
    def trap(self, height: list[int]) -> int:
        stack = []
        ans = 0
        for i, h in enumerate(height):
            while stack and height[stack[-1]] < h:
                bottom = stack.pop()
                if not stack: break
                width = i - stack[-1] - 1
                ans += (min(height[stack[-1]], h) - height[bottom]) * width
            stack.append(i)
        return ans
```

**思路**：按"层"算。当遇到比栈顶高的柱子时，形成凹槽，凹槽底部是栈顶，左右边界是栈顶下一个和当前 i。

#### 解法三：DP（前后缀最大值）

```python
class Solution:
    def trap(self, height: list[int]) -> int:
        n = len(height)
        left_max = [0] * n
        right_max = [0] * n
        left_max[0] = height[0]
        for i in range(1, n):
            left_max[i] = max(left_max[i-1], height[i])
        right_max[n-1] = height[n-1]
        for i in range(n-2, -1, -1):
            right_max[i] = max(right_max[i+1], height[i])
        return sum(min(left_max[i], right_max[i]) - height[i] for i in range(n))
```

**对比**：三种解法都 `O(n)`，空间 `O(1)/O(n)/O(n)`。双指针最省空间，DP 最易懂，单调栈思路最通用（能扩展到柱状图等变种）。

[返回本章例题目录](#handbook-monotonic-stack) · [返回总目录](#handbook-toc)

---

<a id="handbook-monotonic-queue"></a>

## 七、单调队列

[返回总目录](#handbook-toc) · [查看学习路线](../LEARNING_GUIDE.md)

<details>
<summary>本章经典例题（1 个入口）</summary>

- [LC 239 · 滑动窗口最大值](#handbook-lc239-monotonic-queue)

</details>

### 核心思想

双端队列维护窗口内最值，队首始终是当前窗口最大（或最小）。是滑动窗口的"升级版"——窗口需要动态查询最值时就靠它。

<a id="handbook-lc239-monotonic-queue"></a>

### 经典题：滑动窗口最大值（LeetCode 239）

[查看 LC 239 完整解法：滑动窗口章节](#handbook-lc239-sliding-window)

详见前文【三、滑动窗口】的经典题 3。这里强调单调队列和滑动窗口的耦合点：

- 窗口滑窗需要查询「当前窗口最大值」——这超出哈希表计数的能力
- 单调队列正好补位：入窗维护单调、出窗清过期，每步 `O(1)` 取最大

[返回本章例题目录](#handbook-monotonic-queue) · [返回总目录](#handbook-toc)

---

<a id="handbook-heap"></a>

## 八、堆 / 优先队列

[返回总目录](#handbook-toc) · [查看学习路线](../LEARNING_GUIDE.md)

<details>
<summary>本章经典例题（2 个入口）</summary>

- [LC 215 · 数组中第 K 大元素](#handbook-lc215)
- [LC 295 · 数据流中位数](#handbook-lc295)

</details>

### 核心思想

动态维护 Top-K，或者动态求中位数。Python 用 `heapq`（小根堆，大根堆用负数模拟）。

### 识别信号

- 前 K 个 / 第 K 大
- 数据流的中位数
- 合并 K 个有序链表

<a id="handbook-lc215"></a>

### 经典题 1：数组中第 K 大元素（LeetCode 215）

#### 解法一：小根堆 `O(n log k)`

```python
import heapq

class Solution:
    def findKthLargest(self, nums: list[int], k: int) -> int:
        heap = []
        for x in nums:
            heapq.heappush(heap, x)
            if len(heap) > k:
                heapq.heappop(heap)  # 维护大小为 k 的小根堆
        return heap[0]
```

**机制**：维护大小为 k 的最小堆，堆顶始终是当前 k 个里最小的。扫完数组后堆顶就是第 k 大。

**复杂度**：`O(n log k)`，空间 `O(k)`。

#### 解法二：快速选择 `O(n)` 平均

```python
import random

class Solution:
    def findKthLargest(self, nums: list[int], k: int) -> int:
        target = len(nums) - k  # 转成"第 target 小"（0-indexed）
        def quickselect(l, r):
            pivot_idx = random.randint(l, r)
            nums[pivot_idx], nums[r] = nums[r], nums[pivot_idx]
            pivot = nums[r]
            store = l
            for i in range(l, r):
                if nums[i] < pivot:
                    nums[store], nums[i] = nums[i], nums[store]
                    store += 1
            nums[store], nums[r] = nums[r], nums[store]
            if store == target:
                return nums[store]
            elif store < target:
                return quickselect(store + 1, r)
            else:
                return quickselect(l, store - 1)
        return quickselect(0, len(nums) - 1)
```

**核心思想**：快排的 partition 一次能把 pivot 放到最终位置。如果 pivot 落在 target 位置，就是答案；否则只递归一边。**期望 `O(n)`，最坏 `O(n²)`** 但随机化 pivot 几乎不会遇到最坏。

[返回本章例题目录](#handbook-heap) · [返回总目录](#handbook-toc)

<a id="handbook-lc295"></a>

### 经典题 2：数据流中位数（LeetCode 295）

```python
import heapq

class MedianFinder:
    def __init__(self):
        self.left = []   # 大根堆（用负数模拟），存较小一半
        self.right = []  # 小根堆，存较大一半

    def addNum(self, num: int) -> None:
        heapq.heappush(self.left, -num)
        # 平衡：左堆顶 ≤ 右堆顶，且左堆大小 = 右堆 或 右堆+1
        heapq.heappush(self.right, -heapq.heappop(self.left))
        if len(self.right) > len(self.left):
            heapq.heappush(self.left, -heapq.heappop(self.right))

    def findMedian(self) -> float:
        if len(self.left) > len(self.right):
            return -self.left[0]
        return (-self.left[0] + self.right[0]) / 2
```

**核心思想**：两个堆——`left`（大根堆，较小一半）和 `right`（小根堆，较大一半）。中位数要么是 `left` 顶（左多一个），要么是两顶平均。插入时通过两次 push-pop 维护平衡：新数先进 left，把 left 最大挪到 right，如果 right 多了再挪一个回 left。

**复杂度**：插入 `O(log n)`，查询 `O(1)`。

[返回本章例题目录](#handbook-heap) · [返回总目录](#handbook-toc)

---

<a id="handbook-backtracking"></a>

## 九、回溯

[返回总目录](#handbook-toc) · [查看学习路线](../LEARNING_GUIDE.md)

<details>
<summary>本章经典例题（4 个入口）</summary>

- [LC 46 · 全排列](#handbook-lc46)
- [LC 78 · 子集](#handbook-lc78)
- [LC 39 · 组合总和](#handbook-lc39)
- [LC 51 · N 皇后](#handbook-lc51)

</details>

### 核心思想

递归 + 撤销选择。本质是穷举所有方案，通过"做选择 → 递归 → 撤销选择"在状态空间里走树形路径。

### 识别信号

- 排列 / 组合 / 子集
- 棋盘问题（N 皇后、解数独）
- 所有方案枚举

### 模板骨架

```python
def backtrack(路径, 选择列表):
    if 满足结束条件:
        结果.append(路径[:])  # 注意拷贝
        return
    for 选择 in 选择列表:
        做选择       # 加入路径
        backtrack(路径, 选择列表)
        撤销选择     # 从路径移除
```

<a id="handbook-lc46"></a>

### 经典题 1：全排列（LeetCode 46）

```python
class Solution:
    def permute(self, nums: list[int]) -> list[list[int]]:
        ans = []
        used = [False] * len(nums)
        path = []
        def bt():
            if len(path) == len(nums):
                ans.append(path[:])
                return
            for i in range(len(nums)):
                if used[i]: continue
                used[i] = True
                path.append(nums[i])
                bt()
                path.pop()
                used[i] = False
        bt()
        return ans
```

**为什么必须拷贝 `path[:]`**：`path` 是同一个 list 引用，递归结束后会被清空，不拷贝结果会全空。

[返回本章例题目录](#handbook-backtracking) · [返回总目录](#handbook-toc)

<a id="handbook-lc78"></a>

### 经典题 2：子集（LeetCode 78）

```python
class Solution:
    def subsets(self, nums: list[int]) -> list[list[int]]:
        ans = []
        path = []
        def bt(start):
            ans.append(path[:])  # 每个节点都是答案
            for i in range(start, len(nums)):
                path.append(nums[i])
                bt(i + 1)  # 只往后选，避免重复
                path.pop()
        bt(0)
        return ans
```

**关键**：`start` 控制"只往后选"，自然去重。**与全排列的区别**：排列要讲究顺序，每次从头选；子集不讲究顺序，按起点向后选避免重复。

[返回本章例题目录](#handbook-backtracking) · [返回总目录](#handbook-toc)

<a id="handbook-lc39"></a>

### 经典题 3：组合总和（LeetCode 39）

```python
class Solution:
    def combinationSum(self, candidates: list[int], target: int) -> list[list[int]]:
        ans = []
        path = []
        def bt(start, remain):
            if remain == 0:
                ans.append(path[:])
                return
            for i in range(start, len(candidates)):
                if candidates[i] > remain: continue  # 剪枝
                path.append(candidates[i])
                bt(i, remain - candidates[i])  # 同一元素可重复用 → 不 +1
                path.pop()
        bt(0, target)
        return ans
```

**剪枝**：`candidates[i] > remain` 直接跳过——比纯回溯快很多。

**可重复用**：`bt(i, ...)` 不加 1，表示同一元素还能再选；如果要"每个只能选一次"（LeetCode 40），就改成 `bt(i+1, ...)` 并先排序处理重复。

[返回本章例题目录](#handbook-backtracking) · [返回总目录](#handbook-toc)

<a id="handbook-lc51"></a>

### 经典题 4：N 皇后（LeetCode 51）

```python
class Solution:
    def solveNQueens(self, n: int) -> list[list[str]]:
        ans = []
        cols = set()
        diag1 = set()  # 主对角线 row - col
        diag2 = set()  # 副对角线 row + col
        board = [['.' ] * n for _ in range(n)]
        def bt(r):
            if r == n:
                ans.append([''.join(row) for row in board])
                return
            for c in range(n):
                if c in cols or r - c in diag1 or r + c in diag2:
                    continue
                cols.add(c); diag1.add(r - c); diag2.add(r + c)
                board[r][c] = 'Q'
                bt(r + 1)
                board[r][c] = '.'
                cols.discard(c); diag1.discard(r - c); diag2.discard(r + c)
        bt(0)
        return ans
```

**核心**：用三个集合 `cols`、`diag1`、`diag2` `O(1)` 判断冲突。对角线索引技巧：主对角线 `r - c` 相同，副对角线 `r + c` 相同。

[返回本章例题目录](#handbook-backtracking) · [返回总目录](#handbook-toc)

---

<a id="handbook-bfs"></a>

## 十、BFS / 拓扑排序

[返回总目录](#handbook-toc) · [查看学习路线](../LEARNING_GUIDE.md)

<details>
<summary>本章经典例题（2 个入口）</summary>

- [LC 127 · 单词接龙](#handbook-lc127)
- [LC 207 · 课程表—— 拓扑排序](#handbook-lc207)

</details>

### 核心思想

BFS 用队列逐层扩散，**天然求无权图最短路**。拓扑排序是 BFS 在 DAG 上的应用：每次取入度为 0 的节点。

<a id="handbook-lc127"></a>

### 经典题 1：单词接龙（LeetCode 127）

```python
from collections import deque

class Solution:
    def ladderLength(self, beginWord: str, endWord: str, wordList: list[str]) -> int:
        wordSet = set(wordList)
        if endWord not in wordSet: return 0
        queue = deque([(beginWord, 1)])
        while queue:
            word, step = queue.popleft()
            if word == endWord: return step
            for i in range(len(word)):
                for c in 'abcdefghijklmnopqrstuvwxyz':
                    nxt = word[:i] + c + word[i+1:]
                    if nxt in wordSet:
                        queue.append((nxt, step + 1))
                        wordSet.discard(nxt)  # 访问过，避免回头
        return 0
```

**关键**：建图是隐式的——"两个词只差一个字母"视为有边。每次生成所有"差一字母"的词，看在不在词表里。

**优化（双向 BFS）**：从 beginWord 和 endWord 同时扩散，相遇即停——能把复杂度从 `O(L * 26 * N)` 降到 `O(L * 26 * √N)` 级别。

[返回本章例题目录](#handbook-bfs) · [返回总目录](#handbook-toc)

<a id="handbook-lc207"></a>

### 经典题 2：课程表（LeetCode 207）—— 拓扑排序

```python
from collections import deque

class Solution:
    def canFinish(self, numCourses: int, prerequisites: list[list[int]]) -> bool:
        graph = [[] for _ in range(numCourses)]
        indeg = [0] * numCourses
        for a, b in prerequisites:
            graph[b].append(a)  # b → a（先修 b 才能修 a）
            indeg[a] += 1
        queue = deque([i for i in range(numCourses) if indeg[i] == 0])
        studied = 0
        while queue:
            x = queue.popleft()
            studied += 1
            for y in graph[x]:
                indeg[y] -= 1
                if indeg[y] == 0:
                    queue.append(y)
        return studied == numCourses
```

**核心思想**：拓扑排序——每次取入度为 0 的节点入队。如果所有节点都能被取出 → 无环 → 可以排课。否则有环，冲突。

[返回本章例题目录](#handbook-bfs) · [返回总目录](#handbook-toc)

---

<a id="handbook-union-find"></a>

## 十一、并查集

[返回总目录](#handbook-toc) · [查看学习路线](../LEARNING_GUIDE.md)

<details>
<summary>本章经典例题（2 个入口）</summary>

- [LC 547 · 省份数量](#handbook-lc547)
- [LC 684 · 冗余连接](#handbook-lc684)

</details>

### 核心思想

维护集合的「合并」与「查询」，判断两个元素是否属于同一集合。**路径压缩 + 按秩合并**让每次操作接近 `O(1)`。

### 模板

```python
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]  # 路径压缩
            x = self.parent[x]
        return x

    def union(self, x, y):
        rx, ry = self.find(x), self.find(y)
        if rx == ry: return False
        if self.rank[rx] < self.rank[ry]:
            rx, ry = ry, rx
        self.parent[ry] = rx
        if self.rank[rx] == self.rank[ry]:
            self.rank[rx] += 1
        return True
```

<a id="handbook-lc547"></a>

### 经典题 1：省份数量（LeetCode 547）

```python
class Solution:
    def findCircleNum(self, isConnected: list[list[int]]) -> int:
        n = len(isConnected)
        uf = UnionFind(n)
        for i in range(n):
            for j in range(i + 1, n):
                if isConnected[i][j]:
                    uf.union(i, j)
        return sum(1 for i in range(n) if uf.find(i) == i)
```

[返回本章例题目录](#handbook-union-find) · [返回总目录](#handbook-toc)

<a id="handbook-lc684"></a>

### 经典题 2：冗余连接（LeetCode 684）

> 树的边加上一条额外边形成环，删掉那条边。

```python
class Solution:
    def findRedundantConnection(self, edges: list[list[int]]) -> list[int]:
        uf = UnionFind(len(edges) + 1)
        for u, v in edges:
            if not uf.union(u, v):  # 已经同集合了 → 这条边形成环
                return [u, v]
        return []
```

**核心**：边依次加入，如果某条边的两端已经在同一集合 → 这条边是冗余的。

[返回本章例题目录](#handbook-union-find) · [返回总目录](#handbook-toc)

---

<a id="handbook-greedy"></a>

## 十二、贪心

[返回总目录](#handbook-toc) · [查看学习路线](../LEARNING_GUIDE.md)

<details>
<summary>本章经典例题（3 个入口）</summary>

- [LC 55 · 跳跃游戏](#handbook-lc55)
- [LC 45 · 跳跃游戏 II](#handbook-lc45)
- [LC 134 · 加油站](#handbook-lc134)

</details>

### 核心思想

每步做局部最优选择，不回头。难点不在写，在**证明贪心选择成立**——通常用反证法：假设存在更优解不包含贪心选择，导出矛盾。

<a id="handbook-lc55"></a>

### 经典题 1：跳跃游戏（LeetCode 55）

```python
class Solution:
    def canJump(self, nums: list[int]) -> bool:
        farthest = 0
        for i, x in enumerate(nums):
            if i > farthest: return False  # 到不了 i
            farthest = max(farthest, i + x)
        return farthest >= len(nums) - 1
```

**贪心**：维护"当前能到达的最远位置"，扫一遍看能否到终点。不需要回溯所有跳跃路径。

[返回本章例题目录](#handbook-greedy) · [返回总目录](#handbook-toc)

<a id="handbook-lc45"></a>

### 经典题 2：跳跃游戏 II（LeetCode 45）

```python
class Solution:
    def jump(self, nums: list[int]) -> int:
        jumps = 0
        end = 0       # 当前一跳能到的边界
        farthest = 0  # 下一跳能到的最远
        for i in range(len(nums) - 1):
            farthest = max(farthest, i + nums[i])
            if i == end:
                jumps += 1
                end = farthest
        return jumps
```

**贪心**：每跳一次都让"下一跳边界"尽可能远。`i` 走到当前边界 `end` 时强制跳一次，并把边界更新为最远可达。

[返回本章例题目录](#handbook-greedy) · [返回总目录](#handbook-toc)

<a id="handbook-lc134"></a>

### 经典题 3：加油站（LeetCode 134）

```python
class Solution:
    def canCompleteCircuit(self, gas: list[int], cost: list[int]) -> int:
        total = 0
        tank = 0
        start = 0
        for i in range(len(gas)):
            diff = gas[i] - cost[i]
            total += diff
            tank += diff
            if tank < 0:
                start = i + 1  # 从这之前任何点出发都不行
                tank = 0
        return start if total >= 0 else -1
```

**关键定理**：如果总油量 ≥ 总消耗，则一定有解；且如果从 `start` 出发到 `i` 时油量为负，则 `[start, i]` 间任何点出发都不行，直接跳到 `i+1` 重新尝试。

[返回本章例题目录](#handbook-greedy) · [返回总目录](#handbook-toc)

---

<a id="handbook-strings"></a>

## 十三、字符串算法

[返回总目录](#handbook-toc) · [查看学习路线](../LEARNING_GUIDE.md)

<details>
<summary>本章经典例题（2 个入口）</summary>

- [LC 28 · 实现 strStr()](#handbook-lc28)
- [LC 208 · 实现 Trie](#handbook-lc208)

</details>

### 核心思想

字符串匹配从 `O(n·m)` 优化到 `O(n+m)` 的关键：**利用已匹配信息避免重复比较**。

<a id="handbook-lc28"></a>

### 经典题 1：实现 strStr()（LeetCode 28）

#### 解法一：暴力 `O(n·m)`

```python
class Solution:
    def strStr(self, haystack: str, needle: str) -> int:
        if not needle: return 0
        for i in range(len(haystack) - len(needle) + 1):
            if haystack[i:i + len(needle)] == needle:
                return i
        return -1
```

#### 解法二：KMP `O(n + m)`

```python
class Solution:
    def strStr(self, haystack: str, needle: str) -> int:
        if not needle: return 0
        # 构建 next 数组
        m = len(needle)
        nxt = [0] * m
        j = 0
        for i in range(1, m):
            while j > 0 and needle[i] != needle[j]:
                j = nxt[j - 1]
            if needle[i] == needle[j]:
                j += 1
            nxt[i] = j
        # 匹配
        j = 0
        for i in range(len(haystack)):
            while j > 0 and haystack[i] != needle[j]:
                j = nxt[j - 1]
            if haystack[i] == needle[j]:
                j += 1
            if j == m:
                return i - m + 1
        return -1
```

**核心思想**：`nxt[i]` = `needle[0..i]` 的最长"前后缀相同"长度。失配时直接跳到 `nxt[j-1]` 位置继续比较，不回退主串指针。

**理解 KMP 的难点**：next 数组的构造本身就是一个 KMP 在 needle 上自我匹配的过程。

[返回本章例题目录](#handbook-strings) · [返回总目录](#handbook-toc)

<a id="handbook-lc208"></a>

### 经典题 2：实现 Trie（LeetCode 208）

```python
class Trie:
    def __init__(self):
        self.children = {}
        self.end = False

    def insert(self, word: str) -> None:
        node = self
        for c in word:
            if c not in node.children:
                node.children[c] = Trie()
            node = node.children[c]
        node.end = True

    def search(self, word: str) -> bool:
        node = self
        for c in word:
            if c not in node.children: return False
            node = node.children[c]
        return node.end

    def startsWith(self, prefix: str) -> bool:
        node = self
        for c in prefix:
            if c not in node.children: return False
            node = node.children[c]
        return True
```

**核心**：前缀树。共享公共前缀的字符串在树上走同一条路径，节省空间且前缀查询 `O(L)`。

[返回本章例题目录](#handbook-strings) · [返回总目录](#handbook-toc)

---

<a id="handbook-trees"></a>

## 十四、树

[返回总目录](#handbook-toc) · [查看学习路线](../LEARNING_GUIDE.md)

<details>
<summary>本章经典例题（3 个入口）</summary>

- [LC 94 · 二叉树中序遍历](#handbook-lc94)
- [LC 236 · 最近公共祖先](#handbook-lc236)
- [LC 98 · 验证二叉搜索树](#handbook-lc98)

</details>

### 核心思想

树的题目大多是**遍历 + 递归**。三种遍历（前/中/后）+ 层序遍历覆盖 80% 的题目。难点常常是把递归改迭代（用栈模拟）。

<a id="handbook-lc94"></a>

### 经典题 1：二叉树中序遍历（LeetCode 94）

#### 解法一：递归

```python
class Solution:
    def inorderTraversal(self, root):
        ans = []
        def dfs(node):
            if not node: return
            dfs(node.left)
            ans.append(node.val)
            dfs(node.right)
        dfs(root)
        return ans
```

#### 解法二：迭代（栈模拟）

```python
class Solution:
    def inorderTraversal(self, root):
        ans = []
        stack = []
        while root or stack:
            while root:  # 一路向左压栈
                stack.append(root)
                root = root.left
            root = stack.pop()
            ans.append(root.val)
            root = root.right  # 转向右子树
        return ans
```

**核心**：中序 = 左→根→右。一路向左压栈，到底就弹出访问，然后转向右子树重复。

[返回本章例题目录](#handbook-trees) · [返回总目录](#handbook-toc)

<a id="handbook-lc236"></a>

### 经典题 2：最近公共祖先（LeetCode 236）

```python
class Solution:
    def lowestCommonAncestor(self, root, p, q):
        if not root or root is p or root is q:
            return root
        left = self.lowestCommonAncestor(root.left, p, q)
        right = self.lowestCommonAncestor(root.right, p, q)
        if left and right:
            return root  # p 和 q 分别在两侧，root 是 LCA
        return left or right  # 都在一侧
```

**核心**：递归判断 p 和 q 在哪。若一个在左、一个在右，当前节点就是 LCA；否则 LCA 在有结果的那一侧。

[返回本章例题目录](#handbook-trees) · [返回总目录](#handbook-toc)

<a id="handbook-lc98"></a>

### 经典题 3：验证二叉搜索树（LeetCode 98）

```python
class Solution:
    def isValidBST(self, root) -> bool:
        def dfs(node, lo, hi):
            if not node: return True
            if not (lo < node.val < hi): return False
            return dfs(node.left, lo, node.val) and dfs(node.right, node.val, hi)
        return dfs(root, float('-inf'), float('inf'))
```

**核心**：BST 的中序遍历是升序。等价地，每个节点值要在 `(祖先的下界, 祖先的上界)` 之间。递归时把上下界传下去。

[返回本章例题目录](#handbook-trees) · [返回总目录](#handbook-toc)

---

<a id="handbook-graphs"></a>

## 十五、图论

[返回总目录](#handbook-toc) · [查看学习路线](../LEARNING_GUIDE.md)

<details>
<summary>本章经典例题（3 个入口）</summary>

- [LC 743 · 网络延迟时间—— Dijkstra](#handbook-lc743)
- [LC 1462 · 课程表 IV—— Floyd](#handbook-lc1462)
- [LC 200 · 岛屿数量](#handbook-lc200)

</details>

### 核心思想

图论题目核心是**遍历（BFS/DFS）+ 最短路 + 拓扑排序**。最短路算法分两类：单源（Dijkstra、Bellman-Ford）和全源（Floyd）。

<a id="handbook-lc743"></a>

### 经典题 1：网络延迟时间（LeetCode 743）—— Dijkstra

```python
import heapq
from collections import defaultdict

class Solution:
    def networkDelayTime(self, times: list[list[int]], n: int, k: int) -> int:
        graph = defaultdict(list)
        for u, v, w in times:
            graph[u].append((v, w))
        heap = [(0, k)]  # (距离, 节点)
        dist = {k: 0}
        while heap:
            d, u = heapq.heappop(heap)
            if d > dist.get(u, float('inf')): continue
            for v, w in graph[u]:
                nd = d + w
                if nd < dist.get(v, float('inf')):
                    dist[v] = nd
                    heapq.heappush(heap, (nd, v))
        return max(dist.values()) if len(dist) == n else -1
```

**核心**：Dijkstra 用最小堆每次取距离最近的未确定节点松弛邻居。不能处理负权。

**复杂度**：`O((V + E) log V)`。

[返回本章例题目录](#handbook-graphs) · [返回总目录](#handbook-toc)

<a id="handbook-lc1462"></a>

### 经典题 2：课程表 IV（LeetCode 1462）—— Floyd

```python
class Solution:
    def checkIfPrerequisite(self, n: int, prerequisites: list[list[int]], queries: list[list[int]]) -> list[bool]:
        reach = [[False] * n for _ in range(n)]
        for a, b in prerequisites:
            reach[a][b] = True
        for k in range(n):
            for i in range(n):
                for j in range(n):
                    if reach[i][k] and reach[k][j]:
                        reach[i][j] = True
        return [reach[a][b] for a, b in queries]
```

**核心**：Floyd 三重循环——节点 k 作为中转，更新 `i → j` 是否可达。`O(n³)` 但代码极简。

[返回本章例题目录](#handbook-graphs) · [返回总目录](#handbook-toc)

<a id="handbook-lc200"></a>

### 经典题 3：岛屿数量（LeetCode 200）

```python
class Solution:
    def numIslands(self, grid: list[list[str]]) -> int:
        if not grid: return 0
        rows, cols = len(grid), len(grid[0])
        count = 0
        def dfs(r, c):
            if r < 0 or r >= rows or c < 0 or c >= cols: return
            if grid[r][c] != '1': return
            grid[r][c] = '0'  # 标记访问
            dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1)
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == '1':
                    count += 1
                    dfs(r, c)
        return count
```

**核心**：每发现一个 '1'，岛屿数 +1，然后 DFS 把整个岛染色成 '0'。也可以 BFS、并查集，思路一致——本质是连通分量计数。

[返回本章例题目录](#handbook-graphs) · [返回总目录](#handbook-toc)

---

<a id="handbook-learning-path"></a>

## 学习路径建议

[返回总目录](#handbook-toc) · [查看学习路线](../LEARNING_GUIDE.md)

本节导航：[题型优先级（ROI 从高到低）](#handbook-learning-priorities) · [最快学明白的路径](#handbook-learning-steps) · [题型组合](#handbook-learning-combinations)

<a id="handbook-learning-priorities"></a>

### 题型优先级（ROI 从高到低）

1. **二分 + 双指针 + 滑动窗口 + 前缀和**：模板短、出现频率高、组合后能解大量题。**先吃透这四个**。
2. **DP + 回溯**：思维密度大但模板稳定，一旦开窍复用率极高。
3. **单调栈/队列 + 堆 + 并查集**：单点数据结构，记一个模板解一类题。
4. **图论 + 字符串算法 + 状压 DP**：低频但面试会考，时间够再补。

<a id="handbook-learning-steps"></a>

### 最快学明白的路径

每个题型挑 1-2 道模板题死磕，搞懂「为什么这么做」而不是「背代码」。然后做 5-10 道变体，体会题型识别信号。**题型识别比模板本身重要**——看出这是「二分答案」还是「滑动窗口」，比记住代码长什么样更值钱。

<a id="handbook-learning-combinations"></a>

### 题型组合

很多中等/困难题是题型组合：
- **792 子序列匹配** = 预处理 + 二分（前文详细讲过）
- **300 LIS** = DP + 二分
- **239 滑动窗口最大值** = 滑动窗口 + 单调队列
- **42 接雨水** = 双指针 / 单调栈 / DP 三种题型都能解

学透单题型是基础，能看到组合才是熟练。

---

> 文档完。每个题型的核心思想 + 模板 + 经典题都在这里了。练题时如果卡住，回来翻一遍对应题型，体会「为什么这么识别、为什么这么写」。算法不是背的，是看出 pattern 的。


[返回总目录](#handbook-toc) · [返回算法目录](README.md) · [返回学习路线](../LEARNING_GUIDE.md)
