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

