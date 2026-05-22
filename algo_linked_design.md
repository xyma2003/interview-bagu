# 算法面试题库 · 链表 / 栈 / 设计题 / 字符串 / 数学

---

### Q51: 反转链表 · LeetCode 206

**🏢 高频公司**：所有大厂（入门必考）
**难度**：简单 ⭐

**题目讲解**：
```python
def reverseList(head):
    prev, curr = None, head
    while curr:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    return prev

# 递归版
def reverseList(head):
    if not head or not head.next: return head
    new_head = reverseList(head.next)
    head.next.next = head
    head.next = None
    return new_head
```

**考察点**：迭代三指针；递归的语义（返回反转后的新头节点）

---

### Q52: 链表中环的检测 · LeetCode 141/142

**🏢 高频公司**：字节、腾讯（必考）
**难度**：简单/中等 ⭐⭐

**LC 141 判断是否有环（快慢指针）**：
```python
def hasCycle(head) -> bool:
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast: return True
    return False
```

**LC 142 找环的入口**：
```python
def detectCycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next; fast = fast.next.next
        if slow == fast:
            # 相遇后，一个指针从 head，另一个从相遇点，同速走，相遇处即环入口
            p = head
            while p != slow:
                p = p.next; slow = slow.next
            return p
    return None
```

**考察点**：Floyd 判圈算法；为什么从 head 和相遇点同速走会在环入口相遇（数学证明）

---

### Q53: 合并两个有序链表 · LeetCode 21

**🏢 高频公司**：所有大厂
**难度**：简单 ⭐

**题目讲解**：
```python
def mergeTwoLists(l1, l2):
    dummy = curr = ListNode(0)
    while l1 and l2:
        if l1.val <= l2.val:
            curr.next = l1; l1 = l1.next
        else:
            curr.next = l2; l2 = l2.next
        curr = curr.next
    curr.next = l1 or l2
    return dummy.next
```

**考察点**：哑节点（dummy）简化链表头操作；追问：合并 K 个有序链表（堆，O(N log K)）

---

### Q54: 合并 K 个升序链表 · LeetCode 23

**🏢 高频公司**：字节（必考）、腾讯
**难度**：困难 ⭐⭐⭐

**题目讲解**：
```python
import heapq

def mergeKLists(lists):
    dummy = curr = ListNode(0)
    heap = []
    for i, node in enumerate(lists):
        if node:
            heapq.heappush(heap, (node.val, i, node))
    while heap:
        val, i, node = heapq.heappop(heap)
        curr.next = node; curr = curr.next
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))
    return dummy.next
```

**复杂度**：O(N log K)，N 为总节点数，K 为链表数

**考察点**：最小堆（用 `i` 作为二级排序避免 ListNode 比较报错）；分治合并也是 O(N log K)

---

### Q55: K 个一组翻转链表 · LeetCode 25

**🏢 高频公司**：字节（高频困难）
**难度**：困难 ⭐⭐⭐

**题目讲解**：
```python
def reverseKGroup(head, k: int):
    dummy = ListNode(0, head)
    prev_group_end = dummy
    
    while True:
        # 找第 k 个节点
        kth = prev_group_end
        for _ in range(k):
            kth = kth.next
            if not kth: return dummy.next
        
        # 翻转 k 个节点
        group_start = prev_group_end.next
        prev, curr = kth.next, group_start
        for _ in range(k):
            nxt = curr.next
            curr.next = prev
            prev = curr
            curr = nxt
        
        # 连接
        prev_group_end.next = kth
        group_start.next = curr
        prev_group_end = group_start
    return dummy.next
```

**考察点**：找第 k 个节点 + 翻转 + 重新连接；细节很多，需要熟练

---

### Q56: 排序链表 · LeetCode 148

**🏢 高频公司**：字节
**难度**：中等 ⭐⭐

**题目**：O(N log N) 时间，O(1) 空间排序链表。

