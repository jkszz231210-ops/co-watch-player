# 04 · 可复用角色技术架构

## 架构目标

同一角色资产可在网页、桌面、聊天程序、游戏中复用；行为和渲染器分离。不能要求其他宿主使用同一个前端框架。

```text
用户输入（文字 / 麦克风）
          |
      对话控制层
    |           |
回复文本/语音   情绪/意图/动作标签
    |           |
TTS 引擎      CharacterEngine ← 默认动作/眨眼/呼吸
    |           |
音素/音量包络    参数目标 + 时间插值 + 优先级混合
    |           |
    +--- mouth/face/body parameters ---+
                        |
                   Renderer Adapter
              |                       |
       Concept Art Preview     Cubism Web SDK (.model3.json)
              |                       |
              +------网页/桌面/游戏宿主-+
```

## 原型代码目前真实边界

- 只有 `CharacterEngine` 数据与 16 态渐变的参数视图，静态角色图只做轻微容器漂浮特效。
- 无真实 AI 服务。`localReply` 通过关键词返回固定文本和情绪，可用于流程测试。
- 朗读为 `SpeechSynthesis`，口型尚未同步，不能宣称音素驱动。
- 语音输入使用浏览器实验性 Web Speech 接口，在部分浏览器或系统上不能运行、可能依赖浏览器服务。

## 迁移为真 Live2D 的接口

给 `CharacterEngine` 增加渲染器适配器：

```js
class CubismAdapter {
  constructor(live2dModel) { this.model = live2dModel; }
  apply(parameters) {
    // 在 SDK/framework 完成初始化，并取得实际模型对象后实现：
    // setParam('ParamEyeLOpen', ...)
    // setParam('ParamEyeROpen', ...)
    // setParam('ParamMouthForm', ...)
    // 不直接使用本原型的单 eyeOpen 来覆盖所有左/右眼参数。
  }
}
```

正式使用时加载一套完整有效的 `*.model3.json` 及它引用的模型与纹理；`.model3.json` 是资源入口，不能只把 `moc3` 拖进页面就当作运行成功。官方 Core 随官方 SDK 分发，请勿擅自把不允许再分发的二进制提交到开源仓库。

官方文档：[Cubism SDK for Web](https://docs.live2d.com/en/cubism-sdk-manual/cubism-sdk-for-web/) · [Web 模型文件结构](https://docs.live2d.com/en/cubism-sdk-manual/model-web/)

## AI 与语音接口建议

生产环境由自己的服务端代理模型调用，浏览器内**不要存储或提交模型服务 API Key**。建议标准化消息：

```json
{
  "reply": "欢迎回来，我正在听。",
  "emotion": "warm",
  "motion": "nod_soft",
  "intensity": 0.55,
  "speech": { "audioUrl": null, "phonemes": [] }
}
```

- 模型负责高层语义与情绪标签，不可直接输出任意 Cubism 参数。
- 服务端强校验 emotion 枚举、强度取值与动作白名单，限制不合理频繁切换。
- TTS 的音频时间与字幕时间应有公共时间轴。音量驱动只能得到粗略嘴张合，真正自然的口型需要音素/嘴形对齐数据。
- 网页嵌入用 Web Component 或独立包；Tauri 桌面容器可以封装同样的 web 静态构建。

## 未来可扩展

- 可选用户授权的会话状态/记忆存储；默认不收集麦克风录音或文本日志到服务端。
- 支持帧率自适应及低配设备动画降级。
- 支持鼠标跟随视线但避免总盯着指针。
- 支持静音、停止朗读、减少动态、动作强度调节。
