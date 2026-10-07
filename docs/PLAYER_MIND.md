# Player Mind

P2 开始后，播放器不再把感知信号直接绑定到动作。

现在的链路：

```text
Perception + Memory
        ↓
     Player Mind
        ↓
 Mood + Desires
        ↓
    Decision
        ↓
      Action
```

## MindState

第一版保留四个连续状态：

- `arousal`：被当前视频“唤醒”的程度
- `curiosity`：对当前片段的好奇与关注
- `impatience`：想让当前状态发生变化的冲动
- `attachment`：与用户长期共同观看形成的关系强度

它们都在 0~1 之间连续变化。

## Mood

Mood 不是单独随机出来的标签，而是上述状态的可读投影。

当前：

- 安静
- 专注
- 躁动
- 着迷
- 游离

Mood 会随视频连续变化。

## Desire

播放器目前能形成五种欲望：

- `rewatch`：想回看
- `linger`：想停留
- `accelerate`：想加速
- `wander`：想去别的视频看看
- `silence`：什么都别做

注意最后一个很重要。

“有自主性”不意味着一定要频繁干预。  
**保持沉默本身也是它的一次选择。**

## 自主性滑块的新含义

P0/P1 时代，自主性更接近“随机事件概率”。

P2 开始后：

> Mind 可以一直有欲望，但自主性决定它有多大概率把欲望执行出来。

因此：

- 0%：它仍然会感知、形成 Mood 和 Desire，但基本不越界
- 30%：多数时候只是陪着看
- 70%：开始明显参与观看
- 100%：它会更经常把自己的欲望变成行为

## 决策

每秒进行一次行为机会判断。

候选动作根据 Desire 获得权重：

```text
rewatch    -> rewind
linger     -> hold
accelerate -> rate
wander     -> cross-video
silence    -> none
```

然后：

1. 先看当前是否处于干预冷却
2. 自主性决定“敢不敢行动”
3. 按 Desire 权重选择
4. `silence` 被选中时什么也不发生
5. 真正行动时写入 intervention log

## 日志

现在 intervention log 不只记录 Perception，也记录：

- mood
- arousal
- curiosity
- impatience
- attachment
- 全部 desires
- lastDecision

因此以后每次“它为什么突然倒退”都可以回放内部链路。

## 调试

控制台：

```js
coWatchDebug.perception
coWatchDebug.mind
coWatchDebug.memory
```

这仍然只是 Player Mind v0.1。

下一步最重要的不是增加更多 Mood，而是加入：

- 性格参数
- Mood 惯性
- 行为后果反馈
- 用户对它行为的“接受 / 抵抗”学习


## v0.2：行为后果反馈

每次越界后都会开启约 5 秒的反馈观察窗口。

目前识别的“拒绝”包括：

- 它把时间拉回去后，用户迅速把进度拖回原位置
- 它拒绝暂停 / 主动停留后，用户再次明确要求暂停
- 它串去另一视频后，用户立即选择别的视频或用进度操作离开

如果用户没有立刻纠正，则视作一次“默许”。

反馈会改变：

- `feedback.score`
- `socialConfidence`
- `tension`
- 下一次行为的执行概率
- 克制型人格的退让时长
- 执拗型人格被拒绝后的欲望强度

## Personality

每个安装实例第一次运行时生成一组长期保存在 localStorage 的性格参数：

- `stubbornness`：执拗
- `deference`：克制 / 尊重用户
- `curiosityBias`：好奇倾向
- `wanderlust`：跨视频游荡倾向

最高的特征会得到一个可读标签：

- 执拗
- 克制
- 好奇
- 游荡

这不是四选一职业。四项数值同时存在。

### 被拒绝以后

高执拗：

```text
用户拒绝
  ↓
tension 上升
  ↓
rewatch / linger 欲望上升
  ↓
后面更可能再次表达自己的意见
```

偏克制：

```text
用户拒绝
  ↓
进入 restrainedUntil
  ↓
一段时间里行为执行概率大幅降低
  ↓
“好。你来。”
```

## Mood 惯性

Mood 现在必须持续满足新状态约 1.8 秒才会真正切换。

这避免了数值在阈值附近抖动时出现：

```text
专注 -> 安静 -> 专注 -> 安静
```

这种“情绪闪烁”。

## 调试 v0.2

```js
coWatchDebug.mind
coWatchDebug.memory.feedback
coWatchDebug.memory.feedbackLog
coWatchDebug.memory.personality
coWatchDebug.getPendingFeedback()

coWatchDebug.force('rewind')
coWatchDebug.force('hold')
coWatchDebug.force('rate')
coWatchDebug.force('cross')

coWatchDebug.setPersonality({
  stubbornness: 1,
  deference: 0
})

coWatchDebug.resetFeedback()
```

这些接口专门用于现阶段测试，正式桌面版本不会把它们当产品 API。
