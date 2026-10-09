# V1.7 可编辑眼部分层 PSD，距离 Cubism 成品还有什么

## 本轮真实产物

`assets/cubism-handoff/yuzuki-eye-separated-v1.7.psd` 是真实 PSD，画布 1024×1536、RGB 8-bit、sRGB ICC。共 6 层：

| 图层（上 → 下） | 默认可见 | 用途 |
|---|---|---|
| EYE_R 02 closed draft | 否 | 右眼完全闭合的**实验性草稿**，后续精修 |
| EYE_R 01 open + lash | 是 | 已批准原画中分离出的右眼及相邻睫毛/皮肤 |
| EYE_L 02 closed draft | 否 | 左眼完全闭合的**实验性草稿**，后续精修 |
| EYE_L 01 open + lash | 是 | 已批准原画中分离出的左眼及相邻睫毛/皮肤 |
| FACE 00 repaired skin | 是 | 眼睛下方经过自动修复的面部底图 |
| REFERENCE approved original | 否 | 原始主视觉参考，不随动 |

旧版 V1.6 只有整张立绘可见，分离素材全隐藏；现在 **左右眼能在 PSD 里直接分别隐藏/移动/编辑**。睁眼合成后与原始立绘在 1024×1536 RGBA 逐像素一致。见 `yuzuki-eye-separation-qa-v1.7.jpg`。

## 如何检验

1. 用 Photoshop 或 Krita 打开 `yuzuki-eye-separated-v1.7.psd`。先不要改任何色彩设置。
2. 关闭 `EYE_L 01` / `EYE_R 01`，就会看到底下的补画皮肤。此时**会看到平滑的填充痕迹**，它是供建模过程中遮挡的底色，不是可直接展示的闭眼神态。
3. 分别开启 `EYE_L 02` / `EYE_R 02` 并保持同侧开眼层关闭，观察闭眼草稿。其线条参考 V1.5，不能代替专业眼睑手绘关键形。
4. 保留开眼层各自独立，检查左右眼是否能选择并在 Cubism 中作为 ArtMesh 草稿对象。**这只验证 PSD 结构，没有生成 Cubism 的模型/网格。**
5. 优先美术重绘眼白/虹膜/上下眼睑/上下睫毛，让动态变形不依赖整块贴图；再分离额发与面部，并补足遮挡区域。

## 一键重建与回归

```
python tools/build_cubism_eye_psd.py
python -m unittest discover -s tests -p 'test_cubism_eye_separation.py' -v
```

## 已知限制

- 眼睛**各自独立**，但每只眼内部虹膜、眼睑和上下睫毛仍在一张源贴图里，**不能据此声明已经完成眼睛 Cubism 绑定**。
- 眼睛底下采用原图区域修复/插值，局部放大和大角度变形仍然需要真正画师进行补绘；闭眼草稿同样需要再画。
- 还没有 `.cmo3`、`.moc3`，也没有在 Cubism Editor 中导入和实际操作的证据。后续需要 Cubism Editor 环境才能创建/导出对应的正式模型。
- 不允许将上面某一项标注为“已完成 Cubism 成品”；实际工作阶段仍是**艺术拆层和交接**。
