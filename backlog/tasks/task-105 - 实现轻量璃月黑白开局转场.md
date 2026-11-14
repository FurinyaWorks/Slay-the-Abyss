---
id: TASK-105
title: 实现轻量璃月黑白开局转场
status: In Progress
assignee:
  - Furinya
created_date: '2026-11-14 07:06'
updated_date: '2026-11-14 07:52'
labels: []
milestone: m-8
dependencies: []
documentation:
  - docs/backlog-details/TASK-105.md
priority: medium
type: enhancement
ordinal: 174000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
当前旧开场演出禁用，确认角色后缺少自然衔接。用户要求复用现有过场与遮挡机制，仅做璃月短过场，不整份导入参考存档、不改规则。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 确认角色到开局展示短时黑白璃月过场，原生控件数量有据可查
- [x] #2 遮挡和输入隔离覆盖全程，结束与取消不残留遮罩，菜单选角开局流程回归通过
- [ ] #3 提供当前实现实际截图和完整前后衔接证据，明确模拟器与官方实机验证边界
- [x] #4 完成独立评审并提交目标 develop 的正常 PR
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 复用 prologuePanel、OnUpdate 和现有遮挡接口，移除旧演出布景，仅保留全屏遮罩、中央白色岩印与拦截层。2. 确认角色后播放短过场，覆盖时保持选角静帧，全黑后揭示原开局，复用原取消与结算入口。3. 增加时序、输入隔离、取消和开局衔接回归，生成实际运行截图。4. 独立复审、必要质量检查并创建 develop PR，官方实机证据按本轮窗口授权完成。

5. 用户实机反馈0.86秒一闪而过且图形被过度删减：改用参考原生璃月徽记、文字与元素序列，沿用参考8秒时间轴；只做转场适配，其他PR页面保持远端所有权。6. 原图元仅在真实模拟器像素等价时剔除完全遮挡部分，补最短可见时长与原图形合同，再出新候选和独立复审。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
已实现并独立复审通过；工程门禁、12项定向回归与同候选实际 Lua 模拟器截图完成。存档交用户手动新导入；官方导入、ready与设备视觉待验，AC3保持未完成。技术证据见 docs/backlog-details/TASK-105.md。

正常 PR #660 已创建：https://github.com/FurinyaWorks/Slay-the-Heavens/pull/660。精确源码提交818d26dc由独立审查 /root/review_liyue_transition 通过；官方实机/视觉 AC3待用户导入验收，保持 In Progress，不自动合并。

已读取用户2026-11-14 15:25启动、15:29落盘日志：本轮build/ready匹配，记录182条打印及一场战斗胜利，无已见Lua错误；361/361官方sidecar源码匹配。用户仍否定闪现节奏与过简视觉，故撤销相关AC通过状态，不以无错误替代体验验收。

R2恢复参考璃月徽记/文字区/七元素，按参考非循环8秒时轴执行；用户已确认七元素依次点亮方向正确。112固定控件，原116徽记只保留95个可见图元，同条件真实模拟器逐像素一致。11项转场回归与定向流程、工程/预算均通过；R2同候选截图已完成。新候选4a73df5e交用户导入，AC1/AC3继续待R2实机视觉验收。其他页面仅以远端各PR为准，不导入测试存档旧界面。
<!-- SECTION:NOTES:END -->
