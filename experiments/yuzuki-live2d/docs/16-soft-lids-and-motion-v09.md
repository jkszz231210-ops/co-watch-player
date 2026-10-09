# 柚希 V0.9 · 软眼睑绘制与自然动作曲线

## 本轮实际修改

1. **闭眼形态重新绘制**：`tools/build_soft_lids_v09.py` 生成左右眼两套独立透明闭眼线稿、独立上眼睑褶皱图层。相比 V0.8，闭眼线位置更低，避免眼线与刘海形成显眼的弯钩；保留批准的面部原画。
2. **分层源稿升级**：`tools/build_v09_ora.py` 输出 14 层 `assets/face-rig/yuzuki-facial-prototype-v09.ora`。OpenRaster 文件可在 Krita/GIMP 中打开；注意这是实验分层，隐藏区域的全面手绘补全仍未完成。
3. **表情平滑**：`web/js/performance-timeline.js` 对眼睛、嘴角、眉毛、腮红设置不同反应时间常数。帧率改变时整体过渡速度仍保持一致；负向笑意（委屈/无奈）不会被裁切。
4. **有停顿的眼神漂移**：用固定时间表替代连续随机跳动，保持眼白/眼线静止、只移动虹膜，每次不到 1px 的幅度；用户移动鼠标时切到视线追随，离开后恢复待机。
5. **极轻微的二维姿态**：情绪姿态插值与呼吸变化影响角色容器旋转，幅度控制在 ±1.35 度；这不是 Cubism XY 头转。
6. **展示和校验**：八种眼睑状态、V0.8 与 V0.9 闭眼对比，以及离线 GIF。浏览器自动验证被当前环境拒绝访问，保留手工网页验收项目。

## 重建

```bash
python -m pip install -r tools/requirements.txt
python tools/build_soft_lids_v09.py
python tools/build_v09_ora.py
python tools/qa_eyelid_v09.py
cd web && npm test && npm run check
cd .. && python tools/validate_release.py
```

## 美术未决问题（下一阶段）

- 眉毛和刘海交叠区域仍来自自动提取，局部有接缝风险。
- 半睁眼形态是贝塞尔遮罩，尚未逐帧手绘上下眼皮和眼球的真实结构。
- 嘴部尚未拆成五种由画师分别精修的嘴形。
- 没有完成适用于 Cubism 的高质量 PSD、网格、XY 转头、物理演算，也没有 .cmo3 / .moc3。

**发布结论**：V0.9 是可独立运行并继续编辑的栅格表情动画模型，不得宣传为正式 Live2D 完成品。