**题目讲解（归并排序）**：
```python
def sortList(head):
    if not head or not head.next: return head
    
    # 快慢指针找中点
    slow, fast = head, head.next
    while fast and fast.next:
        slow = slow.next; fast = fast.next.next
    
    mid = slow.next
    slow.next = None   # 断开
    
    left  = sortList(head)
    right = sortList(mid)
    return merge(left, right)

def merge(l1, l2):
    dummy = curr = ListNode(0)
    while l1 and l2:
        if l1.val <= l2.val: curr.next = l1; l1 = l1.next
        else: curr.next = l2; l2 = l2.next
        curr = curr.next
    curr.next = l1 or l2
    return dummy.next
```

**考察点**：链表归并排序；Bottom-up 迭代版可达 O(1) 空间

---

### Q57: 相交链表 · LeetCode 160

**🏢 高频公司**：字节、腾讯
**难度**：简单 ⭐

**题目讲解**：
```python
def getIntersectionNode(headA, headB):
    a, b = headA, headB
    while a != b:
        a = a.next if a else headB   # 走完 A 后从 B 头开始
        b = b.next if b else headA
    return a  # 相交返回交点，不相交返回 None
```

**考察点**：两指针走相同距离后必然相遇；`a+b = b+a`，消除长度差

---

### Q58: LRU 缓存 · LeetCode 146

**🏢 高频公司**：字节（必考）、腾讯
**难度**：中等 ⭐⭐

**题目讲解（双向链表 + HashMap）**：
```python
class Node:
    def __init__(self, k=0, v=0):
        self.key = k; self.val = v
        self.prev = self.next = None

class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.cache = {}
        self.head = Node(); self.tail = Node()
        self.head.next = self.tail; self.tail.prev = self.head
    
    def _remove(self, node):
        node.prev.next = node.next; node.next.prev = node.prev
    
    def _add_to_head(self, node):
        node.next = self.head.next; node.prev = self.head
        self.head.next.prev = node; self.head.next = node
    
    def get(self, key: int) -> int:
        if key not in self.cache: return -1
        node = self.cache[key]
        self._remove(node); self._add_to_head(node)
        return node.val
    
    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            node = self.cache[key]; node.val = value
            self._remove(node); self._add_to_head(node)
        else:
            node = Node(key, value)
            self.cache[key] = node; self._add_to_head(node)
            if len(self.cache) > self.cap:
                lru = self.tail.prev
                self._remove(lru); del self.cache[lru.key]
```

**考察点**：最近使用放头部，淘汰时删尾部；O(1) 操作依赖双向链表

---

### Q59: 最小栈 · LeetCode 155

**🏢 高频公司**：所有大厂
**难度**：简单 ⭐

**题目讲解**：
```python
class MinStack:
    def __init__(self):
        self.stack = []
        self.min_stack = []   # 同步存当前最小值
    
    def push(self, val: int) -> None:
        self.stack.append(val)
        min_val = min(val, self.min_stack[-1]) if self.min_stack else val
        self.min_stack.append(min_val)
    
    def pop(self) -> None:
        self.stack.pop(); self.min_stack.pop()
    
    def top(self) -> int:
        return self.stack[-1]
    
    def getMin(self) -> int:
        return self.min_stack[-1]
```

**考察点**：辅助栈同步维护历史最小值（不是全局最小，是当前时刻的最小）

---

### Q60: 设计循环队列 · LeetCode 622

**🏢 高频公司**：腾讯
**难度**：中等 ⭐⭐

**题目讲解**：
```python
class MyCircularQueue:
    def __init__(self, k: int):
        self.q = [0] * k; self.k = k
        self.head = self.tail = 0; self.size = 0
    
    def enQueue(self, value: int) -> bool:
        if self.isFull(): return False
        self.q[self.tail] = value
        self.tail = (self.tail + 1) % self.k; self.size += 1
        return True
    
    def deQueue(self) -> bool:
        if self.isEmpty(): return False
        self.head = (self.head + 1) % self.k; self.size -= 1
        return True
    
    def Front(self) -> int: return -1 if self.isEmpty() else self.q[self.head]
    def Rear(self)  -> int: return -1 if self.isEmpty() else self.q[(self.tail-1)%self.k]
    def isEmpty(self) -> bool: return self.size == 0
    def isFull(self)  -> bool: return self.size == self.k
```

---

