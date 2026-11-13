# PR646 精确状态证据 LFS 存储修复

原始远端 Quality 43422807733、Windows job 131877266061 在检出门槛失败：159956847 bytes > 128 MiB。比较源准备实际1596140 bytes，已通过原8MiB门槛；没有开始业务测试。

本切片保留原738路径、705对象、117369505字节媒体清单的完整记录、类别、OID及预算；删去新extension后原清单的规范文本SHA256仍为 `732a8b8b64611a2a3f714bf41a7c2bc1f458b1a6f9dfb86f5d37d0dc0c3a715a`。新增独立extension只含f347新增的58个native state gzip对象、76条精确路径、37495268原字节，其中18个inspection路径与state路径共享对象，全部迁移。完整选择及原Git OID见original-gzip-selection.json；sourceCommit、SHA256、bytes、既有许可类别进入config/ci-media-lfs.json及docs/legal/assets.json。

恢复仍使用原 `prepareMediaAssets`、精确index/pointer认证、90秒共用期限及逐文件SHA验证。原128MiB检出、8MiB比较源、原六PNG预算均不变；没有目录通配、新下载器、历史重写或新CI权限。原source epoch tests/helpers gzip不迁移、字节不改；只登记的gzip被纳入许可敏感路径，未知gzip仍是必须比较的普通输入。

验证：

- 新合同未实现时失败，错误为缺少显式extension（lfs-extension-red.log.gz）。
- 完整 `node --test scripts/check-license.test.mjs tests/ci-reviewed-lfs.test.mjs` 23/23 PASS；随后补充显式gzip许可敏感断言，受影响2项2/2 PASS。日志保留全文，没有放宽原30秒子进程或90秒恢复预算。
- 原partial-clone测试扩为实际58个raw状态对象及全部76路径：append-only转换后59个旧对象（加原PNG）均保持missing；未知gzip仍在比较集合、损坏gzip、未知旧OID、symlink、额外排除属性和真实文本空白均拒绝。
- 实际空Git库、depth2/blob:none、本地server的精确私有合成双父：CB树physical pack为131074861 bytes；存储候选为125026148 bytes，原128MiB余9191580 bytes。比较准备74个缺失blob、2027072 bytes < 8MiB；全部58个f347 raw OID仍missing；814路径原完整空白检查通过，pack总量前后不变。完整身份、pack名及绝对诊断路径见cold-clone-report.json。clone没有alternates；只有本地裸server借用本机Git对象库供数据，不借用clone对象。
- 实际原Git LFS从本地cache恢复76条路径，所有alias与原压缩字节一致。删除一个对象并将其全部alias恢复为pointer后，指向本地不存在端点的恢复必失败；补回同字节cache后恢复成功。见restore-report.json。

物理pack测量绑定报告中的私有候选tree/commit，早于最后新增的测试专用许可断言；生产和存储策略字节此后不变。该结果是本地Git实际pack，不是未压缩blob之和，也不是GitHub hosted测量。尚未上传新58个LFS对象；最终集成、上传及远端Full仍由主线程完成，不据此声明远端准入通过。

执行/策略文件最终SHA见source-identities.json。CI来源归档的后续承接由独立作者统一处理。

## 后续上传结果

`remote-existing-content.json`通过GitHub认证tree API与本地原字节SHA256/Git blob SHA1逐项核对：全部76路径、58份原始对象已经存在于同一公开仓库f347提交，没有新增内容外传。随后原生`git lfs push --object-id origin`上传58个精确OID成功，见`upload-result.json`。这补齐对象可上传性；冷网络恢复时限及最终远端Full仍需各自验证，不用上传成功替代。
