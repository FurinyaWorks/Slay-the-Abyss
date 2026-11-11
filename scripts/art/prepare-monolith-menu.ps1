param(
 [string]$RepoRoot=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path,
 [string]$McpCli='D:\MiliastraTools\genshin-miliastra-mcp\scripts\dev\mcp_cli.mjs',
 [string]$OutDir=(Join-Path $RepoRoot 'build/monolith-menu-native')
)
$ErrorActionPreference='Stop'
Push-Location $RepoRoot
try {
 node docs/art/monolith-menu-native/verify-monolith-scene.mjs
 if($LASTEXITCODE -ne 0){throw 'Scene validation failed'}
 node --test docs/art/monolith-menu-native/test-monolith-overlay.mjs
 if($LASTEXITCODE -ne 0){throw 'Menu overlay tests failed'}
 if(!(Test-Path $McpCli)){throw "Missing local Miliastra MCP CLI: $McpCli"}
 New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
 $env:MILIASTRA_ALLOW_LIVE_WRITE='0'
 node $McpCli call scene_build_blocks docs/art/monolith-menu-native/scene-monolith-menu.json (Join-Path $OutDir 'scene')
 if($LASTEXITCODE -ne 0){throw 'scene_build_blocks failed'}
 node scripts/build-ui.mjs (Join-Path $OutDir 'ui') --monolith-menu
 if($LASTEXITCODE -ne 0){throw 'menu UI generation failed'}
 Write-Host 'Generated isolated scene asset + UI layout. Not imported, not merged into a live GIL; camera + lifecycle still need test.'
}finally{Pop-Location}
