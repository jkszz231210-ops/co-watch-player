# 柚希 Cubism 正式生产交接 V1.6

本轮产物：多图层 PSD 交接稿（完整 ZIP 单独交付）、分层清单、重建脚本和模型导出校验脚本。**不是 Cubism 已绑定模型**。

- PSD：1024×1536，RGB 8 位，带 sRGB ICC，角色原画唯一可见，其他实验性眉眼口图层隐藏。**自动提取图层不具备专业绑定质量，需要手工补绘**。
- 完整包中 assets/cubism-handoff/yuzuki-cubism-art-handoff.psd 可以在兼容 PSD 的美术软件中编辑。
- Pillow 已识别出 15 个实际图层，默认画面与原画逐像素一致；**尚未在 Cubism Editor 实际导入验收**。
- 当前没有 .cmo3 工程、.moc3 真模型、头部变形网格或正式物理效果。

## 生产步骤
1. 以原画为视觉基准，完整补画额头、眼白、虹膜、上下眼睑、眼角、眉毛、刘海遮挡区域及嘴部。
2. 将补画后的美术分别存为每个可运动部件的透明独立图层；隐藏 STUDY 层仅供参考，严禁直接当最终 ArtMesh。
3. 将修好的 PSD 导入 Cubism Editor，为上下眼睑、眉、眼球和嘴分别建立变形参数，再制作头部 Angle X/Y/Z 和物理效果。
4. 从 Editor 导出 .moc3、.model3.json、纹理等，在网页里用官方 Cubism SDK for Web 运行。终端用户不需要安装 Editor。
5. 用完整包的 tools/check_cubism_export.py 检查模型资源，正式 Web 渲染还需二次验收。

官方：[PSD 导入](https://docs.live2d.com/en/cubism-editor-manual/psd-import/) · [PSD 要求](https://docs.live2d.com/en/cubism-editor-manual/precautions-for-psd-data/) · [模型导出](https://docs.live2d.com/en/cubism-editor-manual/export-moc3-motion3-files/)