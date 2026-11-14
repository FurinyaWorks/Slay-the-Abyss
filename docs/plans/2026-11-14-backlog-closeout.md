# Backlog 轻量交付对账 Implementation Plan

**Goal:** 清理当前队列，并让已交付、待验和已被替代的任务不会再次被当作新实现领取。

**Architecture:** 任务事实继续只存在 Backlog。复用 task:pick、verify:backlog、verify:delivery --merged；合后仅按已合 PR 显式声明的处置，通过 Backlog CLI 更新，不猜测 AC，也不添加轮询服务或另一套状态库。

**Tech Stack:** Node.js、现有 Backlog CLI、GitHub CLI。

1. 在既有 intake / backlog 测试补真实逃逸反例：待验被领取、重复元数据漏读、AC全勾仍施工；先看红灯。
2. 最小修复两入口，保留无日期/无阶段限制和已有批准边界。
3. 给合后入口增加显式 `Backlog: TASK-1=done, TASK-2=verify, TASK-3=continue, TASK-4=superseded:TASK-3` 对账。done 只接受 AC 已全勾；verify 保留未验；superseded 检查承接与依赖。缺声明/错误/CLI失败不得报告任务同步成功。所有预检先于写入，重复调用不重复追加。
4. 在现有 delivery 测试验证声明遗漏、部分完成、错误替代和幂等；通过 CLI 小型隔离仓库核对实际写入/读回。
5. 更新现有任务执行与交付文档，独立复审，运行受影响测试和真实 Backlog/GUI读回。保留未取得的远端集成与设备验收状态。

用户没有要求本轮提交、推送或创建 PR，先在 GUI 独立工作树交付可读回的结果；不借治理工作改动玩法、棘轮阈值或分支保护。

后续授权（2026-11-14）：用户已明确要求将本轮Backlog状态及全部已确认机制提交PR并挂自动合并，作为随后人工版本规划的依据。沿同一独立分支进行提交、精确HEAD复审及原生队列授权；合后Full与任务最终AC仍按真实证据收口。
