# PR615 离线能力审计原始证据

执行时间：2026-11-11T03:16:18.034Z；源 HEAD cf4dd880447bad2ec95dbe065bc4a337d8246cf5；基线 origin/develop 6a614fc82697750ddb408750e54f59f801c24f1e。Node v22.22.1。

范围：只测公开API、变量监听、SetImage正控。未配置原生绑定，变量变化后图片不变不是平台不支持绑定的证明。没有B、A/B耗时、FPS、截图或官方运行结论。

|输入|SHA256|用途|
|---|---|---|
|D:/MiliastraTools/genshin-miliastra-mcp/knowledge/official/guide/mhtakr07vej4.md|95c4b373413f1f3d2a1d337a0fc165a6cc6ad00880bc96b47c00516d9342e6b9|官方离线API：167、204–205、277–310、520–531、707–745|
|D:/MiliastraTools/genshin-miliastra-mcp/knowledge/official/guide/mh2oih9jou22.md|8344bbf2bf0fb09020d762638368b328a721ae043a37910ddb9fa093e3bfd0ff|官方离线图片指南：25–57旧图片，65–69客户端图片|
|D:/MiliastraTools/genshin-miliastra-mcp/knowledge/official/guide/mhso1b9wjica.md|c769a9252e9df7409e6927a4bbf421fd3f583c17611fb2fe2ac7df0fcf049865|官方离线变量指南：65–80同步约束|
|D:/MiliastraTools/genshin-miliastra-mcp/src/scene/client-api.json|e220006e273744ae5dd1b012048f6dec15f36c2125e77c8609b88c24cef44f0f|现有API索引，仅辅助，不代替官方正文|
|D:/MiliastraTools/genshin-miliastra-mcp/src/scene-save.mjs|9ca00d37983485b940a3b2a36bf4458c0ac09d0177c0a321f5aa922459bd4bd2|现有写入/读回：2533–2568、2688、2786–2790|
|F:/New folder/.artifacts/art-lab-runtime/node_modules/beyond-simulator-mcp/dist/index.js|5a64b946fac68d29052e387de11cfb64b90bd5c8a559a74b0fe5d90241be1bca|实际执行MCP 0.5.2|
|F:/New folder/.artifacts/art-lab-runtime/node_modules/beyond-simulator-mcp/dist/worker.js|de72d4f80b230cfac330ab0ac6fa9d05e51bb8f51d352f08dd1ee6bcba0fe09d|实际执行Worker|
|F:/New folder/.artifacts/art-lab-simulator/client/lua-runtime/src/scene.js|08ceeae6ba9c69a7f14ed30916110d129182f6692d609febb462ad80319b0048|辅助源码：38–70、541–548；不当成已安装包身份|
|F:/New folder/.artifacts/art-lab-simulator/client/lua-runtime/src/runtime.js|a80d663ea2479d701be8bd3dcbd457ce6a5ada45787be7b1961d3be16e85dff7|辅助源码：508–513、1501–1525|
|experiments/art-tech-lab/sample.save.json|0947e52365744e71ff6631135cf7718050bb31c221c11cde01d7e62809e32ef5|仓库合法样本来源|
|build/pr615/api.save.json|1c32ac75fd2802032a3134daad3219709666f78e67bed50edaa91e06d4a2271a|本轮1图片控件API sanity候选，仅模拟器存档，不是GIL|
|build/pr615-probe.mjs|503f99363367fcb117949b398840a4fd8145f6a114bdf1c13208e6e6dd89c39d|本轮实际执行脚本|
|build/pr615/raw.json|982c3bb91070fa989eeb28e2debdc99f3cf95a2d3a4d5ff79cb1caa0534d22cd|本轮原始调用响应|

## 原始失败与限制

