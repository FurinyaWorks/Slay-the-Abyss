# 官方负载截图完整性修复

基线 develop `3a061a76b5eb917ac0f4213c01a9cbafd28d1824`。仅修改既有 `scripts/platform-load.mjs` 与 `tests/platform-load.test.mjs`；不改 UI、共享来源层、CI配置、预算、测试库存或其他人的分支。

## 问题与修复

原验收器仅检查8字节PNG或3字节JPEG标志，正确摘要的截断伪图能使完整合成负载证据返回PASS。本轮真实RED见 `red.log`。现复用项目已要求的Python/Pillow完整verify+load，仅允许PNG/JPEG且尺寸非空，并解码已通过摘要核对的同一批字节，移除第二次不受摘要绑定的路径读取。缺解释器、解码错误或超时均拒绝。

独审复现初稿使用Python assert会被PYTHONOPTIMIZE移除：14字节PPM可通过。保留 `independent-python-optimize.log`，修正为显式ValueError，补优化模式正反例。最终独审PASS、unresolved为空，精确两文件摘要及原发现见 `independent-review.json`；独立缺解释器负控也返回BLOCKED。

## 本轮验证

- 最终两份完整专项 `platform-load.test.mjs` + `platform-load-wiring.test.mjs`：10/10，16.203秒。含完整PNG/JPEG正控、截断标志/载荷、坏CRC、非允许格式、优化解释器和单次读取边界。用例内循环不另累加为测试数。
- build:data、build:ui；guidance、Backlog、network、最终两文件语法和diff检查通过。首次guidance因稀疏检出漏 `.cursor` 失败已保留，补齐原基线目录后复验成功。
- related选测仅生成计划，未执行宽选集。首次把两文件错误拼成一个参数的计划也保留，正确计划另存gzip。未手动触发Full或重复他人运行。
- 实际本地Node24.22.1、Python3.12.14、Pillow13.0.0，版本见 `build.log`，不冒称托管固定版本测试。

## 边界与交接

所有测试图片仅为2×2合成fixture，不是官方截图、视觉质量、人审、实体手机或新候选验收。修复只阻止损坏/错误格式图片被当作证据，不能证明截图内容真实。

复用TASK-86既有候选完整性维护范围；`task:pick`为ALLOW，但Backlog CLI不可用，未改任务状态/AC、未声称已认领。当前gh未登录，不能执行原merge:auto身份握手；保留Draft，正常独审准入、精确HEAD正式CI、队列及合后验证仍待，不伪造准入status或绕过门禁。
