# 柚希 V1.9：眼部三态关键形交付说明

**本轮目标：** 将原画睁眼、半闭眼、闭眼作为独立可审核形态，确保不再通过随意缩放整块眼睛来产生“伪人感”。

## 实际产物

- `assets/cubism-handoff/v1.9/yuzuki-eye-keyforms-v1.9.psd`：6 层 RGB/sRGB PSD，原画在底层可见，左右眼半闭和完全闭合分别为透明隐藏图层，供画师在 Cubism 建模前直接修改。
- `assets/cubism-handoff/v1.9/key-{open,half,closed}.png`：三种状态的原尺寸整画面预览。
- `assets/cubism-handoff/v1.9/yuzuki-three-keyforms-v1.9.jpg`：原画、V1.5 半闭、V1.9 半闭、V1.9 闭眼画面比较。
- `web/assets/face-rig/blink-v19/blink-atlas.webp`：21 级、左右眼独立素材，已经接入聊天页和挂件的渲染器。
- `tools/build_eye_keyforms_v19.py`：可重复生成以上素材。

## 验收标准

1. **最重要：睁眼状态的渲染与原画像素一致**，不重新贴眼珠。
2. 半闭/闭眼的贴图范围限制在原眼附近，脸部其他区域不动。
3. 左右眼保留原画自身的不对称特征，**不得强迫水平翻转复制**。
4. PSD 的半闭和闭眼草稿默认隐藏。模型制作者可逐个显示、修正轮廓。
5. 模型网格、`.moc3`、`.cmo3` 和 Cubism Editor 实际导入验证尚未完成。

## 尚需手绘的内容

当前上眼睑线条的补强是人工指定几何曲线 + 程序生成的**美术草稿**，不是专业画师手绘。半闭眼依然沿用 V1.5 的原画遮罩与补色，存在色差、残影和皮肤纹理缺失的风险。要完成高质量 Live2D，需要手绘眼白背面、上下眼睑、睫毛、转角遮挡及眼球后方的像素信息，再在 Cubism Editor 绑定变形器并验证实际动作。

对照官方 [眼睛眨眼教程](https://docs.live2d.com/en/cubism-editor-tutorials/eye-blink/) 的原则：先建立自然眼部的关键形，再指定参数驱动；不要只给原始图片做几何硬裁切。
