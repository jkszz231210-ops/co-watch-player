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
