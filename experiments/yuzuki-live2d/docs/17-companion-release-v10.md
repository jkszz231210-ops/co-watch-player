# 柚希 V1.0 可体验版：交付与边界

## 已交付

- `web/companion.html`：默认沉浸式陪伴页。角色使用已审核的 `front-a` 画稿。
- 默认采用 V0.9 栅格眉眼嘴动画，缺失图层时回退至已审核静态立绘。
- 情绪按钮、四幕互动演出、可继续聊天的本地演示回复、可选语音朗读与浏览器支持时的语音输入。
- `run_yuzuki.py`：本地一键启动；默认打开陪伴页，不再将技术调试页作为入口。
- `companion_api.py`：可选 OpenAI 兼容模型接口适配器，API Key 仅在本地 Python 服务端读取；接口不暴露 API Key。
- 保留 `web/index.html` 中原有参数调试功能。

## 小白如何体验

Windows 双击根目录 `一键体验柚希.cmd`（需要安装 Python 3），浏览器会自动打开。不开通任何 AI 服务也能体验表情与演出。

## 接入真实 AI 对话（可选）

在 **自己的电脑** 的 PowerShell 设置环境变量，再启动，不要把密钥放到 GitHub：

```powershell
$env:YUZUKI_API_BASE="https://api.example.com/v1"
$env:YUZUKI_MODEL="你的模型ID"
$env:YUZUKI_API_KEY="你的私有密钥"
py -3 .\run_yuzuki.py
```

替换为服务提供方支持的 OpenAI 兼容接口地址及模型标识。也可将 `YUZUKI_API_BASE` 设置为 `http://127.0.0.1:8000/v1` 使用本机兼容 API 服务。

本地服务只绑定 `127.0.0.1`，不适合直接暴露公网。若向其他人公开网页，需要单独开发生产环境身份验证、请求限流与密钥管理。

## 质量验收标准

- `python run_yuzuki.py --check`：检查文件与角色锁定配置。
- `node --test web/js/*.test.mjs`：已有动画行为单测。
- `python -m unittest discover -s tests -v`：代理功能与历史净化测试。
- 自动图形浏览器受当前环境访问限制；需在真实 Windows Edge/Chrome 中抽查画面、语音及移动端布局。

## 特别说明

**这仍非 Live2D Cubism .moc3 模型。** 眼嘴通过绘制图层、遮罩、控制参数实现。正式 Live2D 需要源图补画、分层 PSD、网格变形器、头部 XY 关键形、物理及动作导出，不能靠网页动画替代。
