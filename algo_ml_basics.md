# 算法面试题库 · AI / 机器学习基础

> 定位：AI 开发者必知的 ML 基础，不要求推导公式，要求理解原理 + 知道工程含义
> 🏢 标注常见出现公司

---

### Q101: 梯度下降的原理是什么？SGD / Adam / AdamW 有什么区别？

**🏢 高频公司**：MiniMax、字节 AI、阿里
**难度**：中等 ⭐⭐

**核心原理**：
沿损失函数梯度的反方向更新参数，每次迭代让 Loss 减小。

```
θ ← θ - lr × ∇L(θ)
```

**三种优化器对比**：

| 优化器 | 学习率 | 动量 | 特点 |
|--------|--------|------|------|
| SGD | 全局固定 | 可选 | 简单，需手动调 lr，容易震荡 |
| Adam | 自适应（每参数） | 一阶+二阶 | 收敛快，不需要精细调 lr |
| AdamW | 自适应 | 一阶+二阶 | Adam + 权重衰减解耦，防过拟合更好 |

**Adam 的核心机制**：
```python
# 伪代码
m = beta1 * m + (1 - beta1) * grad        # 一阶矩（梯度均值）
v = beta2 * v + (1 - beta2) * grad**2     # 二阶矩（梯度方差）

m_hat = m / (1 - beta1**t)  # 偏差修正
v_hat = v / (1 - beta2**t)

theta -= lr * m_hat / (sqrt(v_hat) + epsilon)
```

**为什么 LLM 训练用 AdamW**：
Adam 的 L2 正则化和权重衰减在 Adam 中不等价（因为自适应学习率），AdamW 把 weight decay 从梯度更新中分离出来单独处理，正则化效果更干净。

**考察点**：
1. Adam 的自适应学习率（梯度方差大时步长小，方差小时步长大）
2. AdamW 和 Adam 的区别（解耦权重衰减）
3. 为什么不用 SGD 训练 Transformer（Adam 对稀疏梯度更友好）

**示例答案**：
梯度下降沿 Loss 梯度的反方向更新参数。SGD 学习率固定，对不同参数一视同仁，需要手动调参且容易震荡。Adam 为每个参数维护独立的自适应学习率——梯度历史方差大（变化剧烈）的参数步长小，方差小（平稳）的参数步长大，收敛更快更稳。AdamW 是 LLM 训练的标配，核心改进是把权重衰减从梯度更新里分离出来单独施加，让正则化不受自适应学习率干扰，防过拟合效果更好。实际训练 LLM 时还要配合 learning rate warmup（前 N 步线性增大 lr）和 cosine decay（后期逐渐减小），是提升训练稳定性的工程标配。

---

### Q102: 什么是过拟合和欠拟合？常见的解决手段有哪些？

**🏢 高频公司**：所有 AI 岗
**难度**：简单 ⭐

**核心概念**：
- **欠拟合（Underfitting）**：模型太简单，连训练集都没学好（高偏差）
- **过拟合（Overfitting）**：模型记住了训练集的噪声，泛化能力差（高方差）
- **偏差-方差权衡（Bias-Variance Tradeoff）**：两者不可兼得，需要找平衡点

```
总误差 = 偏差² + 方差 + 不可约误差
```

**解决过拟合的手段**：

| 手段 | 原理 | 场景 |
|------|------|------|
| Dropout | 训练时随机丢弃神经元，防止共适应 | 神经网络 |
| L2 正则化（权重衰减）| 惩罚大权重，使参数更平滑 | 通用 |
| 数据增强 | 增加训练样本多样性 | 图像/NLP |
| Early Stopping | 验证集 Loss 不再下降时停止训练 | 通用 |
| BatchNorm | 规范化层输入分布，降低内部协变量偏移 | 深度网络 |
| 减少模型复杂度 | 减少层数/参数量 | 通用 |

```python
# PyTorch 中的 Dropout
import torch.nn as nn

model = nn.Sequential(
    nn.Linear(512, 256),
    nn.ReLU(),
    nn.Dropout(p=0.3),   # 训练时随机丢弃 30% 神经元
    nn.Linear(256, 10),
)
# 注意：推理时调用 model.eval() 会自动关闭 Dropout
```

**考察点**：
1. 过拟合的诊断：训练 Loss 低但验证 Loss 高
2. Dropout 的训练/推理行为差异
3. LLM 中用 Dropout 的场景（通常在 Attention 和 FFN 后）

