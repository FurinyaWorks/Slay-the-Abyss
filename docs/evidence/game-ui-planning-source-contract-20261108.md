# Game UI 历史计时收据来源修正

## 根因与原始来源

`tests/ci-runtime.test.mjs` 将旧的完整文件计时收据与当前测试文件直接比对，混淆了两个不同来源。收据、日志及计时下限均未改写。

- #560 合入提交 `a0c35db8d3c7242437f4dff0df373749b0d84985` 是收据明确记录的 **baseHead**，并不是已测候选的提交身份。其 Game UI 测试 SHA256 为 `d315045bd104c0abc02d20e8487572eb85e0a35d7880d7618ed40ba195285b61`，Git blob 为 `0efdd5024865cb0ce0309b1283da419bcf8dc70c`。
- 原收据明确说明运行时候选未提交、源码 hash 在运行后采集，并由执行者确认运行中未变。原日志记录 13/13、77214.241194ms，不是 Hosted 或 Full 成功证明。
- 随后保存候选的本地提交 `3205985a38e0eb88ab6f894e74fe68c3e3789131` 唯一父为上述 #560 提交，tree 为 `4f11016d4badfa25024645c0a65e49b2a11aa94d`。逐项执行 `git show <commit>:<path>` 并计算 SHA256，收据 `sourceIdentity.files` 的 **346/346 个输入全部一致**。这证明它保存了所记录输入，不将整棵树或事后提交冒称运行时干净 HEAD。
- 该历史测试完整 21124 字节，SHA256 为 `bf6e9f1bb709548f1185f13120512a8c7e8411cfef92bd290982fe1724ef17f0`，Git blob 为 `05b38520531db07556dde3f1fd3a1ab1deb8b595`。
- #561 `b7ed18307e0be318ccd112aaa142e5ca4c191696` 将当前测试扩展为14项，新增 combined-retirement 的每 owner 漂移/删除及 hard-link 负控，并修正历史 owner 装配。当前测试 SHA256 为 `96ae4619ac9d4e77ebde18a6b74603b8390a39fc200674a8ded7fea20d264690`，Git blob 为 `00a11163ba12dcd5f779ec87fce4364c54f07e07`。这不是旧收据测过的文件。
- 原收据首次进入当前主线于 #562 `7821a7f44b518c09f6b565860e04e4823bc95153`。它保留了正确的历史 hash，错误在于同期新增的断言把它与当前文件比对。

## 最小修复

新增 `tests/fixtures/game-ui-planning-historical-source.json.gz`，只保存已测完整原测试及精确 base/commit/tree/blob 身份。压缩包 SHA256 为 `be2f351b3cf80f6c10928308863b7f4f3bf0d3a729cb892923651995de75bcd5`。测试独立固定来源 metadata、完整原文 SHA256 和 Git blob，再与未改收据交叉核对，并核实13个原 case 名称均出现在原日志中。

该原文只作为来源数据读取，不挂载或执行，不替换当前14项测试。当前文件冒充旧来源、原文漂移、删除有效断言、重算摘要/blob伪装、base冒充已测提交、身份字段改写及收据来源改写均必须失败。其余计时下限、日志、实际观测和投影负控照常执行。

原收据 SHA256 仍为 `0a7cb353d3a795706a33a3049e65d730be31861083eba807fd5019684c6feb30`，原日志仍为 `1779bc98d11ed261d6b2e96256a6030df337c978d95356b18ce8cf1041c2f326`，planning floor 仍为77215ms。没有修改任何生产源码、shared epoch/closure、执行预算、timeout或门禁。

## 本轮验证

- 修复前单独运行原 case，复现 `bf6e9f1b…` 与 `96ae4619…` 错配。
- 修复后原 case及上述来源负控通过；完整 `node --test --test-concurrency=1 tests/ci-runtime.test.mjs` **13/13**，0失败、0跳过，2574.698562ms。
- 压缩包包含NUL，Git按二进制处理；`git hash-object --no-filters` 与 `git -c core.autocrlf=true hash-object --path=<fixture>` 均为 `4b24eeb2d65329ca40ca7ad18332462462401076`，未改共享属性配置。
- `git diff --check` 通过。未重跑未改动的当前14项 Game UI 文件，未运行 Full、未发布、未做平台实测；不将原13项历史结果冒充当前源码通过。
