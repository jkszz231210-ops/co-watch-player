# V0.8：曲线眼睑遮挡、睫毛前景与轻微倾身

日期：2026-10-09

## 为什么这次值得做

V0.7 关闭眼睛时，绘制的整块眼睛（包含虹膜）在 Y 方向缩短，视觉上虹膜会被压扁。这种效果的技术实现简单，但影响美术观感。

V0.8 改为 **眼球保持原绘制比例**，眼睑以贝塞尔曲线从上、下方合拢，并将眼线/睫毛的一部分额外提取成透明前景层，保护睫毛压在虹膜上的关系。

## 做成的东西

- `web/js/eye-aperture.js`：各眼独立的曲线遮挡几何（纯 JS，可单测），浏览器使用 Canvas `clip()` 实现动态遮挡。
- `web/assets/face-rig/eye_{left,right}_lashes.webp`：新提取的睫毛透明前景图层，保留原画局部像素，不替换用户确认的角色主视觉。
- `web/` 的「动作参数」增加 0–100% 眼睑试镜滑条，用于发现闭合过程中的缺陷。
- 角色在不同情绪下只有 **±1.2° 左右的整体二维倾身**，这是轻微姿态，不是头部 X/Y 三维模拟。
- `assets/face-rig/yuzuki-facial-prototype-v08.ora`：12 层 OpenRaster 编辑素材，包含独立睫毛；可在 Krita/GIMP 中打开。
- `assets/face-rig/qa-aperture-v08.jpg`：8 状态逐帧画面对照；`yuzuki-lid-v08.gif`：短动态示意。均为 Python/Pillow 离线合成，并非浏览器截图。

## 技术与美术边界

1. 睫毛来自原图遮罩提取，尚无画师重新绘制的真实上眼睑与下眼睑结构，极端闭合仍存在边缘锯齿和笔触差异。
2. 当前仍采用基础线条作为闭眼形态，并没有 Cubism 的脸部变形器或 X/Y 转向关键形。
3. 半闭眼仍可能看到裁切边缘及线条叠加；正式生产需要为上/下眼睑分别精修连续关键形并补画被遮挡的皮肤。
4. 程序一律不能把 `.ora`、Canvas 遮罩或 CSS 倾身称作已完成的 Live2D `.moc3` 绑定模型。

## 重建及测试

```bash
python -m pip install -r tools/requirements.txt
python tools/build_face_rig.py
python tools/build_eyelid_layers.py
python tools/build_eye_detail_v07.py
python tools/build_eye_lashes_v08.py
python tools/qa_eyelid_v08.py
cd web
npm test
npm run check
cd ..
python tools/validate_release.py
```

## 后续高价值工作

需要画师级手绘修正：上下眼睑完整运动、眼白遮挡皮肤、高光独立层、眉毛被刘海遮挡的补画；之后在 Cubism 中先完成脸部 XY 转向关键形，再做发束物理。现阶段不应靠夸大眨眼角度替代美术制作。
