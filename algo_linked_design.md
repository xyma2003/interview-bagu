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

