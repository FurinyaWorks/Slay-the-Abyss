# PR #587：保持原始收据字节的跨平台修复

修复前远端 HEAD `f1481459c2fb177c036eda1deb11a7ad2f18bd46`，develop `1eb288472d7b33b7450eec97a624ca2ffa526f39`。只修改 `.gitattributes` 的 Golden Idol 收据精确路径及现有 CI 校准用例的有效属性断言。生产职责切片、原收据、全部旧哈希/断言、计时观测、floor 和预算均不变。

## 已确认根因与修复验证

Quality [42581856147](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42581856147) 的 Windows job129043592255 在原始收据 SHA256 断言失败。原403个 LF 转成 CRLF 后，哈希精确得到 Hosted 实际值 `eedea706bca27592b0301751f6590b12c8473652dc6447351fffb2731281acd0`，而未改原文件哈希仍为 `0c8e9d3293facae7a64943d25c021e2ff189ee95fb93116a66f6101ef984a2eb`。

- 在独立真实 Git checkout 中以 `core.autocrlf=true` 重现同一个哈希失败，随后精确 `text eol=lf` 属性恢复受认证的原始字节，原用例通过。
- 新断言要求 Git 有效属性为 `eol: lf`。移除该属性且保留 LF 字节的负控失败；保留属性但改变收据一字节的负控仍在原始哈希断言失败。未做运行时换行归一化，未替换期望哈希。
- 原两份 CI 合同文件在 POSIX checkout 58/58，在真实 autocrlf checkout 58/58，无跳过或取消。这是 Linux Node24.22.1 的 Git checkout 交叉验证，不是原生 Windows Hosted 认证。
- `receipt-green.log.gz` 保留首次仅复制属性但未刷新索引的失败；正确索引/checkout 后的成功在 `receipt-green-final.log.gz`。失败尝试未删除。
- 独立复审见 `receipt-review.json`，按两个执行文件的 SHA256 绑定，通过且无未解决项；最终提交另作精确读回。

## 尚未完成，不以本地通过代替 Hosted

同一旧 HEAD 的 job129043592001、129043592155 在静态工具下载遇 HTTP504；现有 #581 负责下载重试，不重复实现。job129043592318 原拖拽历史切片8–15在30秒上限失败；完整诊断和无效试验的撤回见 [drag/README](drag/README.md)，当前没有已证实的运行时修复。

全部四个 Hosted 失败 job 的原始日志在本目录，压缩前/后摘要见 `manifest.json`。未重复 Full、未 rerun/dispatch、未放宽任何门槛或覆盖；PR 保持 Draft，当前提交的正常 Hosted 门禁、独立超时修复和严格合并流程仍待完成。TASK-74.20 的 owner/status/AC 保持不变。Backlog验证与指引检查通过；首次指引检查因稀疏工作树缺失已跟踪的 `.cursor/rules/miliastra.mdc` 失败，恢复同一 HEAD 原文件后通过，原失败日志保留。
