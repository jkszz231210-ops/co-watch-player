# 柚希 · Yuzuki — 角色美术审核与 Live2D 网页交互实验室

> 目标：创造一位**可爱、温柔陪伴、清冷知性、灵动、略带梦幻感**的日系精致动画风虚拟角色，让美术、表情、声音与对话成为一体，并可复用于网页、桌面与其他应用。

![柚希概念主视觉](web/assets/yuzuki-portrait.webp)

## V0.2：先看角色，请你审核

**直接打开 `web/review.html`**，可以比较三套美术方案，给「脸、眼、角色辨识度、发型、服装、绑定友好度」六项打分，点击「认可这个方向 / 需要修改」，最后导出 JSON 发回给我，后续我按你的审核意见迭代。整个过程无需你写代码。

另有 `web/index.html` 用于网页交互实验，加入三段情绪试镜（被夸、安慰、分享喜悦）。

**已知限制**：自动浏览器 GUI 截图/点击在当前执行环境被限制，静态检查和单元测试已通过；请在你的浏览器里最终体验。此版本的动作参数不等于真正 Live2D 的脸部变形。

## 当前真正完成了什么

| 交付 | 状态 | 说明 |
|---|---|---|
| 三张角色候选稿 | ✅ 概念稿 | 一张初版主视觉 + 两张近正面美术候选，供审核定稿 |
| 角色设定板 | ✅ 概念稿 | 表情、三视图、服装、分层意向图。**其中 PSD 和目录截图只是绘制示意** |
| 16 种表情参考 | ✅ 静态素材 | 从概念板裁切，仅作为美术与情绪参考，不是独立可变形图层 |
| 网页交互实验室 | ✅ 代码完成 | 表情状态选择、三组情绪演出、静态立绘轻微漂浮、16 态预览、模拟聊天与浏览器语音（浏览器图形验收待用户复核） |
| **美术审核台** | ✅ 代码完成 | 三套候选、并排对比、6 项打分、浏览器本地保存、导出 JSON |
| 行为引擎 | ✅ 原型 | 与渲染器分离的情绪→参数映射，包含单元测试 |
| 分层 PSD | ⏳ 待制作 | 需要重新绘制被遮挡区域与独立画出眉眼口发等部件 |
| Cubism 源模型 `.cmo3` | ⏳ 待绑定 | 无法用一张图片自动替代建模工作 |
| 可运行 Live2D `.moc3` / `.model3.json` | ⏳ 待导出 | 需要 Cubism Editor 导出并检查物理、表情、动作 |
| 真正的 AI 对话 / 实时语音 | ⏳ 待接入 | 当前是本地关键词应答，浏览器 TTS 与有条件语音输入 |

**不要将本项目当前的网页演示称作“已完成的 Live2D 模型”。** 这是一套有明确升级路径的视觉与交互原型。

## 立即测试（零 npm 依赖）

1. 下载项目，进入 `web` 文件夹。
2. 推荐在这个目录启动静态服务器：

   ```bash
   # Windows（已安装 Python）
   py -m http.server 5173
   # macOS / Linux
   python3 -m http.server 5173
   ```

3. 在浏览器打开 `http://localhost:5173/review.html` 先审美术；然后在 `http://localhost:5173/index.html` 看情绪演出、模拟聊天和语音朗读。
4. 不需要任何 API Key，也不需要上传个人数据。演示没有自建后端。

或者试着双击 `web/index.html`，但建议使用本地服务器以避免部分浏览器的 ES Modules `file://` 限制。

**检查代码与测试：**

```bash
cd web
node --check js/app.js
node --check js/character-engine.js
node --test js/character-engine.test.mjs
```

建议 Node 20+。正式部署可以把 `web/` 原样发布到静态站点。

## 目录

```text
yuzuki-live2d/
├── README.md
├── LICENSE-CODE.md
├── assets/
│   ├── source/                  # 生成的高清原始概念图（不可视为 PSD）
│   └── psd-workspace/           # 图层交付结构说明与验收表
├── docs/
│   ├── 01-character-bible.md    # 人设、五官、发型、服装、配色
│   ├── 02-art-production.md     # 美术绘制与 PSD 图层规范
│   ├── 03-expression-rig.md     # 表情、Cubism 参数、动作设计
│   ├── 04-architecture.md      # 网页/桌面/AI/语音集成
│   ├── 05-quality-gates.md     # 审美与绑定验收标准
│   ├── 06-roadmap.md           # 实施路线、风险与手工环节
│   ├── 07-art-review-v02.md    # 三套立绘、审核与冻结规则
│   └── 08-rig-production-handoff.md # PSD 与 Cubism 交接标准
└── web/
    ├── review.html              # 美术审核台（本次优先使用）
    ├── review.css
    ├── index.html
    ├── style.css
    ├── js/
    │   ├── review.js / review-data.js    # 审核表单与 JSON 导出
    │   ├── story-director.js   # 三组连续情绪演出
    │   ├── character-engine.js # 纯粹的行为参数模型
    │   ├── app.js              # UI/语音/模拟对话
    │   └── character-engine.test.mjs
    └── assets/                 # 压缩后的主视觉/设定板/表情参考
```

## 完整 Live2D 落地方式

1. 依据 `docs/01-character-bible.md`，最终确认人物外形：脸部优先，避免为了复杂装饰牺牲表情。
2. 将概念绘画**重新整理成真正多图层文件**，按 `docs/02-art-production.md` 重绘并补全脸、眼、口、发等各层隐藏区域。
3. 在 Live2D Cubism Editor 中导入规范 PSD，制作 ArtMesh / Warp Deformer，先完成头部 XY、嘴型、左右眨眼、眉毛，再加物理与表情。
4. 导出可运行 `.model3.json`、`.moc3`、纹理、动作与表情；用官方 Cubism SDK for Web 构建渲染器适配模块，把 `CharacterEngine` 的参数翻译为 Cubism 参数 ID。
5. 完成美术、运动与聊天联动验收，之后才进行桌面端封装。

请从 [Cubism 官方 Web SDK](https://docs.live2d.com/en/cubism-sdk-manual/cubism-sdk-for-web/) 获取授权软件包。**本仓库不包含 Live2D Cubism Core，也不会自行上传官方受限二进制。**

## 核心设计原则

- **美术优先**：好看的静态角色是底线；静态不足，动起来无法补救。
- **可爱是底色**：温柔与知性决定常驻神态，灵动由行为呈现，梦幻感点到为止。
- **表情是参数，不是贴纸**：眼、眉、嘴、视线、腮红、头部运动可组合，并有时间演出。
- **行为与渲染分离**：让同一套情绪行为被网页、桌面或游戏中的不同角色渲染器复用。
- **不伪装**：概念稿不是分层 PSD；模拟聊天不是大模型；动画占位不是 Live2D 绑定。

## 权利与使用说明

代码以 `LICENSE-CODE.md` 为准。角色图像为本项目生成的原创方向概念稿，后续对外公开、商用、二次创作或委托画师重画前，请审查所用生成服务条款、人物相似性风险及委托合同的权利归属。`Live2D`、`Cubism` 为各自权利人商标，不属于本项目，使用官方 SDK 与样例模型须遵守其各自许可条款。
