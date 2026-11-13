# 提交 PR 的视觉证据白名单

本轮未执行stage／commit／push。以下仅界定本视觉取证切片；主agent负责生产代码、tests及独立复审报告的提交决策。

## 可以选择的本轮公开路径

目录前缀为 `docs/evidence/shop-deck-parity-20261112/`。

- `README.md`
- `visual-review.md`
- `source-manifest.json`（652份输入的路径／摘要，不包含源码正文）
- `verification.json`
- `publication-audit.json`（包含逐文件 `publicFiles` 精确白名单，共33个路径）
- `PUBLICATION.md`
- `prepare-visual.mjs`
- `capture-visual.mjs`
- `verify-evidence.mjs`
- `unpack-pipeline.mjs`
- `shop-fixture.lua`
- `audit-publication.mjs`
- **`visual-current/` 全部21个文件**：10张PNG、10份同名`.state.json.gz`、`render-receipt.json`。

用明确文件或收据中的 `publicFiles` 选择，避免把整个证据目录无差别加入。`independent-review.md`是其他owner的报告，本轮没有修改或为其重新授予staging许可；由主agent核对其R2结论和历史路径说明后单独决定。

## 只在本机保留，不加入 PR

- `.artifacts/shop-deck-parity-20261112/` 全部内容，包括旧轮、失败轮、`current-final/`生成布局和原始／压缩save、closure、临时浏览器目录及内部完整审查明细。
- 原始 `source-closure.json.gz`、`fixture-save.json.gz`、`generated-layout-adapter.mjs` 已从docs移入本机归档；新版本也只写`.artifacts/current-final`。公开清单仅保留其路径和SHA256。
- `archive-previous.mjs`、`inspect-state.mjs`、`probe-input.mjs`是这次保留的本机维护／诊断脚本，不在33路径白名单中。
- SDK、私有renderer、图库、旧V25参考图与任何安装目录都不在交付包内。

## 已实际检查的内容与结果

`audit-publication.mjs`解压检查652份source closure和365个save内Lua模块，所有save脚本名均为本项目`abyss_*.lua`。对三个既有SDK／worker文件分别抽取三段320字符指纹检查，匹配数0；未检测到base64 PNG/JPEG/WebP等图片payload、凭据字面量或账号字段。closure有3处参考路径文字，未包含对应图片字节；它们随原始closure留在本机。

十份公开runtime状态已逐份结构检查：包含场景树、文本、数字资源ID、SDK日志及合成“玩家1”标签，没有嵌入Lua源码或SDK源码。十张PNG已逐张看图，均为本轮游戏画布，没有桌面、账号界面、官方UID覆盖或私有参考图。PNG仍包含原有游戏／官方素材的实际渲染结果，不附图库或原稿。

这些是明确范围内的源码指纹、格式扫描和看图检查，不是对任意混淆secret的完备证明；因此原始closure/save不作为公开附件。原项目`LICENSE`、商业权利边界与`THIRD_PARTY_NOTICES.md`均保持不变，SDK及其他第三方的原许可留在已有安装中，没有用项目许可替换第三方许可。
