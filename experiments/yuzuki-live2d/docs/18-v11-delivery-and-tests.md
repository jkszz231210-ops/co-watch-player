# V1.1 交付与验证

## 已确认事实

- V1.0 单文件旧版在 Chromium 中执行报错 `Unexpected token export`，主要原因是 `tools/build_onefile.py` 的 ESM import 替换表达式错误地消耗了换行，导致后面的 `export` 没有被正则清除。
- V1.1 已修复打包器，**新增 `tools/validate_v11.py` 对真实生成的内联 JavaScript 再次执行 `node --check`**。浏览器中已验证 14 张分层贴图的 Canvas 完整显示、聊天回复、情绪切换、保存 PNG。
- V1.1 的表情演出通过 `web/js/interaction-director.js` 的确定性短动作编排，避免让 AI 直接驱动数十个不稳定参数。
- 本地历史储存通过 `web/js/session-store.js` 实现，**默认关闭**，手动开启后仅保存最多 30 条，支持彻底清空；不同浏览器的隐私/文件权限可能导致无法保存，会反馈而不影响聊天。

## 从零测试

1. 普通用户：下载 `柚希-双击直接体验.html`，用 Edge/Chrome 打开，试用表情按钮、聊天、保存画像。此版本不需要 Python、Node 或密钥。
2. 开发者：项目根目录执行 `python run_yuzuki.py`。需要真实 AI 时，配置 `YUZUKI_API_BASE`（例如 `https://.../v1`）、`YUZUKI_API_KEY`、`YUZUKI_MODEL` 环境变量。密钥始终存放在本机 Python 服务端而不是网页中。
3. 执行 `cd web && npm test && npm run check`。
4. 根目录运行 `python -m unittest discover -s tests -v`、`python tools/build_onefile.py`、`python tools/validate_v11.py`。
5. 有 Chromium 和 Playwright 的环境下运行 `python tools/test_browser_standalone_v11.py`。

## 验收边界

- 实际浏览器已验证：1440×900、1366×768、390×844。UI 启动、脚本无异常、角色 Canvas 已显示，选择害羞情绪后变化、输入“你真可爱”后出现回复；弹窗开关和图片下载通过。
- **尚未验证**：真实客户机双击文件的环境限制、具体显卡的帧率、第三方模型 API 的返回质量、手机语音输入、Cubism 导出模型。
- **不是**专业 Cubism 源模型/可变形网格；当前的五官图层为自动提取和局部重绘的试验资源，仍需画师级分层与绑定。
