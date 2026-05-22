# 后端面试八股 · 第四篇

---

### Q51: Go 语言的 goroutine 和 channel 是什么？与 Python 协程有什么区别？

**🏢 高频公司**：字节（Go 岗）、腾讯

**题目讲解**：

**Goroutine（Go 的协程）**：
- 由 Go 运行时调度的轻量线程，栈初始大小 2-4KB（线程 8MB）
- 可以创建百万个 goroutine，自动伸缩栈
- M:N 调度（多个 goroutine 映射到多个 OS 线程），真正并行 CPU 密集型任务（无 GIL）

```go
// 创建 goroutine
go func() {
    fmt.Println("goroutine running")
}()

// Channel：goroutine 间通信
ch := make(chan int, 10)  // 带缓冲 channel

go func() {
    ch <- 42  // 发送
}()
val := <-ch  // 接收
```

**Channel 模式**：
```go
// Fan-Out（一发多收）
func fanOut(in <-chan int, n int) []<-chan int {
    outs := make([]<-chan int, n)
    for i := 0; i < n; i++ {
        out := make(chan int)
        outs[i] = out
        go func(out chan<- int) {
            for v := range in { out <- v }
            close(out)
        }(out)
    }
    return outs
}

// Select：多路复用
select {
case v := <-ch1:
    fmt.Println("from ch1:", v)
case v := <-ch2:
    fmt.Println("from ch2:", v)
case <-time.After(time.Second):
    fmt.Println("timeout")
}
```

**与 Python asyncio 的对比**：
| | Go goroutine | Python asyncio |
|---|---|---|
| 线程模型 | M:N（多 OS 线程）| 1:1（单 OS 线程）|
| CPU 并行 | ✅ 真正并行 | ❌ 单线程（GIL）|
| 调度方式 | 抢占式（Go 1.14+）| 协作式（await 让出）|
| 通信方式 | Channel | Queue/Event |
| 并发量 | 百万 goroutine | 数万协程 |

**考察点**：
1. `make(chan int)` vs `make(chan int, 10)`（无缓冲 vs 有缓冲，同步 vs 异步）
2. 关闭 channel 的信号传递（`close(ch)` 让接收方退出 for-range）
3. goroutine 泄漏（channel 没有 sender，receiver 永久阻塞）

**示例答案**：
Go 的 goroutine 是真正的轻量并发，Go 运行时内置调度器，在多个 OS 线程上调度大量 goroutine，实现真正的多核并行（无 GIL）。Channel 是 goroutine 间通信的推荐方式，遵循 CSP 模型——"不要通过共享内存通信，而是通过通信共享内存"。无缓冲 channel 是同步的（发送方等接收方就绪），有缓冲 channel 允许一定量的异步（缓冲满才阻塞）。相比 Python asyncio 的单线程协作式调度，goroutine 的 M:N 调度可以真正利用多核，CPU 密集型任务也能并行。Go 1.14 引入了抢占式调度（不需要显式 yield），解决了长 goroutine 占用线程的问题。

---

