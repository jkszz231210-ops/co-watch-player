# Perception Layer

P1 的目标是把播放器从“随机做怪事”推进到“看见了一些东西，所以做了某件事”。

## PerceptionFrame

当前浏览器原型持续维护一份内存中的感知帧：

```js
{
  at,
  mediaTime,
  loudness,
  loudnessDelta,
  silenceMs,
  brightness,
  visualDelta,
  sceneCut,
  audioSpike,
  userReplayHeat,
  userPauseHeat
}
```

它不是 AI 语义理解，而是非常便宜的实时信号层。

### 音频

Web Audio API 的 `AnalyserNode` 采样波形，得到：

- 当前音量强度
- 相邻采样的音量变化
- 持续静默时间
- 音量骤变事件

### 视觉

播放器在内存里维护一个不可见的 32×18 canvas，大约每 480ms 抽取一帧。

目前计算：

- 平均亮度
- 与上一采样帧的灰度差
- 粗略场景切换

这不是高精度视觉算法，它的意义是验证：**内容信号能否驱动有因果感的播放器行为。**

### 用户行为记忆

每个本地视频使用：

```text
文件名 + 文件大小 + lastModified
```

生成本地 media key。

时间被切成 5 秒桶，记录：

- pauseHotspots：用户经常暂停的位置
- replayHotspots：用户主动向后拖动后落到的位置

当相同视频再次经过热点时，播放器可能主动回应。

## 当前由感知触发的行为

| 信号 | 可能行为 | reason |
| --- | --- | --- |
| 音量骤变 | 回退约 2.4 秒 | `perception:audio-spike` |
| 明显镜头切换 | 回退约 1.8 秒 | `perception:scene-cut` |
| 长时间静默 | 短暂加速 | `perception:sustained-silence` |
| 重复回看热点 | 主动回看 | `memory:replay-hotspot` |
| 重复暂停热点 | 主动停留 | `memory:pause-hotspot` |
| 用户拖动时反作用 | 推 / 拉时间 | `user-seek:...` |
| 用户暂停时反作用 | 拒绝立即暂停 | `user-pause:resistance` |

## Intervention Log

每次播放器越界都会把下面的信息保存在本机 localStorage 最近 30 条记录中：

- 时间
- 视频名
- 视频时间点
- reason
- 当时的 PerceptionFrame 核心数据

控制台也会输出：

```text
[Co-Watch intervention]
```

这很重要，因为以后出现“播放器突然跳了”的时候，我们必须能够判断：

> 这是它有意做的，还是程序真的坏了？

## 调试入口

浏览器控制台：

```js
coWatchDebug.perception
coWatchDebug.memory
coWatchDebug.getMediaMemory()
coWatchDebug.provoke()
```

P1 阶段优先保持这些接口简单，等桌面版本再迁移到正式的事件总线和 SQLite。
