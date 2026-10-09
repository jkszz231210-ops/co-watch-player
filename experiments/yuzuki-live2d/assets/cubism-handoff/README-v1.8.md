# 柚希 V1.8 · 眼部 Cubism 美术准备包

**请先看** `assets/cubism-handoff/yuzuki-eye-components-qa-v1.8.jpg`：左上原图、右上 10 层重组、左下拆层选区（青色虹膜、紫色上眼线）、右下仅平移 2 px 的眼球试验。

## 可用文件

- `yuzuki-eye-components-v1.8.psd`：10 图层可编辑 PSD（7 可见、3 隐藏），原画静态基本无变化。
- `eye_left-iris-v1.8.png` 和 `eye_right-iris-v1.8.png`：虹膜及部分高光的独立透明贴图；**暂未完成额外隐藏区域补绘**。
- `eye_left-upper_ink-v1.8.png` 和 `eye_right-upper_ink-v1.8.png`：上眼线附近的独立透明贴图，尚未精修。
- `eye_left-eye_scene-v1.8.png` 和 `eye_right-eye_scene-v1.8.png`：上下眼周及眼白的试验性底稿；虹膜下方有自动填充的临时眼白，需手工修改。
- `eye-components-v1.8.json`：图层坐标、像素误差、风险与源图校验信息。

## 不要将本包误用为正式 Live2D 模型

它不是 `.cmo3`/`.moc3`，也没有完成 Cubism 网格与眼部关键形。需要手绘眼白、上下眼睑、完整虹膜、遮挡发丝，至少完成 ParamEyeLOpen / ParamEyeROpen 的 0、0.5、1.0 关键形，并在 Cubism Editor 实机导入验收。

源码和使用说明见 `docs/23-v18-iris-ink-decomposition.md`。如想重建，先安装 requirements 并在包根目录执行 `python tools/build_cubism_eye_parts_v18.py`。
