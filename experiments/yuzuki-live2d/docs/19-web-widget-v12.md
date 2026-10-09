# 柚希 V1.2 · 独立网页挂件交付说明

## 可以立即体验的成果

- `柚希-网页嵌入演示.html`：单文件演示（约 1 MB），双击即可在普通网页右下角看到柚希，并通过页面按钮切换情绪、显示文字；可收起并再次打开。
- `柚希-悬浮挂件.html`：独立单文件角色小窗，双击可直接打开，包含眨眼、跟随视线、问候和 16 种内部情绪参数。
- `web/widget.html` + `web/widget.css` + `web/js/widget.js`：可以托管到网页的独立 iframe 挂件。
- `web/js/embed-loader.js`：将挂件放入任意页面的零依赖宿主工具。
- `web/demo-embed.html`：可托管、可拆分的网页集成范例。

**当前仍是独立眉眼嘴的栅格二维角色，而非 Cubism `.moc3`；没有真正头部 3D 转动。**

## 直接添加到自己的网页

将 `web/` 文件夹放在自己的网站内，通过下列代码加载悬浮柚希：

```html
<script src="/web/js/embed-loader.js"></script>
<script>
  const yuzuki = YuzukiEmbed.mount({
    widgetUrl: '/web/widget.html',
    onEvent: event => console.log('柚希事件：', event)
  });

  yuzuki.mood('shy');
  yuzuki.say('欢迎回来，今天辛苦啦。♡', 'comfort');
  // yuzuki.hide(); yuzuki.show(); yuzuki.destroy();
</script>
```

同目录复制 `web/assets/face-rig/` 的素材与 `web/js/` 的 ESM 模块，确保 `widget.html` 的相对路径可用。宿主不需要 AI 密钥。

## 宿主交互协议

宿主通过 iframe 的 `postMessage` 传送严格的 `yuzuki:command` 数据包。

| command | 参数 | 说明 |
|---|---|---|
| `emotion` | `emotion` | 16 种已定义的表情名称 |
| `say` | `text`、`emotion` | 显示最长 180 字的对白，不会调用网络模型 |
| `gaze` | `x`、`y` | -1 至 1 范围，调节视线 |
| `motion` | `enabled` | 开关动态效果，尊重系统减少动态偏好 |
| `ping` | 无 | 查询组件是否就绪 |

组件会回发 `yuzuki:event`：`ready`、`emotion`、`say`、`wink`、`pong` 等事件。内容使用 `textContent` 显示，不执行外部文本。接入 AI 需由宿主自行处理认证、网络和聊天上下文，不在挂件内储存密钥。

## 自动验收

```powershell
cd web
npm test
npm run check
cd ..
python tools/build_onefile.py
python tools/test_browser_widget_v12.py
```

浏览器自动化通过 `set_content` 注入完整的单文件页面，以绕开测试容器内禁止导航本地和外部 URL 的策略；这是一轮真实 Chromium 渲染与交互测试，已覆盖离线 iframe，但**模块化部署版需在实际网站上进一步验证**，不等同于目标设备的安装验收。

待突破的下一大瓶颈仍是专业 Live2D 美术绑定，而非网页嵌入能力。
