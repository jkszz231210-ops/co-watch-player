# 柚希 V0.7：虹膜与眉毛的独立图层

发布日期：2026-10-09

## 已做成

- 沿用用户选定的 `assets/source/yuzuki-front-a.png`，没有改变角色外观。
- 对左右眼提取 **虹膜透明图层**；重建眼白及固定眼线底板，注视时只移动虹膜，避免整个眼睛漂移。
- 额外描摹两侧眉毛并局部修复底图，允许非常轻微的独立眉形位置变化。因原画刘海与眉毛交叠，**此版仍需要手绘精修，不是可直接用于商业 Live2D 的彻底分层图**。
- 保留 V0.6 双眼独立闭眼线、Wink、嘴型与麦克风功能。
- `assets/face-rig/yuzuki-facial-prototype-v07.ora`：10 层可编辑 OpenRaster，GIMP/Krita 可打开；网页直接使用同源独立 WebP 图层。
- `assets/face-rig/qa-eye-detail-v07.jpg` 六种状态逐帧对照；`yuzuki-iris-gaze-v07.gif` 动画预览，**均为 Python/Pillow 离线图像合成，非浏览器录屏**。

## 实施细节

- 角色画布：1024×1536。部件坐标由已定稿图人工校对后写入 `tools/build_eye_detail_v07.py`。
- 虹膜偏移水平限制约 ±2.8px、垂直约 ±1.6px；原眼线与眼白维持不动，整眼开合仍由 V0.6 动态控制。
- 眉毛位置仅微调，最大约 3.2px；`surprise` 两眉上抬、`curious` 左右不对称、`proud` 轻微挑眉。
- 自动合成会有边界细节损失。人工画师需再画眼球遮挡关系、上下眼睑、眉毛/刘海交接，并将眼睑与嘴部分成更细的关键形。

## 如何重建

```bash
python -m pip install -r tools/requirements.txt
python tools/build_face_rig.py
python tools/build_eyelid_layers.py
python tools/build_eye_detail_v07.py
python tools/qa_eye_detail_v07.py
cd web
npm test
npm run check
cd ..
python tools/validate_release.py
```

> 几何修复和 OpenRaster 图层重建用于快速迭代美术资产，并不是 PSD 商业交付级精修，更不是 Live2D Cubism `.cmo3`/`.moc3`。当前尚无可用的 Cubism 正式模型。

## 验收及现有限制

- 代码与资源静态检查：35 项 JavaScript 单元测试及 DOM/图片/ORA 源文件检查通过。
- 自动图像合成：定稿源图 vs 默认面部裁图的平均 RGB 绝对差约 1.87/255，属于图像差异指标，不等于艺术评审分数。
- 浏览器 Chromium 自动验收：本地地址被环境拦截（`ERR_BLOCKED_BY_ADMINISTRATOR`），因此**没有把它声明为已通过浏览器可视化测试**。
- 下阶段：真正的眼睑关键形、遮挡补画、独立睫毛、头部 XY 变形与 Cubism 导入。
