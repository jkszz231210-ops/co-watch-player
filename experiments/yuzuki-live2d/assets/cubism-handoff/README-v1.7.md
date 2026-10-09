# 柚希 V1.7：眼部分层 PSD（供 Cubism 建模准备）

优先打开 `yuzuki-eye-separated-v1.7.psd`，然后按图层面板依次关闭 EYE_L 01 / EYE_R 01，即可看到真正与面部底图分离的双眼。另有两幅默认关闭的 `EYE_? 02` 闭眼草稿，请勿误当最终画师成品。

默认 **开眼状态与审核通过的原图完全一致**。这保证了日常状态仍然保留原画的美感。关闭眼睛后的底图是自动补画工作稿，不是最终闭眼表现；`yuzuki-eye-separation-qa-v1.7.jpg` 中右侧为便于评估的闭眼实验组合效果。

文件由 `tools/build_cubism_eye_psd.py` 生成。更多见 `docs/22-actual-eyes-psd-v17.md`。

暂不包含 `.cmo3` / `.moc3`、正式网格、头发拆层或身体绑定。PSD 能打开不等于 Cubism Editor 导入已通过，具体导入还要用实际编辑器复核。
