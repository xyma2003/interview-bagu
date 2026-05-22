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

