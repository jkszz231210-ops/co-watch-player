# 02 · 正式制作 PSD 的分层与补画说明 V1

## 先看关键事实

**一张高分辨率 PNG 不能无损自动转为符合 Live2D 生产要求的 PSD。** 自动分割能够提供初始蒙版，但眼睛、嘴部、侧脸、刘海底下的遮挡区域必须重新补画并检查；每个变形网格能否正确工作由实际绑定验证。不要把拼合式概念板输出为“已分层 PSD”。

## 绘制基准

- 正面、表情平静、头部中立位的半身角色；标定中心线和眼睛高度；不要使用透视过强的 3/4 主视觉作为唯一建模底稿。
- 原稿建议 3000–5000px 高，透明背景、sRGB、包含足够的头顶与肩外安全区域。具体纹理图集由目标机型性能与 SDK 限制裁切。
- 统一同一角色的线粗、五官结构、眼睛位置、明暗方向；所有 Live2D 部件分层单独命名。
- 交付编辑用 `.psd` 和无背景拼合预览 `.png`。PSD 中每一层独立可见，透明区域干净，不依赖组外剪贴混合才可显示。

## 推荐 PSD 图层组（从前到后绘制顺序不等于真实 Z 顺序）

```text
00_guides_not_exported /
01_front_hair /
   bang_center, bang_left, bang_right, flyaway_01, side_lock_front_L, side_lock_front_R, hair_ornament_flower, ribbon
02_face_front /
   eyebrow_L, eyebrow_R
   eye_L / lash_top, lash_bottom, upper_lid, lower_lid, sclera, iris, pupil, highlights, crease
   eye_R / lash_top, lash_bottom, upper_lid, lower_lid, sclera, iris, pupil, highlights, crease
   nose, nose_shadow, cheek_blush_L, cheek_blush_R, tear_L, tear_R
   mouth / upper_line, lower_line, inner_mouth, tongue, teeth, lip_shadow
03_face_base /
   face_outline, skin_base, cheek_shading, forehead_hidden, ear_L, ear_R
04_back_hair /
   back_hair_center, back_hair_L, back_hair_R, long_tip_L01, long_tip_L02, long_tip_R01, long_tip_R02
05_neck_body /
   neck, neck_shade, torso, shoulder_L, shoulder_R, arm_L, arm_R
06_costume /
   collar_left, collar_right, bow_center, bow_left, bow_right, inner_shirt, outer_shirt, sleeve_L, sleeve_R, body_decoration
07_background_not_exported /
```

L/R 命名指角色自身左右，画师与绑定师需要在交接时统一坐标方向，避免镜像事故。

## 强制补画清单

- `forehead_hidden`: 完整额头与前刘海遮盖的发际线区域。
- `face_outline` / `cheek_shading`: 两侧鬓发移走时可能露出的完整皮肤与阴影。
- `sclera` / `iris`: 眼睛上下左右移动时隐藏的眼白和虹膜轮廓；眼睛闭合对应上/下睑形态可由变形完成，必要时专门补形状。
- `inner_mouth`: 嘴巴张开、笑、O 口型时可见的口腔、舌头、牙齿。
- `ear_L/R`: 侧发移动时可以露出的耳朵。
- `neck`, `shoulder_L/R`: 头部倾斜与身体左右偏转时的遮挡。
- 头发各层根部：相邻发束摆动时不存在突然的透明空洞。

## 材质与美术验收

1. 关闭所有前发组，脸部仍是完整、连贯的人脸，无透明破洞。
2. 关闭眼睑组并移动虹膜，眼白仍覆盖完整眼区；确认左右虹膜无错误镜像。
3. 打开口腔内部，上下嘴型在极值时无空洞、重叠线稿和牙齿穿帮。
4. 分别挪动左右侧发与后发，能看到完整耳朵、颈、肩、头皮。
5. 透明背景下检查所有边缘，必须无白边、锯齿、色块断裂。
6. 每一层命名唯一、源文件可编辑、未把关键部件合并死。
7. 让画师输出“正常脸 + 闭眼 + 微笑 + O 嘴 + 头转动极值”验收拼图。

## AI 辅助流程的正确边界

AI 可以辅助风格探索、草图、区域分割建议、修复草案、局部配色；完整补画与遮挡一致性需画师或熟练美术人员确认。**宁可先完成高质量半身，也不要一口气自动拆出几十张看似完整、实际上不耐变形的层。**
