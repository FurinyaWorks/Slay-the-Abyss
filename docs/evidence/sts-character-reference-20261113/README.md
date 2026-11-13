# 本轮选角还原结果

准确初代PC参照、归属与测量见 [REFERENCE](REFERENCE.md)。使用本轮原图测量，没有把项目旧V25画稿当作参照，也没有把原游戏背景图片用于生产。

## 当前源码验证与已保存视觉

集成冻结后新增 [visual-integrated](visual-integrated/render-receipt.json)，五张真实headless SDK截图闭包为 `52b6582bfc5a1eb2507fd6aaa2ced4272db7bd521781ff5ef3d738cdf73c5731`。新输出保留旧`visual-final`及其历史闭包。复用原准入并加浏览器检查的`verify-integrated.mjs`通过：真实ready后揭幕、3254图片/78分组、五列十牌/详情/返回恢复、无Run/RNG调用或loadout漂移，capture前后源码漂移及Lua/console/HTTP错误均为零。

五张均已实际查看，选角、待机、五列卡组、详情及返回恢复通过。保留纠正记录：首次查看整图时误判详情左下返回缺绘；原PNG的`[0,570,180,55]`区域与浏览器及旧shared永久/弃牌完全一致，不同像素0，RGBA SHA均为`bfdd114a8677792d37281cc8c8a2a45661756ccd30ec47b5374a818a8615c35e`。提取4x原始局部已确认完整返回图文，撤销缺绘观察；该误判本身不能证明工具渲染故障。精确记录见 [image-review](visual-integrated/image-review.json)，像素报告/局部图在`.artifacts/sts-character-reference-20261113/return-pixel-review/`。没有因此另采或修改正确的生产代码。

- `node tests/sts-character-reference.test.mjs`：5/5。原选择/返回/确认的hit对象保留；白名单实际角色与确认禁用保持；选择和战斗只引用一次相同approved idle literal；半身source crop边界、隐藏行不占原生创建预算、idle cache复用、缺图/出界crop拒绝及本页ready正反例通过。
- `node tests/sts-character-browser.test.mjs`：3项当前合同通过。初始牌组不创建Run/RNG，复制实际定义与display、生成局部确定UID，直接使用共享五列浏览器；真实生成Host覆盖deck来源归属、整页遮幕、排序/详情/控制器返回、关闭恢复和旧projection失效。每张初始牌经共享Grid填入名称/费用/规则。关闭后再开真实牌组确实恢复原显示名；无整页门禁的旧Host中，确认按下→预览→两种返回→抬起均不能触发开始。第三项执行真实`OnStart`、GameUI、Portrait控制器及entry readiness，选角仍准备时公开入口保持阻挡，测试受控换页后当前preview只等自身来源，隐藏selection仍building时可以揭幕。旧12槽牌面writer与独立填充逻辑已移除。
- `node tests/official-portraits-build.test.mjs`：5/5；`node tests/lumine-idle.test.mjs`：9/9。被用户要求替换的旧pixel正向断言已改为approved idle来源合同；修改前原测试gzip与SHA保存在 `historical-tests/`，历史负载缺失拒绝用例仍保留。
- `visual-final/verification.json`：PASS。这是本轮选角布局阶段的两张实际SDK/headless截图，源闭包 `1b2268a08fca67f2785ced9e4b520341aa35dad71b38c04919df325d5d001b40`；该旧闭包不含后续共享浏览器接入，后续集成结果见上述`visual-integrated`。每张额外等至少3次前端render pass，Lua/console/HTTP错误为0。实际3254个图片图元与78个分组都来自同一battle idle source，并按该候选主题声明crop，未导出独立头像图片。
- 日志先出现本轮selection真实ready（owned3332），再出现characterPanel整页visible epoch2。截图用软件WebGL模拟器；ready日志仅属于该SDK，不是官方ready或设备性能结果。

