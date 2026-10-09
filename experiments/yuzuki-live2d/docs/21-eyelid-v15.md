# V1.5 眼部残影修复说明

## 问题
V1.4 半闭眼原睫毛与新描线偶发重叠，完全闭眼出现少量 iris 亮点；早期收眼幅度偏大，看起来不自然。

## 处理
- 从审核通过的 `web/assets/yuzuki-front-a.webp` 与眼部补画底图 `base_v07.png` 计算遮挡区域，仅在原有眼部足迹绘制皮肤，不动原始刘海和其他五官。
- 利用外部轮廓填洞补齐眼部遮挡，避免瞳孔亮区在闭眼时漏出。
- 首段眨眼仍保留原始眼缘细节，之后才显示经过超采样渲染的新睫毛线；相比上版推迟擦除上眼线。
- 21 档眼睑图集，前端只绘一帧，不混合两张不透明的闭眼覆盖贴图造成重影。
- 局部截图与 HTML 页面使用相同图集，避免演示和浏览器素材不一致。

## 可复现
`python tools/build_blink_v15.py` 重绘图集与 GIF；`python tools/build_onefile.py` 更新离线 HTML；`cd web && npm test && npm run check`；`python tools/test_browser_eye_v15.py` 执行桌面和移动端浏览器检查。

## 验收边界
- 当前仍是基于原画的栅格二维原型，未交付 Live2D Cubism `.moc3`。
- 对齐是由源图标注与计算生成，算法测试不能替代人的美术评审。
- OpenRaster 旧源稿仍可留存作为阶段性实验，不应该描述为 Cubism 正式模型。