- 首次 gh 因环境代理 127.0.0.1:9 失败；清除该进程代理后恢复。
- 工作树 git fetch 写 FETCH_HEAD 被沙箱拒绝；提权完成 fetch 和原分支独立工作树创建，无覆盖现有树。
- 首次 Simulator bridge 子进程 spawn EPERM；获工具审批后使用原工具原参数重跑成功，没有安装依赖或修改模拟器。
- 在线官方两页返回无可读正文，视频网页抓取失败；视频机制按PR描述作为待验证假设，本轮未观看原视频，不新增视频事实判断。改读已安装官方离线正文，其版本新鲜度未在线核验。
- 本地缺少已确认含视频绑定且可运行的合法样本；官方界面控件教程GIL存在但未解码，不能以其存在证明包含目标机制。
- 首次相关测试选择器因缺 luaparse 失败；按 package-lock 在独立树 npm ci --ignore-scripts 安装11个包后恢复。沙箱内 Git 子进程又导致 Cannot resolve comparison base，经工具审批原命令重跑成功；没有更改测试规则。

## 项目检查

- npm run verify:backlog：通过，父任务状态与AC未改。
- git diff --check：通过。
- npm run test:related -- --base origin/develop --plan：成功生成计划，但 Backlog 正文是 unmodelled input，full=true；不是测试执行通过。完整质量交原PR Hosted Quality，本文件不将其预记为通过。

## 复现

在PR工作树将下段保存到 build/pr615-probe.mjs；将 ART_LAB_MCP_ENTRY 指向本机既有0.5.2安装的dist/index.js，执行 node build/pr615-probe.mjs。相对import使用当前工作树布局（根仓库下.worktrees/pr615-image-binding）；其他布局改为已有rpc.mjs真实路径。不下载、不操作桌面。输出 build/pr615/raw.json。读取日志确认两次list-observed、100001→100002正控及无lua-error；不以成功退出代替检查响应。

```js
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {bridge} from '../../../experiments/art-tech-lab/rpc.mjs';
const out='build/pr615'; fs.mkdirSync(out,{recursive:true});
const seed=JSON.parse(fs.readFileSync('experiments/art-tech-lab/sample.save.json'));
const root=seed.assets.server.root.children[0];
const find=n=>n.kind==='image'?n:(n.children??[]).map(find).find(Boolean);
const image=structuredClone(find(root));
image.name='probe'; image.children=[]; image.scriptMappingIds=[];
root.children=[image];
const lua=`local image
function OnStart()
 image=script.object:GetChild('probe')
 print('dynamic-enum',Enum.ImageSource.DynamicReference)
 print('variable-writer',type(game.SetGlobalCustomVariableValue))
 local ok,err=pcall(function()image.imageId=100002 end)
 print('readonly-write',ok,err)
 image:SetImage(Enum.ImageSource.StaticReference,100001)
 print('setimage',image.imageId)
 script:RegisterCustomVariableChangedHandler(Enum.CustomVariableEntityType.PlayerSelf,'PR615',function()
  local ids=game.GetGlobalCustomVariableValue(Enum.CustomVariableEntityType.PlayerSelf,'PR615')
  print('list-observed',ids[1],image.imageId)
 end)
 script:RegisterServerSignalHandler('PR615_SETIMAGE',function()
  image:SetImage(Enum.ImageSource.StaticReference,100002)
  print('setimage',image.imageId)
 end)
 print('PR615_API_READY')
end`;
seed.assets.scripts[0].source=lua;
seed.assets.scripts[0].path='pr615-api.lua';
fs.writeFileSync(out+'/api.save.json',JSON.stringify(seed));
const b=bridge(), unpack=r=>r.structuredContent??JSON.parse(r.content.find(c=>c.type==='text').text);
const results=[];
try{
 await b.request('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'pr615-api-audit',version:'1'}});
 const list=await b.request('tools/list',{});
 results.push({tools:list.tools.map(t=>({name:t.name,description:t.description}))});
 const {handle}=unpack(await b.call('qxqy_project_open',{path:out+'/api.save.json'}));
 for(const [action,args] of [['start',{}],['serverSet',{entityType:'PlayerSelf',name:'PR615',value:[100002]}],['serverSet',{entityType:'PlayerSelf',name:'PR615',value:[100001]}],['serverSend',{name:'PR615_SETIMAGE',params:[]}],['get',{}]]){
  const result=unpack(await b.call('qxqy_studio_play',{handle,action,args})); results.push({action,result});
 }
 const logs=JSON.stringify(results);
 assert(logs.includes('PR615_API_READY'),'script did not start');
 assert(!logs.includes('lua-error'),'runtime error');
 await b.call('qxqy_studio_play',{handle,action:'stop'});
}finally{b.close();fs.writeFileSync(out+'/raw.json',JSON.stringify({scope:'API sanity only; no configured native binding, no B, no performance measurement',lua,results},null,2));}
console.log('PR615 API sanity completed; inspect raw logs, not a binding test');

```

