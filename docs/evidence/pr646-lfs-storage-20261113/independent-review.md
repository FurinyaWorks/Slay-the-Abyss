# PR646 存储切片独立复审

结论：PASS，无阻断。复审者为非存储实现作者 `/root/card_reference_audit`；2026-11-13 核对 f347 工作树中的冻结候选，不修改实现、索引或其他作者文件。精确源码及引用证据 SHA256 见 [independent-review.json](independent-review.json)。

- 独立运行 `node --test scripts/check-license.test.mjs tests/ci-reviewed-lfs.test.mjs`：23/23 PASS，39996.705 ms，无跳过。作者归档日志单独列入 JSON，不冒充该次独立运行日志。
- 原738条清单与 f347 父树清单深比较一致；原117369505字节预算、705对象、1576条既有许可记录和全部许可类别不变。新增76条精确属性、清单和许可路径恰好覆盖所选58个原 Git 对象在 f347 树中的全部76个别名（含18条 inspection 别名），没有通配放行。
- 逐路径核对原 gzip 长度、SHA256、Git blob SHA1、父树 OID、普通100644索引及完整规范 LFS 指针；76/76一致。新增许可敏感范围仅清单精确路径；独立私有夹具中，同长度1字节 gzip 变异和错误 SHA 指针均被拒绝，原字节及正确指针通过。未登记 gzip 仍不获得媒体比较豁免。原 `tests/helpers` gzip 无暂存改动。
- 检出128MiB、比较源8MiB、恢复90秒共用期限及原验证路径保持原值。58对象37495268字节是单列的原始LFS载荷预算，不当作网络量或Git pack大小。

独立复核 [既有本地冷克隆报告](cold-clone-report.json) 的现场：候选树 `6c715395ef45f730bc23f049e584319e720f5313`、候选提交 `9df276c8d4fd79b3fb9825c9fa12a2a80e55ed8a`、合成双父提交 `e97e5627be8879de859970cc984b6aeae73bb93f`。clone 无 alternates；3个物理pack实读合计125026148字节，低于134217728字节原门槛；比较准备2027072字节低于8388608字节。禁止lazy fetch后58个旧raw对象仍missing；恢复后的76别名与原压缩字节逐一相同，复核前后pack未增加。

该物理测量早于最终测试专用的许可断言及import；6个策略/说明文件与测量候选一致，测试文件的后续差异已逐行核对。它绑定上述私有本地候选，不能代替最终集成提交或GitHub hosted测量。[恢复报告](restore-report.json) 使用真实Git LFS及本地预置对象cache；缺失对象失败后补回同字节可恢复，但没有验证远端上传、冷网络恢复或90秒内网络完成。最终58对象上传和远端Full仍须主线程执行。本复审不声明远端准入完成。
