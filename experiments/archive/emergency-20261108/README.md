# 紧急集成的隔离历史源码

这些完整binary patch保留原分支相对于固定共同祖先的全部改动。它们不是已启用的生产模块、当前构建输入或验收通过的候选，不被2D默认入口引用。来源、base、HEAD、逐文件Git blob、当前develop是否同blob及patch SHA256见sources.json。

恢复：先从固定base SHA建立独立实验工作树，再 git apply --binary <对应patch>；核对所有sourceBlob及完整源码身份。不得把patch直接应用到最新develop，不以保全动作表示批准重新开发。原始完整Git历史另保留本地经过验证的integration-result.bundle。

traveler-idle-lab是公开授权的独立样品；native-3d两个分支保留全部3D源码/研究/授权/失败与恢复资料。snapshot-flat和sapphire-budget保存未正式接入或被后续组合替代的完整实验切片。恢复脚本及相对路径依赖以其原base为准。

UI私源不包含在公开patch中：3073e556完整源码只保存在本地bundle及原工作树；local-approved-card-skins/NOTICE.md明确禁止公开分发。公开的批准稿/原型已在develop，不能把私人原型或旧n14源码标为正式客户端验收。

所有实验均保持原项目LICENSE与各自第三方许可。目录存在不代表恢复3D路线、正式发布、手机验收或完整Full通过。

`card-upgrade-recovery/` 保全最后的 #554 delivery/runtime 原始源码及已验证的最小 raw API 修复实验。现行 develop 已保留兼容原 API；此项只是职责/复杂度实验，不再强塞默认生产路径。完整恢复、修复前负对照和验证边界见该目录 README 与 PROVENANCE；本轮明确归档关闭，不继续占用开放 PR 或远程分支。

本轮追加恢复验证：五patch均在独立scratch从各固定base原字节解出、git apply --check及实际apply通过，合计222个变更路径的恢复Git blob与原HEAD逐一相同（9+51+73+72+17）。Windows恢复验证固定core.autocrlf=false；archive目录.gitattributes固定patch -text -whitespace，避免证据摘要随checkout漂移。这是字节保全验证，不是新运行时/设备验收。