**示例答案**：
过拟合是模型太"死记硬背"，在训练集上很好但遇到新数据就差。最直观的判断是训练 Loss 继续降但验证 Loss 开始回升。解决手段分两类：一类是减少模型容量（减层/减参数）；另一类是施加约束（Dropout 随机丢弃神经元防止共适应，L2 正则化惩罚大权重，Early Stopping 在验证集还好时提前停）。数据增强是最高效的方法之一，本质是用已有数据生成更多训练样本提高覆盖率。LLM 训练时通常用 AdamW 的 weight_decay + Dropout（0.1-0.3），配合大量训练数据，过拟合不是主要问题，反而欠拟合（模型容量不足）更常见。

---

### Q103: 交叉熵损失函数是什么？为什么分类任务用它而不用 MSE？

**🏢 高频公司**：字节、阿里、MiniMax
**难度**：中等 ⭐⭐

**交叉熵（Cross-Entropy Loss）**：
衡量预测概率分布和真实分布之间的差异：
```
L = -Σ y_i * log(p_i)
```
二分类简化为：
```
L = -[y*log(p) + (1-y)*log(1-p)]
```

**LLM 的语言模型 Loss（下一个 token 预测）**：
```python
# 本质是多分类交叉熵（词表大小约 100K 类）
loss = F.cross_entropy(logits, target_token_ids)
# 等价于 -log(P(正确token)) 的均值
```

**为什么分类不用 MSE**：
```python
import numpy as np

# 假设真实标签 y=1，预测 p=0.01（差很多）
p = 0.01

mse_loss = (1 - p) ** 2       # = 0.98，梯度 = 2*(p-1) = -1.98
ce_loss  = -np.log(p)         # = 4.6，梯度 = -1/p = -100

# CE 对错误更大的预测给出更强的梯度信号！
```

MSE 在预测很差时梯度很小（梯度消失），Cross-Entropy 通过 log 函数放大错误预测的惩罚。

**困惑度（Perplexity）**：
LLM 评估的常用指标，是交叉熵 Loss 的指数：
```
PPL = exp(average cross-entropy loss)
# PPL 越低 = 模型越"不困惑" = 语言建模能力越强
```

**考察点**：
1. 交叉熵和最大似然估计的关系（等价）
2. Softmax + Cross-Entropy 组合的梯度形式（很简洁：`p - y`）
3. PPL 作为 LLM 评估指标的意义

**示例答案**：
交叉熵衡量"预测概率分布和真实分布有多不一样"，对分类任务非常自然——正确类别的预测概率越高，Loss 越低。不用 MSE 是因为梯度信号质量：当模型预测很错（p=0.01，y=1），MSE 的梯度约为 -2，而 Cross-Entropy 的梯度约为 -100，后者给出更强的修正信号，训练收敛更快。LLM 预训练的损失就是下一个 token 的交叉熵，词表有 10 万个类，每次预测就是在 10 万类中的分类。困惑度（PPL）= exp(Loss)，是 NLP 模型质量的常用指标，GPT-3 在 WikiText 上 PPL 约 20，意味着模型平均每步"相当于从 20 个候选词中选"，越低越好。

---

### Q104: Batch Normalization 和 Layer Normalization 有什么区别？为什么 Transformer 用 LayerNorm？

**🏢 高频公司**：MiniMax、字节 AI
**难度**：中等 ⭐⭐

**BatchNorm（BN）**：
沿 **batch 维度** 归一化，计算每个特征在当前 batch 所有样本上的均值和方差：
```python
# BN：对 batch 中所有样本的同一特征做归一化
# 输入 shape: [batch_size, features]
mean = x.mean(dim=0)   # 每个特征的均值，shape: [features]
var  = x.var(dim=0)
x_norm = (x - mean) / sqrt(var + eps)
```

**LayerNorm（LN）**：
沿 **特征维度** 归一化，对同一样本的所有特征做归一化：
```python
# LN：对每个样本自己的所有特征做归一化
# 输入 shape: [batch_size, seq_len, hidden_size]
mean = x.mean(dim=-1, keepdim=True)   # 每个 token 自身的均值
var  = x.var(dim=-1, keepdim=True)
x_norm = (x - mean) / sqrt(var + eps)
```

