# 雷电将军战斗待机 v1 — 审阅候选（未批准）

以官方雷电将军默认造型（长紫发辫、发饰、紫白和服、长柄武器）为参考，生成一份静态主图。
使用已经通过荧待机评审的「锁定静态源、固定鞋底、统一身体形变和少量飘带滞后」方法产生20帧、2.2秒循环。

`raiden_idle_compare.gif` 是首选人审入口：左静态、右待机。
`raiden_idle_review.gif` 为独立待机；`raiden_idle_133px_spritesheet.png` 为实际小尺寸对照。
`create_raiden_idle.py`、`raiden_static_draft.png`、`evidence.json`、`asset_manifest.json` 提供重建依据。
`imagegen_first_8frames.gif` 是原始AI候选，仅供追溯；**不是定稿**。

本素材未取得用户批准，不是项目正式默认美术，也不意味着可作为自定义PNG/GIF直接导入千星。
若得到批准，再对照真正目标尺寸做原生图元/模板实现与设备验收；制作攻击、受击动画不在当前范围。

运行重建：`python create_raiden_idle.py raiden_static_draft.png ./rebuild`，依赖 `pillow numpy opencv-python-headless`。
角色IP归原权利人，非商业同人预览，不将此候选称为官方图片或获授权的商业素材。
