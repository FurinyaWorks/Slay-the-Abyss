# 战斗阶段评审启动器

仅使用已有本机 Simulator 安装和实际 GIL 读回存档。源码/画面/性能结论见 [阶段报告](../../docs/evidence/battle-repair-20261111/stage-review/README.md)。不是部署或验收工具，不操作桌面、不打开原神。

在本工作树运行（Node22）：

```powershell
node experiments/battle-stage-review/serve.mjs --candidate build/pr588-battle-source-aim/52aee9f0-9c5e-40dd-a39e-6715383cda5f/candidate.json --port 0
```

默认使用现有 `.artifacts/battle-repair-20261111/snapshot-private-web-v2` SDK 复制件、`source-aim-candidate` 实际读回夹具和独立 `.artifacts/battle-stage-review-20261111` workspace。`--web-dir` / `--scenario-dir` / `--output` 可覆盖；拒绝漂移的工具、候选、夹具，以及已有但不同内容的 review archive。端口0由系统分配，读 `service.json` 的 url；本轮运行入口52608。需要重建候选时沿用工程现有 GIL 构建/转换/fixture 工具，不用这个启动器重造格式。

**此命令需要上述已安装 SDK 和本地大存档，不能仅克隆分支就运行。** 本仓库没有再分发整个 SDK、图片库或二十多MB转换存档。现有 SDK 为 beyond-simulator 0.5.2；SDK 本体保留原 GPL-3.0 许可，项目许可不变。`sdk-extension/` 保存本轮自写完整图适配/生命周期 hook 与原实验准备脚本，供复审；准备脚本使用原实验相对路径，仅作来源记录，并非通用安装器。

`serve.mjs` 校验 server/worker/bridge/hook/play/renderer 精确摘要，校验 GIL 和 actual save，并将每个夹具还原启动源码与展示名后同 actual save 做全对象比较。仅监听127.0.0.1，全部路由限制 Host/Origin；前后端均为本机，不允许外部 Origin，代理剥离 cookie/authorization。载入两个独立初始会话，QA 不操作它们。

`renderer-ticker-patch.mjs` 只替换精确版本的3+2处直接绘制调用，推进 Pixi 正常渲染生命周期；没有改 SDK step、时间、Lua 或候选。现有 leading16、颜色 sprite 复用、typed snapshot 是其他明确标记的私有工具修改，不能称为原版 SDK 测速。

归档中的 `browser-qa.mjs.gz` 与 `visual-capture.mjs.gz` 是本轮实际执行脚本，保留其本机依赖路径与会话隔离方式；解压后按原路径运行，需要现有 Playwright 与几何文件。性能脚本和截图脚本分开运行。第一次嵌套 render 探针、卡名错误、受限启动等失败记录也保留，不当通过。

进程保持运行供本机评审；前台启动可 Ctrl+C，SIGINT/SIGTERM 关闭两个 server。当前后台 PID及实际 URL 见本轮 `service.json`，不要按陈旧PID停止别的进程。预览仅本机访问，未建立公网隧道、发布或自动合并。
