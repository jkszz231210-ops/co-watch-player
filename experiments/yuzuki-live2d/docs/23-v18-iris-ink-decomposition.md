# 柚希 V1.8：虹膜与上眼线拆层，Cubism 美术准备实验

## 交付结果

- 以你选定的 `yuzuki-front-a.png` 为唯一视觉基准，没有改换人物。
- 1024×1536、10 个**真正可编辑**的 PSD 图层，包括每只眼的**虹膜/高光**、**上眼线**、**眼部底层**、隐藏的闭眼参考，面部底图与隐藏原画。
- 默认睁眼重组相对原画的最大通道偏差不超过 1/255。并分别检查了左右眼的透明遮罩。
- 生成 `yuzuki-eye-components-qa-v1.8.jpg`，展示原图、重组、分层遮罩与 ±2 像素小幅视线测试。

## 目前仍不是正式 Live2D

**图层分离是机械辅助起稿，不等于完成绘画。** 虹膜周围会混入原画头发、睫毛等线条；在移动或明显闭眼时仍可能露出自动补绘痕迹。所有移动示例仅用于发现问题，**不要以此作为最终效果**。

PSD 中暂时没有真正的上/下眼皮连续形态、两只眼的独立完整白眼球、眼睑网格，也没有 Cubism 的头部 XY、物理或可运行的 `.moc3`。该素材尚未经 Cubism Editor 导入验证。

## 下一步必须实施的美术制作

1. 在 Krita/Photoshop 中打开 PSD，固定原图图层作为校对线，给左右虹膜补足被眼皮、刘海遮挡的圆形区域。
2. 用画笔重新绘制白眼球、上下眼睑、闭眼形态与睫毛。特别注意左眼、右眼的本来非镜像结构，不允许简单水平镜像。
3. 单独绘制头发/刘海前景遮挡层，保证虹膜运动时不会把头发带走。
4. 在 Cubism Editor 中导入精修 PSD，建立 `ParamEyeLOpen`、`ParamEyeROpen`，至少校对 0.0/0.5/1.0 三段关键形。重点查看 0.2–0.8 的过渡是否有残影。
5. 通过视觉验收后再导出 `.moc3/.model3.json` 并替换网页栅格模拟器。

官方可参考 [Live2D 十分钟眨眼教程](https://docs.live2d.com/en/cubism-editor-tutorials/eye-blink/) 和 [眼部参数乘算说明](https://docs.live2d.com/en/cubism-editor-manual/setting-and-exporting-facial-expressions/)。本工程未复制其任何受限示例素材。

## 运行命令

在完整工程根目录：

```bash
python tools/build_cubism_eye_parts_v18.py
python -m unittest discover -s tests -p 'test_cubism_eye_components_v18.py'
```

全部素材与图层命名由 `assets/cubism-handoff/eye-components-v1.8.json` 描述，内含限制说明与原始图片 SHA-256。不要为了效果把这些试验图层偷偷替代为“已经完成的 Live2D”。
