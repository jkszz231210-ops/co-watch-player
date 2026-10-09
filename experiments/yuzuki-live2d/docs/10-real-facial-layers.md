# V0.4 实际五官分层与动画交付说明

## 本次真正制作了什么

- 原始设计：用户已经批准的 front-a 1024×1536 正面主视觉，严格保留脸、眼、头发和服装的基本设计。
- 由 `tools/build_face_rig.py` 解析该图，在预设脸部坐标自动提取 **左眼、右眼、嘴部** 三张带透明通道的原画图层。
- 用邻近脸颊采样和局部图像修复形成遮挡部位的自动修补底图（`base.png`）。
- 用真实的多图层结构生成 `assets/face-rig/yuzuki-facial-prototype.ora`（OpenRaster）。可由 Krita、GIMP 导入，然后另存为 PSD。
- `web/js/raster-face-rig.js` 把**独立的左右眼图像**分别竖直变形，处理周期性自动眨眼，按口部开合参数合成嘴型，并使浏览器 TTS 播放期间嘴巴周期性运动。
- `web/index.html` 增加眨眼/开口/还原三项测试按钮，动作参数仍由 `CharacterEngine` 驱动。
- `tools/render_qa_previews.py` 基于真实四图层做离线 QA 四格图和 GIF，避免网页环境受限导致完全不可验收。

## 资产内容

| 文件 | 作用 |
|---|---|
| `assets/face-rig/yuzuki-facial-prototype.ora` | 4 层可编辑 OpenRaster 源稿（不等于 Cubism 工程） |
| `assets/face-rig/composite-reference.png` | 四层合成应和原图尽可能一致的基准 |
| `assets/face-rig/qa-face-states.jpg` | 闭眼、说话等姿态对比 |
| `assets/face-rig/yuzuki-face-motion-preview.gif` | 离线动画效果预览 |
| `web/assets/face-rig/{base,eye_left,eye_right,mouth}.png` | 较高清的运行中间素材 |
| `web/assets/face-rig/{base,eye_left,eye_right,mouth}.webp` | 浏览器压缩图像；GitHub 上至少保留这一套 |
| `web/assets/face-rig/rig.json` | 像素区域、坐标与试验来源 |

## 美术限制，绝不能混淆

**这不是专业 Live2D、不是正式分层 PSD。** 这是从单张原画自动逆向拆分所得的、可直接修改的眼嘴分层技术试验：

- 眨眼靠原眼图层的二维压缩与替代闭眼线，近景仍可能看出遮罩痕迹。眉毛、虹膜和睫毛尚未按生产要求完全独立拆分。
- 口型是原有嘴唇加程序绘制的张嘴渐变，尚不是 A/I/U/E/O 多组精细口型。
- 头部没有真正的 X/Y 体积旋转、没有额头与头发遮挡重绘，也不存在 ArtMesh / Warp Deformer / .moc3。
- 4 层 ORA 是下游人工补画的**起点**，不是可以无损一键转为精细 Cubism 模型的最终源文件。
- 浏览器自动化测试在当前执行环境因管理员策略阻断网络及 file:// 导航；已执行 JS 静态检查、单元测试、图层 ZIP 格式和离线四帧视觉检查；最终浏览器形态需在普通 Windows 环境确认。

## 推荐下一生产步骤（已确认无需再向用户选择美术方向）

1. 在 Krita/GIMP 打开 ORA，先修复左右眼遮挡与闭眼纹理；按 `docs/08-rig-production-handoff.md` 增加眉毛、上下眼睑、虹膜、眼白、睫毛、口腔内层等。
2. 耳朵/脸/前后发补画被遮挡区域；将身体、发饰、蝴蝶结独立分组；保持原图五官比例，不能随意换脸。
3. 导出规范 PSD，Cubism 做面部角度/变形网格/口型/物理；实际完成后再将网页适配到官方 SDK。
4. 若只是网页聊天可先继续完善当前 Web 动画；Cubism 正式交付应保留用户审核后的形象一致性。

## 重建指令

在项目根目录运行：

```shell
python tools/build_face_rig.py
python tools/render_qa_previews.py
cd web && npm test && npm run check
```

生成器需要 `Pillow`、`opencv-python` 和 `numpy`，但**用户直接看网页、打开 ORA 或 GIF 不需要装这些包**。
