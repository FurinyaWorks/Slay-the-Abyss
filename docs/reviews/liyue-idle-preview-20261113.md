# 璃月四角色源媒体统一预览验证

2026-11-13，基线 `de078c848d107194c3a002c827d45e41ac1eacad`，分支 `feat/liyue-four-idle-candidates-20261113`。

入口：`art/characters/liyue-four/idle-candidate-v1/preview.html`。复用已有5×4帧表，无新增媒体或正式加载器变更。四角色各提供133×122及210×192 CSS像素的固定首帧/运动帧对照，支持同步播放、暂停、静态首帧、逐帧检查和背景切换。

## 本轮证据

- `python3 tests/liyue-idle-preview.py`：PASS。实际Chromium无头浏览器，验证清单SHA与字节数、页面链接HTTP成功、四角色16画布、准确CSS宽度、各运动帧实际像素变化、静态参照不变、暂停稳定与恢复首帧、浅色背景、375px窄屏无页面横向溢出。模拟返回LFS指针字节时错误可见且播放禁用。
- HTTP入口通过，无需ZIP。直接file://打开在本环境返回 `net::ERR_BLOCKED_BY_ADMINISTRATOR`；未绕过浏览器策略，README已明确使用HTTP入口。
- 从新建空目录 `/tmp/liyue-preview-lfs-cold` 执行 `git -c lfs.storage=/tmp/liyue-preview-lfs-cold lfs fetch --include='art/characters/liyue-four/idle-candidate-v1/**' --exclude='' origin HEAD`，20个对象下载成功；逐对象实读并比对清单大小和SHA-256全部PASS，合计23,215,999字节。媒体与基线相同，本切片不上传新二进制。
- 实际浏览器全页截图经检查：四角色、双尺寸与控制区可见。截图仅本地检查，不新增重复媒体入库。
- `git diff --check`：PASS。未重复Full；原生/设备/性能与人工审美均未验证。

## 现有工具与边界

输入包单角色review.html只有GIF对照，未具备统一尺寸和播放控制。当前统一入口复用原帧表。133px使用原小尺寸帧表，210px使用完整640×585单帧缩放；标注宽度不是不透明人物包围盒。

现有荧 `abyss_lumine_idle.lua` 锁定已批准source SHA与133/210宽度；画像导出适配器需要固定上游缓存。没有把四角色冒充为原生可用资源，也没有改动这两个入口。左侧静态是动画第0帧，母图另有直接链接。所有角色仍为 DRAFT_PENDING_OWNER_MOTION_REVIEW。

独立复核：本轮独立review_liyue审查并重跑定向浏览器测试通过，无阻断问题；其提出的单角色review.html来源位置文案已修正为原Library输入包，并同步清单哈希。
