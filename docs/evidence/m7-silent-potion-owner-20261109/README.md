# Silent Potion owner 证据

说明见[任务附件](../../backlog-details/M7-SILENT-POTION-OWNER-20261109.md)。基线1eb28847，生产公开检查点23c72a05；最终提交身份由PR及独立收据另绑定。

- before/after-quality.json.gz：完整338源同算法即时报告，未删SCC或热点。
- metrics.json：完整测量报告派生的指标及源码身份。
- behavior/source.log.gz 与 *-receipt.json：当前完整7/13测试、输入摘要及真实单文件成本。
- *-receipt-initial.json.gz：初次过宽输入清单原件；最终收据明确说明两项未执行CI依赖的有据排除。
- behavior-first-failure.log.gz：初次mutation断言不足/错误定位，不能当作通过。
- old-behavior/history-final/source-recheck/source-consumers.log.gz：原历史合同、旧新行为与公开消费者；部分文件在多个组合执行，不将重复执行叠加为新增测试数量。
- original-lua.log.gz、existing-complexity.log.gz、reviewer-probe.mjs：原Lua、原复杂度与独立额外探针。
- backlog-doctor.log.gz：原有任务编号重复的未解决诊断，不冒称通过。

- silent-ci-final-verified-v2.log.gz、ci-consumers.log.gz：现有完整CI合同58项及六直接消费者30项，原预算/库存/失败路径均保留。
- silent-*.log.gz：来源初始OOM、收据循环与接线过程失败原件；不能叠算为通过。
- independent-review-provisional.json：代码、行为、来源、CI增量独立审查；不是最终HEAD批准或Hosted证据。

所有摘要需结合相应输入身份解读。规划不是Hosted Full或设备性能，尚无本片官方导入、ready、手机或发布证明。

## Seven 旧来源入口修复补充

`seven-fix-evidence.json` 独立列出初始Quick失败、当前修复输入、补充日志与验证边界。`seven-fix-*.log.gz` 保留原8/9复现、初稿负控失败、最终9/9、全部10个来源合同121/121，以及原Quick JS选集复验。首次JS复验缺少本地LFS素材产生8项失败，随后通过原`ci-reviewed-lfs.mjs`精确下载6份既有PNG，保留准备日志与最终结果。没有修改图片、原证据manifest、成本或门禁，也未执行本地Full。
