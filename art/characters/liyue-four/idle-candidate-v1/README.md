# 璃月四角色待机：未批准候选 v1

甘雨、魈、钟离、刻晴；每角色20帧、110ms/帧、2.2秒循环。仅作为战斗待机设计候选保存，未绑定正式运行时，不替换荧等现有正式资产。

## 审阅与重建

各角色目录包含母图 `*_static_candidate.png`、生成提示词、`create_*_idle.py`，以及 preview 中的独立循环、左右静动对照 GIF、完整与133px帧表。先查看 `preview/*_idle_compare.gif`。逐帧 PNG 可重建，不重复入库。

运行 `python <角色>/create_<角色>_idle.py <角色>/<角色>_static_candidate.png /tmp/<角色>-rebuild`。依赖 Pillow、NumPy、SciPy，魈另需 OpenCV；字体 DejaVuSans。原生成环境见 source-records/REBUILD_ENVIRONMENT.json；不同依赖版本不保证逐字节一致。

## 状态与证据边界

- DRAFT_PENDING_OWNER_MOTION_REVIEW；四角色均未获人工审美批准。
- 原生图元、GIL导入、PC/手机显示、性能与负载均 UNVERIFIED；不是可直接导入千星的PNG/GIF。
- source-records 是输入包中的历史审查和离线数据，未在本次云环境重跑其动态重建，不代表本次验收。透明背景误判的修正保留在其中；其中外部路径和诊断图指向原 Library 输入包，未复制进本分支。
- 母图及媒体保持输入原字节；本次校验输入 ZIP CRC、83项来源清单哈希、入库媒体帧数/时长、Git LFS指针与实际对象。远端上传与空缓存下载结果以本次交接为准。
- 角色IP属于原权利人；AI辅助非商业同人候选，不宣称官方图片、商业清权或IP授权。项目 LICENSE 不授予额外角色IP权利。
- Backlog CLI 在本环境缺失，未变更任务状态、未宣称认领或Done。按 TASK_EXECUTION 的已授权独立工作边界保存候选。

## 来源

Library ID：`libfile_fde3_f-47e80cb707c88191a29e041ff5259681_d35602de215c8191b81d3887ab79a82b`，版本1。
输入：`liyue-four-idle-motion-candidates-20261113.zip`，SHA-256 `57fcb2c202895ed37d43b763877825b740ae175351b6d25f47960a92143dcd43`。ZIP只作输入，不作仓库交付。
未纳入淘汰源、旧draft、alpha诊断截图、旧远端受阻状态或逐帧PNG；完整来源仍由以上Library版本追溯。当前入库清单为 asset_manifest.json。

## 干净检出

本批是新增LFS媒体，不加入冻结的历史 `config/ci-media-lfs.json`，也不放宽旧CI门禁。检出本分支后先运行 `git lfs pull --include="art/characters/liyue-four/idle-candidate-v1/**" --exclude=""`，再按清单验证实际媒体。现有CI的历史媒体下载入口不会自动拉取本批；没有此步骤的冷缓存许可审核可能失败。本分支只保存待审资产，不声称完整CI通过或可合并。
