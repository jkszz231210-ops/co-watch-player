# 柚希 V0.4 五官分层源稿

此目录包含**实验性的**可编辑 `yuzuki-facial-prototype.ora`（四图层）及 GIF/JPG 视觉 QA。原图已按用户审核锁定；自动图层拆分不是最终商业质量的 Cubism 模型。

- 本地完整 ZIP 附带现成的 ORA、GIF、QA 图，可直接看与导入 Krita/GIMP。
- GitHub 轻量代码分支只跟踪可复现的脚本与压缩后的浏览器资源；如需生成高分辨率 ORA：在工程根目录执行 `pip install -r tools/requirements.txt`、`python tools/build_face_rig.py`、`python tools/render_qa_previews.py`。
- 运行当前网页只需 Python 3 启动本地静态服务器；不需要安装上述图像开发库。
- 原画必须保持 `assets/source/yuzuki-front-a.png`，且 SHA-256 与 `art-direction.lock.json` 完全一致。
- 如要真正专业 Live2D：需要在软件中手工精修并继续拆分上下眼睑、眉、眼白、虹膜、睫毛、嘴内结构，补画转头隐藏部分，并做 Cubism 网格变形。
