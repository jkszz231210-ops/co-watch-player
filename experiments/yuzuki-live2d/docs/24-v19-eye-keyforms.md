# 柚希 V1.9 三态眼部关键形交付

- 已审核正面立绘：`assets/source/yuzuki-front-a.png`，完全不改动。
- 眼部三态：`assets/cubism-handoff/v1.9/key-{open,half,closed}.png`。
- 独立可编辑的半闭与闭眼左右图层：`assets/cubism-handoff/v1.9/yuzuki-eye-keyforms-v1.9.psd`，6 层（含可见原画底图及隐藏参考）。
- 原创 21 档栅格眨眼纹理：`web/assets/face-rig/blink-v19/blink-atlas.webp`。
- 单文件三态审核：`柚希-V1.9-眼部三态审核.html`。
- 生成工具：`tools/build_eye_keyforms_v19.py` 与 `tools/build_eye_demo_v19.py`。

## 质量边界

- 完全睁眼的输出与已审核立绘逐像素一致。
- 半闭眼、闭眼为算法辅助的关键形草稿。需要美术师进一步修正眼睫毛、上眼睑弧度、眼角和被遮挡部位。
- PSD 文件不是 `.cmo3` 或 `.moc3`；尚未执行 Cubism Editor 中的绘制网格、变形器与参数关键帧。
- 此版本强调图层和三态审查，不替代网页主角陪伴版。
