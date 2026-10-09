# V0.6 左右眼运动与源稿说明
- 浏览器中两眼独立控制，随机眨眼错峰 12ms，支持左右 Wink，笑时微眯、疑惑时不对称。
- 浏览器新增 eye_left_closed.svg / eye_right_closed.svg，SVG 画线可以独立调整，均不依赖外部网络。
- 原始选定立绘保持不变，运行时仍使用自动抽取的眼部局部图片与自动补画的底图。
- 完整 ZIP 另包含两张闭眼线的 PNG/WebP、可编辑六层 OpenRaster、8 态对照图和 GIF。
- 眉毛、虹膜与头发还不是独立专业素材；不具有 Cubism 头部 XY、物理或 .moc3。
- 运行：根目录执行 python tools/build_face_rig.py，python tools/build_eyelid_layers.py 生成完整素材，再运行 python tools/validate_release.py；cd web && npm test && npm run check。
- QA 合成图是 Pillow 模拟结果，不等于 Chromium 截图。