**Transformer 为什么用 LayerNorm**：
1. NLP 中 batch 通常较小（显存限制），BN 在小 batch 时均值/方差估计不准
2. 序列长度可变（不同 batch 的序列长度不同），BN 的 batch 统计量计算困难
3. LN 对每个样本独立归一化，不依赖 batch 大小，更适合自回归生成（推理时 batch=1 也正常）

**Pre-LN vs Post-LN**：
- Post-LN（原始 Transformer）：`x = LayerNorm(x + sublayer(x))`——训练不稳定
- Pre-LN（现代 LLM）：`x = x + sublayer(LayerNorm(x))`——梯度更稳定，训练更容易

**考察点**：
1. BN 和 LN 的归一化维度差异
2. BN 在推理时使用训练时统计的 running mean/var（LN 不需要）
3. Pre-LN 提升训练稳定性的原因

**示例答案**：
BatchNorm 在 batch 维度归一化，适合图像 CNN（batch 够大，尺寸固定）；LayerNorm 在特征维度归一化，每个样本独立计算，不依赖 batch。Transformer 用 LN 的原因：NLP 的 batch 通常很小（8-32），BN 的均值/方差估计不准；序列长度可变让 BN 更难处理；推理时生成下一个 token 的 batch size 是 1，BN 在 batch=1 时完全失效，LN 则没有这个问题。现代 LLM 几乎全用 Pre-LN（归一化放在子层输入前），相比原始 Transformer 的 Post-LN，梯度流动更稳定，可以不用 warmup 就直接训练。

---

### Q105: 什么是 Precision、Recall 和 F1？什么时候分别侧重哪个？

**🏢 高频公司**：所有 AI 岗（模型评估必考）
**难度**：简单 ⭐

**混淆矩阵**：
```
              预测正  预测负
实际正    TP      FN
实际负    FP      TN

Precision（精确率）= TP / (TP + FP)   # 预测为正的里面有多少真的是正的
Recall（召回率）   = TP / (TP + FN)   # 实际正例里面有多少被找到了
F1                 = 2 * P * R / (P + R)  # 调和平均
```

```python
from sklearn.metrics import precision_recall_fscore_support, roc_auc_score
import numpy as np

y_true = [1, 0, 1, 1, 0, 1]
y_pred = [1, 0, 0, 1, 0, 1]

p, r, f1, _ = precision_recall_fscore_support(y_true, y_pred, average='binary')
print(f"Precision={p:.2f}, Recall={r:.2f}, F1={f1:.2f}")
```

**选哪个指标**：

| 场景 | 侧重 | 原因 |
|------|------|------|
| 医疗诊断（漏诊代价大）| Recall | 宁可误报，不能漏诊 |
| 垃圾邮件过滤（误判代价大）| Precision | 宁可放过垃圾，不能误判正常邮件 |
| 搜索/推荐 | F1 或 NDCG | 兼顾 |
| RAG 的检索评估 | Recall（Context Recall）| 确保相关文档都被找到 |
| LLM 输出安全过滤 | Recall | 宁可多拦，不能漏过有害内容 |

**AUC-ROC**：
- ROC 曲线：以不同阈值下的 (FPR, TPR) 画曲线
- AUC（面积）越接近 1 越好，0.5 等于随机猜
- 优点：不受样本不平衡影响（比 Accuracy 更可靠）

**考察点**：
1. 为什么类别不平衡时不用 Accuracy（99% 负样本预测全负，Accuracy=99% 但没意义）
2. F1 是调和平均而非算术平均（惩罚 P/R 差距大的情况）
3. RAGAS 里的 Context Precision 和 Context Recall 与这里的概念对应关系

**示例答案**：
Precision 是"找到的里有多少是对的"，Recall 是"该找到的找到了多少"，两者有天然的 trade-off：降低分类阈值会提高 Recall 但降低 Precision。选哪个取决于两类错误的代价：癌症筛查宁可多做活检（高 Recall，漏诊代价太大）；垃圾邮件宁可放过（高 Precision，误判重要邮件代价大）。F1 是调和平均，它会惩罚 P/R 严重不平衡的情况（比如 P=1, R=0.01 算出来 F1 只有 0.02，体现出 Recall 太低是有问题的）。类别严重不平衡时用 AUC-ROC 或 PR-AUC，比 Accuracy 可靠得多——1000 负样本 1 正样本，全猜负的 Accuracy=99.9% 但 AUC 只有 0.5。

---

