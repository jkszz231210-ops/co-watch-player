# 测试指南

当前版本仍是浏览器概念原型。测试目的不是检查“能不能播放 MP4”，而是验证 **播放器是否开始像一个能被你影响、也会影响你的共同观看者**。

## 0. 准备

建议准备 2~3 个视频：

1. 一个声音、镜头变化比较明显的视频
2. 一个安静、节奏慢的视频
3. 任意另一个视频，用来测试“串台”

推荐视频每个至少 1 分钟。

运行：

```text
双击 RUN_ME.bat
```

或：

```bash
python -m http.server 5173
```

浏览器打开：

```text
http://localhost:5173
```

推荐 Edge / Chrome。

---

## 1. 基础感知测试

打开一个视频播放 30~60 秒。

观察：

- 时间轴颜色是否随画面主色缓慢变化
- 声音明显时，时间点是否更活跃
- 快速镜头段落与安静段落的表现是否有区别

按 F12 打开控制台：

```js
coWatchDebug.perception
```

重点看：

```text
loudness
motionIntensity
brightness
sceneColor
subtitleDensity
```

这些值应该随视频发生变化。

---

## 2. Mind 测试

控制台：

```js
coWatchDebug.mind
```

连续看几十秒，多执行几次。

重点观察：

```text
mood
arousal
curiosity
impatience
attachment
desires
```

Mood 不应该一帧一变，而应该有明显惯性。

---

## 3. 最重要：测试“拒绝”

把自主性调到 100%。

控制台执行：

```js
coWatchDebug.force('rewind')
```

它会强制把视频往回拉约 4 秒。

### A. 拒绝它

它回退后，**5 秒内立刻把进度条拖回原来的位置附近**。

然后查看：

```js
coWatchDebug.memory.feedback
coWatchDebug.memory.feedbackLog[0]
coWatchDebug.mind
```

应该看到：

```text
resisted + 1
score 下降
socialConfidence 下降
tension 上升
```

播放器还会对你的拒绝说一句话。

---

## 4. 测试“默许”

再次：

```js
coWatchDebug.force('rewind')
```

这次什么都不要做，继续看至少 5 秒。

查看：

```js
coWatchDebug.memory.feedback
```

应该看到：

```text
accepted + 1
score 略微上升
socialConfidence 略微上升
```

这代表它已经可以区分：

> “我动了视频，而你接受了。”

和：

> “我动了视频，但你把它纠正回去了。”

---

## 5. 对比“克制”和“执拗”

这是 v0.2 最值得玩的测试。

先重置反馈：

```js
coWatchDebug.resetFeedback()
```

### 克制人格

```js
coWatchDebug.setPersonality({
  stubbornness: 0,
  deference: 1,
  curiosityBias: 0.4,
  wanderlust: 0.2
})
```

执行：

```js
coWatchDebug.force('rewind')
```

然后立刻拖回原位置，拒绝它。

查看：

```js
coWatchDebug.mind.restrainedUntil
```

它应该进入一段退让期，并出现类似：

> 好。你来。

之后约十几秒，随机自主行为概率会大幅下降。

### 执拗人格

设置：

```js
coWatchDebug.resetFeedback()

coWatchDebug.setPersonality({
  stubbornness: 1,
  deference: 0,
  curiosityBias: 0.6,
  wanderlust: 0.3
})
```

再次强制回退并拒绝。

查看：

```js
coWatchDebug.mind.tension
coWatchDebug.mind.desires
```

它不会进入明显的长退让期，而是：

- tension 明显升高
- rewatch / linger 欲望被推高
- 后续更愿意再次表达意见

这就是第一版“同样被拒绝，不同性格产生不同后果”。

---

## 6. 暂停争夺

执行：

```js
coWatchDebug.force('hold')
```

它会主动停一下再继续。

等它重新播放后立刻再次按暂停。

查看：

```js
coWatchDebug.memory.feedbackLog[0]
```

如果正处于反馈窗口，应出现：

```text
outcome: "resisted"
why: "user-insisted-on-pause"
```

---

## 7. 串台

至少导入两个视频，并打开“允许串台”。

执行：

```js
coWatchDebug.force('cross')
```

它应该突然去另一个视频。

### 默许

什么都不动约 5 秒，应该记为 accepted。

### 拒绝

再次测试。串台后立刻从片单点回别的视频，应记录 resisted。

---

## 8. 自然观看测试

最后才是最重要的真实测试。

设置：

```text
自主性：70%
时间争夺：开
暂停争夺：开
允许串台：开
记住我们：开
```

然后不要看控制台，正常看视频 15~20 分钟。

只记录三类瞬间：

### A. “它好像真的在看”

这是最有价值的。

### B. “挺怪，但有意思”

可以保留但要继续磨。

### C. “这明显就是 Bug / 很烦”

必须记录具体发生时间和行为。

测试结束后再打开：

```js
coWatchDebug.memory.interventionLog
coWatchDebug.memory.feedbackLog
```

这样可以把你的主观感觉与播放器内部理由对应起来。

---

## 9. 当前已知限制

- 浏览器解码能力不等于最终桌面版，部分编码可能无法播放
- 字幕活跃度只能读取浏览器可见的 `textTrack`
- 视觉感知目前只是 32×18 低分辨率采样，不是语义视觉模型
- “接受”暂时定义为数秒内没有立即纠正，不代表用户真的喜欢
- 人格目前是少量连续参数，还没有复杂长期成长
- localStorage 清除后记忆会消失

这些都是当前原型刻意接受的限制。