## 原始响应

工具清单与每步完整响应（含累积日志，重复不是多次独立采样）：

```json
{
  "scope": "API sanity only; no configured native binding, no B, no performance measurement",
  "lua": "local image\nfunction OnStart()\n image=script.object:GetChild('probe')\n print('dynamic-enum',Enum.ImageSource.DynamicReference)\n print('variable-writer',type(game.SetGlobalCustomVariableValue))\n local ok,err=pcall(function()image.imageId=100002 end)\n print('readonly-write',ok,err)\n image:SetImage(Enum.ImageSource.StaticReference,100001)\n print('setimage',image.imageId)\n script:RegisterCustomVariableChangedHandler(Enum.CustomVariableEntityType.PlayerSelf,'PR615',function()\n  local ids=game.GetGlobalCustomVariableValue(Enum.CustomVariableEntityType.PlayerSelf,'PR615')\n  print('list-observed',ids[1],image.imageId)\n end)\n script:RegisterServerSignalHandler('PR615_SETIMAGE',function()\n  image:SetImage(Enum.ImageSource.StaticReference,100002)\n  print('setimage',image.imageId)\n end)\n print('PR615_API_READY')\nend",
  "results": [
    {
      "tools": [
        {
          "name": "qxqy_studio_export",
          "description": "导出 GIA/JSON/Lua。list 列出客户端控件与 revision；preview 传 controlIds 预览子树；export 默认 gia-partial，以 controlIds 勾选部分组合。父子同时选自动去重，子控件在副本中提升为独立模板，原存档不变。includeScripts 默认 true（包含挂载脚本和未挂载模块）。支持原有 gia/gia-combined/save 等 format。可选 path 写入工作区新文件，不覆盖已有文件；省略则返回 base64。"
        },
        {
          "name": "qxqy_script_sync",
          "description": "实机 Lua 脚本目录同步：discover/status/configure/save/preview/apply。configure 需要 config(version:1, workspaceDir, clientImportRoot, clientSubdir) 与 expectedRevision；save 需要 expectedRevision，首次保存另传工作区相对 path。用户授权更新后，先保存完整存档，再 preview 核对来源与目标，最后 apply 传 planId、选定 scriptIds 和 confirmed:true。计划仅在当前 handle 有效，过期需重新预览；返回逐文件结果与备份位置，不代表真机试玩通过。"
        },
        {
          "name": "qxqy_project_open",
          "description": "在本 MCP 进程打开工作区存档，或创建一个新的空工程。不会刷新 Web 预览；显示已有存档请调用 qxqy_preview_open。返回后续工具使用的工程句柄；path 必须是工作区内相对路径。"
        },
        {
          "name": "qxqy_project_save",
          "description": "把当前工程句柄中的修改保存为工作区内的 qxqy-simulator-save JSON。保存回执只确认写盘；需切换或确认 Web 预览时，随后调用 qxqy_preview_open。path 必须是工作区内相对路径。"
        },
        {
          "name": "qxqy_studio_get",
          "description": "读取指定工程的无损 Authoring JSON 快照、当前 revision、脚本挂载、画布、服务端逻辑与 controlGuidChanges。若有索引变更记录，必须按控件身份同步存档 Lua source 和相关源文件中的索引引用，核对后再确认清除。写操作前应先获取最新 revision。"
        },
        {
          "name": "qxqy_studio_patch",
          "description": "修改指定工程。op 必须包含 expectedRevision；冲突时先重新 get 再重算。客户端控件索引用 setControlGuid（id、guid），修改后必须语义核对并更新 Lua 引用；完成后用 acknowledgeControlGuidChanges（changeIds）确认记录，禁止只改索引或盲目替换全部同值数字。"
        },
        {
          "name": "qxqy_studio_play",
          "description": "控制指定工程的 Lua 试玩 Worker。MCP 默认 manual 时钟，仅显式 step/用例回放推进时间；等待、get 和截图不会自动推进。start 可传 clockMode=\"realtime\" 自动运行。start 后才能输入和 step；stop 回收 Worker。工具启动的试玩默认关闭浏览器音效，显式 muteAudio:false 可打开。"
        },
        {
          "name": "qxqy_studio_ui_screenshot",
          "description": "获取当前编辑器舞台 PNG，用于检查静态 UI 布局和控件图元；不会启动或步进试玩。"
        },
        {
          "name": "qxqy_studio_play_screenshot",
          "description": "获取当前试玩 Runtime 画面的 PNG；必须先 start，截图不调用 step。默认 manual 模式保持当前帧；显式 realtime 模式在调用之间仍自动运行。回执含 frame/time/clockMode。"
        },
        {
          "name": "qxqy_studio_load",
          "description": "列出工作区内的 qxqy-simulator-save JSON，或把指定相对路径载入本 MCP 进程的已有工程句柄。不会刷新 Web 预览；显示已有存档请调用 qxqy_preview_open，无需再次保存。"
        },
        {
          "name": "qxqy_preview_status",
          "description": "查询独立 Web 预览服务的版本、工作区、当前存档和加载错误。连接到 --web-url / QXQY_WEB_URL（默认 http://127.0.0.1:4173），必须与 MCP 使用同一工作区。无需工程句柄。"
        },
        {
          "name": "qxqy_preview_open",
          "description": "让独立 Web 预览打开或重新加载已保存的存档，返回 Web 确认的路径、名称和 revision；不会保存 MCP 内未落盘的修改。path 为工作区内相对路径，不受自动列表筛选限制。需要已启动同一工作区的 Web 服务，无需工程句柄。"
        }
      ]
    },
    {
      "action": "start",
      "result": {
        "canvasId": "pc-16-9",
        "platform": "KEYBOARD",
        "device": "KeyboardAndMouse",
        "canvasWidth": 1600,
        "canvasHeight": 900,
        "canvasPresets": [
          {
            "id": "pc-16-9",
            "label": "PC 1600×900",
            "platform": "KEYBOARD",
            "width": 1600,
            "height": 900
          },
          {
            "id": "pc-21-9",
            "label": "PC 2100×900",
            "platform": "KEYBOARD",
            "width": 2100,
            "height": 900
          },
          {
            "id": "mobile-16-9",
            "label": "手机 1280×720",
            "platform": "TOUCHSCREEN",
            "width": 1280,
            "height": 720
          },
          {
            "id": "mobile-19.5-9",
            "label": "手机 1560×720",
            "platform": "TOUCHSCREEN",
            "width": 1560,
            "height": 720
          },
          {
            "id": "mobile-4-3",
            "label": "手机 1280×960",
            "platform": "TOUCHSCREEN",
            "width": 1280,
            "height": 960
          }
        ],
        "playerCount": 1,
        "viewPlayerIndex": 1,
        "players": [
          {
            "index": 1,
            "label": "玩家1",
            "entityType": "Player1"
          }
        ],
        "time": 0,
        "frame": 0,
        "paused": false,
        "levelTimePaused": false,
        "audio": {
          "sessionId": "c800b556-5663-45b5-80ae-b6e968e6f71f",
          "playerIndex": 1,
          "sequence": 0,
          "revision": 0,
          "active": [],
          "recent": []
        },
        "effects": [],
        "mountError": null,
        "logs": [
          {
            "source": "client",
            "level": "info",
            "text": "dynamic-enum\tnil",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "variable-writer\tnil",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "readonly-write\tfalse\tcannot set imageId, no such field",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "setimage\t100001",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "PR615_API_READY",
            "time": 0
          }
        ],
        "tree": [],
        "paint": [],
        "scene": null,
        "server": {
          "clock": 0,
          "onlineLatencyMs": 0,
          "playerCount": 1,
          "viewPlayerIndex": 1,
          "logic": {
            "version": 1,
            "rules": []
          },
          "vars": {
            "Level": {},
            "PlayerSelf": {},
            "AvatarSelf": {},
            "Player1": {},
            "Avatar1": {}
          },
          "inbound": [],
          "outbound": [],
          "logs": []
        },
        "history": [],
        "running": true,
        "serverLogs": [],
        "serverVars": [],
        "clockMode": "manual",
        "audioMuted": true
      }
    },
    {
      "action": "serverSet",
      "result": {
        "canvasId": "pc-16-9",
        "platform": "KEYBOARD",
        "device": "KeyboardAndMouse",
        "canvasWidth": 1600,
        "canvasHeight": 900,
        "canvasPresets": [
          {
            "id": "pc-16-9",
            "label": "PC 1600×900",
            "platform": "KEYBOARD",
            "width": 1600,
            "height": 900
          },
          {
            "id": "pc-21-9",
            "label": "PC 2100×900",
            "platform": "KEYBOARD",
            "width": 2100,
            "height": 900
          },
          {
            "id": "mobile-16-9",
            "label": "手机 1280×720",
            "platform": "TOUCHSCREEN",
            "width": 1280,
            "height": 720
          },
          {
            "id": "mobile-19.5-9",
            "label": "手机 1560×720",
            "platform": "TOUCHSCREEN",
            "width": 1560,
            "height": 720
          },
          {
            "id": "mobile-4-3",
            "label": "手机 1280×960",
            "platform": "TOUCHSCREEN",
            "width": 1280,
            "height": 960
          }
        ],
        "playerCount": 1,
        "viewPlayerIndex": 1,
        "players": [
          {
            "index": 1,
            "label": "玩家1",
            "entityType": "Player1"
          }
        ],
        "time": 0,
        "frame": 0,
        "paused": false,
        "levelTimePaused": false,
        "audio": {
          "sessionId": "c800b556-5663-45b5-80ae-b6e968e6f71f",
          "playerIndex": 1,
          "sequence": 0,
          "revision": 0,
          "active": [],
          "recent": []
        },
        "effects": [],
        "mountError": null,
        "logs": [
          {
            "source": "client",
            "level": "info",
            "text": "dynamic-enum\tnil",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "variable-writer\tnil",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "readonly-write\tfalse\tcannot set imageId, no such field",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "setimage\t100001",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "PR615_API_READY",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "list-observed\t100002\t100001",
            "time": 0
          }
        ],
        "tree": [],
        "paint": [],
        "scene": null,
        "server": {
          "clock": 0,
          "onlineLatencyMs": 0,
          "playerCount": 1,
          "viewPlayerIndex": 1,
          "logic": {
            "version": 1,
            "rules": []
          },
          "vars": {
            "Level": {},
            "PlayerSelf": {
              "PR615": {
                "type": "IntList",
                "value": [
                  100002
                ]
              }
            },
            "AvatarSelf": {},
            "Player1": {
              "PR615": {
                "type": "IntList",
                "value": [
                  100002
                ]
              }
            },
            "Avatar1": {}
          },
          "inbound": [],
          "outbound": [],
          "logs": []
        },
        "history": [
          {
            "t": 0,
            "source": "user",
            "kind": "serverSet",
            "payload": {
              "entityType": "PlayerSelf",
              "name": "PR615",
              "value": [
                100002
              ],
              "playerIndex": 1
            }
          }
        ],
        "running": true,
        "serverLogs": [],
        "serverVars": [
          {
            "entityType": "PlayerSelf",
            "entityLabel": "当前玩家",
            "name": "PR615",
            "type": "IntList",
            "value": [
              100002
            ]
          }
        ],
        "clockMode": "manual",
        "audioMuted": true
      }
    },
    {
      "action": "serverSet",
      "result": {
        "canvasId": "pc-16-9",
        "platform": "KEYBOARD",
        "device": "KeyboardAndMouse",
        "canvasWidth": 1600,
        "canvasHeight": 900,
        "canvasPresets": [
          {
            "id": "pc-16-9",
            "label": "PC 1600×900",
            "platform": "KEYBOARD",
            "width": 1600,
            "height": 900
          },
          {
            "id": "pc-21-9",
            "label": "PC 2100×900",
            "platform": "KEYBOARD",
            "width": 2100,
            "height": 900
          },
          {
            "id": "mobile-16-9",
            "label": "手机 1280×720",
            "platform": "TOUCHSCREEN",
            "width": 1280,
            "height": 720
          },
          {
            "id": "mobile-19.5-9",
            "label": "手机 1560×720",
            "platform": "TOUCHSCREEN",
            "width": 1560,
            "height": 720
          },
          {
            "id": "mobile-4-3",
            "label": "手机 1280×960",
            "platform": "TOUCHSCREEN",
            "width": 1280,
            "height": 960
          }
        ],
        "playerCount": 1,
        "viewPlayerIndex": 1,
        "players": [
          {
            "index": 1,
            "label": "玩家1",
            "entityType": "Player1"
          }
        ],
        "time": 0,
        "frame": 0,
        "paused": false,
        "levelTimePaused": false,
        "audio": {
          "sessionId": "c800b556-5663-45b5-80ae-b6e968e6f71f",
          "playerIndex": 1,
          "sequence": 0,
          "revision": 0,
          "active": [],
          "recent": []
        },
        "effects": [],
        "mountError": null,
        "logs": [
          {
            "source": "client",
            "level": "info",
            "text": "dynamic-enum\tnil",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "variable-writer\tnil",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "readonly-write\tfalse\tcannot set imageId, no such field",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "setimage\t100001",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "PR615_API_READY",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "list-observed\t100002\t100001",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "list-observed\t100001\t100001",
            "time": 0
          }
        ],
        "tree": [],
        "paint": [],
        "scene": null,
        "server": {
          "clock": 0,
          "onlineLatencyMs": 0,
          "playerCount": 1,
          "viewPlayerIndex": 1,
          "logic": {
            "version": 1,
            "rules": []
          },
          "vars": {
            "Level": {},
            "PlayerSelf": {
              "PR615": {
                "type": "IntList",
                "value": [
                  100001
                ]
              }
            },
            "AvatarSelf": {},
            "Player1": {
              "PR615": {
                "type": "IntList",
                "value": [
                  100001
                ]
              }
            },
            "Avatar1": {}
          },
          "inbound": [],
          "outbound": [],
          "logs": []
        },
        "history": [
          {
            "t": 0,
            "source": "user",
            "kind": "serverSet",
            "payload": {
              "entityType": "PlayerSelf",
              "name": "PR615",
              "value": [
                100002
              ],
              "playerIndex": 1
            }
          },
          {
            "t": 0,
            "source": "user",
            "kind": "serverSet",
            "payload": {
              "entityType": "PlayerSelf",
              "name": "PR615",
              "value": [
                100001
              ],
              "playerIndex": 1
            }
          }
        ],
        "running": true,
        "serverLogs": [],
        "serverVars": [
          {
            "entityType": "PlayerSelf",
            "entityLabel": "当前玩家",
            "name": "PR615",
            "type": "IntList",
            "value": [
              100001
            ]
          }
        ],
        "clockMode": "manual",
        "audioMuted": true
      }
    },
    {
      "action": "serverSend",
      "result": {
        "canvasId": "pc-16-9",
        "platform": "KEYBOARD",
        "device": "KeyboardAndMouse",
        "canvasWidth": 1600,
        "canvasHeight": 900,
        "canvasPresets": [
          {
            "id": "pc-16-9",
            "label": "PC 1600×900",
            "platform": "KEYBOARD",
            "width": 1600,
            "height": 900
          },
          {
            "id": "pc-21-9",
            "label": "PC 2100×900",
            "platform": "KEYBOARD",
            "width": 2100,
            "height": 900
          },
          {
            "id": "mobile-16-9",
            "label": "手机 1280×720",
            "platform": "TOUCHSCREEN",
            "width": 1280,
            "height": 720
          },
          {
            "id": "mobile-19.5-9",
            "label": "手机 1560×720",
            "platform": "TOUCHSCREEN",
            "width": 1560,
            "height": 720
          },
          {
            "id": "mobile-4-3",
            "label": "手机 1280×960",
            "platform": "TOUCHSCREEN",
            "width": 1280,
            "height": 960
          }
        ],
        "playerCount": 1,
        "viewPlayerIndex": 1,
        "players": [
          {
            "index": 1,
            "label": "玩家1",
            "entityType": "Player1"
          }
        ],
        "time": 0,
        "frame": 0,
        "paused": false,
        "levelTimePaused": false,
        "audio": {
          "sessionId": "c800b556-5663-45b5-80ae-b6e968e6f71f",
          "playerIndex": 1,
          "sequence": 0,
          "revision": 0,
          "active": [],
          "recent": []
        },
        "effects": [],
        "mountError": null,
        "logs": [
          {
            "source": "client",
            "level": "info",
            "text": "dynamic-enum\tnil",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "variable-writer\tnil",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "readonly-write\tfalse\tcannot set imageId, no such field",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "setimage\t100001",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "PR615_API_READY",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "list-observed\t100002\t100001",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "list-observed\t100001\t100001",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "setimage\t100002",
            "time": 0
          }
        ],
        "tree": [],
        "paint": [],
        "scene": null,
        "server": {
          "clock": 0,
          "onlineLatencyMs": 0,
          "playerCount": 1,
          "viewPlayerIndex": 1,
          "logic": {
            "version": 1,
            "rules": []
          },
          "vars": {
            "Level": {},
            "PlayerSelf": {
              "PR615": {
                "type": "IntList",
                "value": [
                  100001
                ]
              }
            },
            "AvatarSelf": {},
            "Player1": {
              "PR615": {
                "type": "IntList",
                "value": [
                  100001
                ]
              }
            },
            "Avatar1": {}
          },
          "inbound": [],
          "outbound": [
            {
              "id": 1,
              "name": "PR615_SETIMAGE",
              "params": [],
              "values": [],
              "time": 0,
              "target": "PlayerSelf",
              "players": [
                1
              ],
              "deliverAt": 0,
              "delivered": true
            }
          ],
          "logs": []
        },
        "history": [
          {
            "t": 0,
            "source": "user",
            "kind": "serverSet",
            "payload": {
              "entityType": "PlayerSelf",
              "name": "PR615",
              "value": [
                100002
              ],
              "playerIndex": 1
            }
          },
          {
            "t": 0,
            "source": "user",
            "kind": "serverSet",
            "payload": {
              "entityType": "PlayerSelf",
              "name": "PR615",
              "value": [
                100001
              ],
              "playerIndex": 1
            }
          },
          {
            "t": 0,
            "source": "user",
            "kind": "serverSend",
            "payload": {
              "name": "PR615_SETIMAGE",
              "params": [],
              "target": "PlayerSelf",
              "playerIndex": 1
            }
          }
        ],
        "running": true,
        "serverLogs": [],
        "serverVars": [
          {
            "entityType": "PlayerSelf",
            "entityLabel": "当前玩家",
            "name": "PR615",
            "type": "IntList",
            "value": [
              100001
            ]
          }
        ],
        "clockMode": "manual",
        "audioMuted": true
      }
    },
    {
      "action": "get",
      "result": {
        "canvasId": "pc-16-9",
        "platform": "KEYBOARD",
        "device": "KeyboardAndMouse",
        "canvasWidth": 1600,
        "canvasHeight": 900,
        "canvasPresets": [
          {
            "id": "pc-16-9",
            "label": "PC 1600×900",
            "platform": "KEYBOARD",
            "width": 1600,
            "height": 900
          },
          {
            "id": "pc-21-9",
            "label": "PC 2100×900",
            "platform": "KEYBOARD",
            "width": 2100,
            "height": 900
          },
          {
            "id": "mobile-16-9",
            "label": "手机 1280×720",
            "platform": "TOUCHSCREEN",
            "width": 1280,
            "height": 720
          },
          {
            "id": "mobile-19.5-9",
            "label": "手机 1560×720",
            "platform": "TOUCHSCREEN",
            "width": 1560,
            "height": 720
          },
          {
            "id": "mobile-4-3",
            "label": "手机 1280×960",
            "platform": "TOUCHSCREEN",
            "width": 1280,
            "height": 960
          }
        ],
        "playerCount": 1,
        "viewPlayerIndex": 1,
        "players": [
          {
            "index": 1,
            "label": "玩家1",
            "entityType": "Player1"
          }
        ],
        "time": 0,
        "frame": 0,
        "paused": false,
        "levelTimePaused": false,
        "audio": {
          "sessionId": "c800b556-5663-45b5-80ae-b6e968e6f71f",
          "playerIndex": 1,
          "sequence": 0,
          "revision": 0,
          "active": [],
          "recent": []
        },
        "effects": [],
        "mountError": null,
        "logs": [
          {
            "source": "client",
            "level": "info",
            "text": "dynamic-enum\tnil",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "variable-writer\tnil",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "readonly-write\tfalse\tcannot set imageId, no such field",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "setimage\t100001",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "PR615_API_READY",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "list-observed\t100002\t100001",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "list-observed\t100001\t100001",
            "time": 0
          },
          {
            "source": "client",
            "level": "info",
            "text": "setimage\t100002",
            "time": 0
          }
        ],
        "tree": [],
        "paint": [],
        "scene": null,
        "server": {
          "clock": 0,
          "onlineLatencyMs": 0,
          "playerCount": 1,
          "viewPlayerIndex": 1,
          "logic": {
            "version": 1,
            "rules": []
          },
          "vars": {
            "Level": {},
            "PlayerSelf": {
              "PR615": {
                "type": "IntList",
                "value": [
                  100001
                ]
              }
            },
            "AvatarSelf": {},
            "Player1": {
              "PR615": {
                "type": "IntList",
                "value": [
                  100001
                ]
              }
            },
            "Avatar1": {}
          },
          "inbound": [],
          "outbound": [
            {
              "id": 1,
              "name": "PR615_SETIMAGE",
              "params": [],
              "values": [],
              "time": 0,
              "target": "PlayerSelf",
              "players": [
                1
              ],
              "deliverAt": 0,
              "delivered": true
            }
          ],
          "logs": []
        },
        "history": [
          {
            "t": 0,
            "source": "user",
            "kind": "serverSet",
            "payload": {
              "entityType": "PlayerSelf",
              "name": "PR615",
              "value": [
                100002
              ],
              "playerIndex": 1
            }
          },
          {
            "t": 0,
            "source": "user",
            "kind": "serverSet",
            "payload": {
              "entityType": "PlayerSelf",
              "name": "PR615",
              "value": [
                100001
              ],
              "playerIndex": 1
            }
          },
          {
            "t": 0,
            "source": "user",
            "kind": "serverSend",
            "payload": {
              "name": "PR615_SETIMAGE",
              "params": [],
              "target": "PlayerSelf",
              "playerIndex": 1
            }
          }
        ],
        "running": true,
        "serverLogs": [],
        "serverVars": [
          {
            "entityType": "PlayerSelf",
            "entityLabel": "当前玩家",
            "name": "PR615",
            "type": "IntList",
            "value": [
              100001
            ]
          }
        ],
        "clockMode": "manual",
        "audioMuted": true
      }
    }
  ]
}
```
