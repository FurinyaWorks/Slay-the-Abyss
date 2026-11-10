# #582 挂载参数配对修复

接续 TASK-100.1，前序 HEAD `5acef9b454c0339c9f787f90e33d6d886c7c14ef`，develop `1eb288472d7b33b7450eec97a624ca2ffa526f39`。问题来自 [独立评审](https://github.com/FurinyaWorks/Slay-the-Abyss/pull/582#pullrequestreview-5836270444)：SDK wrapper 实际注入 mountedValues，但同视觉配对未比较该输入。

## 修改

按 controlId/script 验证唯一挂载身份，比较完整参数集合及嵌套 JSON 值。增加、删除、变值、缺失和重复行均拒绝；显式空数组允许表示没有覆盖参数，缺字段不等同空数组。行顺序和对象键顺序不影响有效参数身份，输入不被修改。SDK 导入前也校验收据，避免畸形/歧义覆盖进入测量。

未修改运行时 Lua、素材、SDK计数预算、时间观察线、CI成本/分片/worker配置或工作流。比较输出结构不变，不增加伪造的历史 worker hash。修改后的测量脚本将自然产生新的 worker hash；旧报告继续保留原测量脚本身份。

## 验证

- 原实现运行新增目标断言：30项中20项失败、10项通过，完整 RED 保留。
- 生产修复后30/30；逐步补充类型、缺失、稀疏数组和循环对象边界，最终39/39。包含原最终报告的 nativeComponentControls=false、nativeBgmEnabled=true 攻击，经 evaluatePair 必须拒绝。
- 原两组实际GIL报告仍重算通过，逐字段复现原输出，原不利暖态时间观察保持。
- 历史CI/runtime合同53/53；五个既有来源消费者52/52。无需修改或增加历史投影，原断言及46份已有压缩来源/SDK证据逐字不变，详见 immutable-inputs.json。
- verify:backlog、check:guidance、脚本语法和 diff 空白检查通过。相关测试规划按传递依赖给出大集合，未重复运行完整套件，仅运行上述定向合同。
- 日志压缩保留原字节，validation.json 同时记录原始与压缩SHA256。测试环境为本地 Linux / Node24.22.1，不冒充Hosted或Windows。

## 边界

独立复审、精确新HEAD的正常Hosted Full、队列及合后验收仍待主控推进。未发布远端、未手动触发CI、未操作GUI；TASK-100.1仍In Progress，AC5未勾。没有重跑私有SDK实测或官方PC/安卓设备验收。
