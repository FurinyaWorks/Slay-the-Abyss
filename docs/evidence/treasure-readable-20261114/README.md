# 宝箱页可读性纠偏

Owner 2026-11-14 两张首领宝箱截图：官方黄底、悬停只重复文案、混乱与钟诅咒无解释、召唤铃铛行截字及底部提示对比度低。

基线 e805a87dc4df1a048ba5995931d98a4e4899b5e9，独立分支 feat/treasure-readable。接续 TASK-103.2，不覆盖在途 PR646、648、650。房间共用背景改原生纯色，宝箱复用既有自绘箱体；详情板保留原生矩形，防通用适配器再次覆盖。列表说明固定20px、两行64高；选择规则集中在页脚。详情关联读取现有状态定义、当前候选诅咒牌面。

## 本轮证据

- 关键词生产连接、触屏长按吞点击、旧 action/view/run 拒绝：treasure-keyword-details 通过。
- 奖励可用性与旧所有权守卫：treasure-availability-ui、source-treasure-owner-guards 通过，最终组合3/3。
- official-assets、v25-node-layout 与宝箱回归首轮14/14；共享主题、房间、顶栏组合首轮29/30，原文字高度断言捕获标题36高。修正40高后 node-ui-layout 与 legibility 重跑21/21；新增背景防覆盖与关联说明回归最终11/11。
- JavaScript 语法检查、架构检查、daily平台预算通过；Fast计划对主题输入要求Full，不将定向测试当作Full。
- 两种UI构建成功：默认 build/lua 与 official-assets/native-page-lifecycle 的 build/treasure-official。

附图为生产 GameUI、真实 CursorEnter 写出的控制树经 Pillow 绘制的离线几何诊断。组件夹具阶段首领胜利并安排三个遗物，不代表自然通关；未知 SDK 纹理标ID，非浏览器/官方截图。四场景（未悬停、异蛇、铃铛、立方体）的宝箱区域无文字溢出候选或出界。原始捕获脚本和控制树留在工作树 .artifacts/treasure-readable/。

独立审查 /root/reference_audit 发现固定字号行高不足，已修正标题40高、说明64高及关联标题40高，复核无未解决P1/P2；主代理实际查看异蛇与铃铛诊断图。全文没有把离线图的纹理或字体当作实机通过。

## 未完成

未做官方导入、新 ready、真实客户端或手机验收；未运行完整 npm run check。TASK-103.2 保持 In Progress，AC1 不勾选。主菜单背景由已存在PR650负责，本切片只处理房间背景与宝箱说明。