已肉眼查看两张PNG：不再有顶部“选择角色”标题、命之座、首字头像或假锁槽；只显示当前白名单的旅行者槽。姓名→生命金币→描述→遗物→真实初始牌组摘要保持原作左栏层级。半身在原作角色切换槽位置。中文统计字号降为16后生命数值与金币图标不再相撞。

独立复审发现，最初仅将隐藏selection设为false，会在合法`menuBackground=true`配置下反向要求已暂停的menuScene。现由`readyForPage`第四可选参数显式筛选本页肖像owner，旧三参API保持兼容；deck/map/node等无肖像宿主页不等待隐藏row或owner.busy，其它卡面、纹理、Grid门禁仍保留。真实OnStart负控已改用`menuBackground=true`和真实lowpolyLand源，同时断言旧三参调用确实被暂停menuScene阻挡，以免测试配置漏掉该失败。

原图旗面颜色像素抽查：红原图RGB140/56/54，本轮原生140/55/57；蓝原图71/121/132，本轮71/123/137。根据实际叶子可见bounds归一，而不是把V25容器60高当可见高度。原图红填充列÷1.5约y573.3..616，本轮y573..617；蓝原图中心列÷1.5约574.7..618，本轮574..620。边界约1–2px的native bands近似仍有差异，未宣称逐像素或字体等效。大背景保留替换槽。

## 复现

根目录使用新输出目录，复用已有SDK/Chrome，不覆盖证据：

```powershell
$captureId=Get-Date -Format 'yyyyMMdd-HHmmss'
$captureOut=".artifacts/sts-character-reference-20261113/replay-$captureId"
$visualOut=".artifacts/sts-character-reference-20261113/visual-replay-$captureId"
node --import 'file:///F:/New%20folder/.artifacts/simulator-runtime/preview-tools.mjs' docs/evidence/sts-character-reference-20261113/prepare-integrated.mjs $captureOut
node --import 'file:///F:/New%20folder/.artifacts/simulator-runtime/preview-tools.mjs' docs/evidence/sts-character-reference-20261113/capture-integrated.mjs $captureOut $visualOut
node docs/evidence/sts-character-reference-20261113/verify-integrated.mjs $visualOut $captureOut
```

取证仅在内存启动包装调用生产start/selectCharacter/selectElement；不确认开始、不创建Run、不改规则。候选生成布局及source closure保留在`.artifacts`，本目录只留脚本、哈希收据与评审用截图。外部投影工具复用上一轮已审的只读适配器，没有复制SDK。

过程截图已保全至 `.artifacts/style-fidelity-20261113/visual-history/character/`。其中`visual-current-2/3`记录取证工具默认15秒窗口截止：第一次building，裁剪预算修正后第二次已revealing。两次遮幕都保持，未冒充ready；第三次使用有界60秒等待真实ready成功。`visual-current-4`是首次成功视觉检查，随后按实际中文容量及原图边界修正主题，已保存布局阶段结果见上述`visual-final`。

未操作用户桌面、官方客户端或正式存档。官方导入、同候选ready、手机/PC实测与正式容量均未验证。

## CI与存储修复后的同输入证明

保留原五图及`source-integrated-manifest.json`的闭包52b6582b…。新`source-ci-storage-manifest.json`记录闭包b1271f18…，差异只有四个已审CI路径。共享的`verify-runtime-equivalence.mjs`以显式`character`模式核对完整658输入、当前fresh哈希、全部25生成物与实际53,306,522字节SDK存档；所有应用输出逐字节相同，存档SHA仍为90296e9c…。结果见`ci-storage-runtime-equivalence.json`。未剥离observer或只比较Lua片段，也未把旧截图改称新拍摄。

复核：`node docs/evidence/sts-neow-reference-20261113/verify-runtime-equivalence.mjs <原选角prepare输出> <新选角prepare输出> <新的报告> character`。这证明同一软件输入，设备边界保持上述状态。