### Q61: 用两个栈实现队列 · LeetCode 232

**🏢 高频公司**：字节、腾讯
**难度**：简单 ⭐

**题目讲解**：
```python
class MyQueue:
    def __init__(self):
        self.in_stack = []; self.out_stack = []
    
    def push(self, x: int) -> None:
        self.in_stack.append(x)
    
    def pop(self) -> int:
        self._move(); return self.out_stack.pop()
    
    def peek(self) -> int:
        self._move(); return self.out_stack[-1]
    
    def empty(self) -> bool:
        return not self.in_stack and not self.out_stack
    
    def _move(self):
        if not self.out_stack:
            while self.in_stack:
                self.out_stack.append(self.in_stack.pop())
```

**考察点**：两个栈实现 FIFO；均摊 O(1) 的分析（每个元素最多进出各两次）

---

### Q62: 字符串解码 · LeetCode 394

**🏢 高频公司**：字节、小红书
**难度**：中等 ⭐⭐

**题目**：`3[a2[c]]` → `accaccacc`

**题目讲解**：
```python
def decodeString(s: str) -> str:
    stack = []
    cur_str = ""
    cur_num = 0
    for c in s:
        if c.isdigit():
            cur_num = cur_num * 10 + int(c)
        elif c == '[':
            stack.append((cur_str, cur_num))
            cur_str = ""; cur_num = 0
        elif c == ']':
            prev_str, num = stack.pop()
            cur_str = prev_str + cur_str * num
        else:
            cur_str += c
    return cur_str
```

**考察点**：栈保存"外层状态"；`cur_num * 10 + int(c)` 处理多位数

---

### Q63: 每日温度 · LeetCode 739

**🏢 高频公司**：字节、腾讯
**难度**：中等 ⭐⭐

**题目**：找出每天之后第一个更高温度的距离。

**题目讲解（单调递减栈）**：
```python
def dailyTemperatures(temperatures: list[int]) -> list[int]:
    n = len(temperatures)
    ans = [0] * n
    stack = []  # 存下标，维护单调递减
    for i, t in enumerate(temperatures):
        while stack and temperatures[stack[-1]] < t:
            j = stack.pop()
            ans[j] = i - j
        stack.append(i)
    return ans
```

**考察点**：单调栈解决"下一个更大元素"问题；O(N) 时间

---

### Q64: 接雨水 Ⅱ（单调栈解法）· 对比 LC 42

**题目讲解（单调栈）**：
```python
def trap_stack(height: list[int]) -> int:
    stack = []; ans = 0
    for i, h in enumerate(height):
        while stack and height[stack[-1]] < h:
            bottom = stack.pop()
            if not stack: break
            width    = i - stack[-1] - 1
            bounded  = min(height[stack[-1]], h) - height[bottom]
            ans += width * bounded
        stack.append(i)
    return ans
```

**考察点**：单调栈按"层"计算雨水；与双指针按"列"计算的区别

---

### Q65: 最长有效括号 · LeetCode 32

**🏢 高频公司**：字节（困难）
**难度**：困难 ⭐⭐⭐

**题目讲解（栈）**：
```python
def longestValidParentheses(s: str) -> int:
    stack = [-1]   # 存下标，-1 作为哨兵
    ans = 0
    for i, c in enumerate(s):
        if c == '(':
            stack.append(i)
        else:
            stack.pop()
            if not stack:
                stack.append(i)    # 新哨兵
            else:
                ans = max(ans, i - stack[-1])
    return ans
```

**考察点**：栈底维护"上一个无法匹配的右括号"下标（哨兵）；追问：DP 解法

---

### Q66: 罗马数字转整数 · LeetCode 13

**🏢 高频公司**：字节、腾讯
**难度**：简单 ⭐

**题目讲解**：
```python
def romanToInt(s: str) -> int:
    val = {'I':1,'V':5,'X':10,'L':50,'C':100,'D':500,'M':1000}
    ans = 0
    for i in range(len(s)):
        if i+1 < len(s) and val[s[i]] < val[s[i+1]]:
            ans -= val[s[i]]   # 减法规则
        else:
            ans += val[s[i]]
    return ans
```

---

