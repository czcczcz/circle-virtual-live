param([int]$Port = 5173, [switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $projectRoot
$liveUrl = "http://localhost:$Port"
$healthUrl = "http://127.0.0.1:$Port"
function Get-LiveHealth {
  try { return Invoke-RestMethod -Uri "$healthUrl/__circle_health" -TimeoutSec 2 } catch { return $null }
}
try {
  $existing = Get-LiveHealth
  if ($existing -and $existing.app -eq 'circle-virtual-live' -and $existing.root -eq $projectRoot) {
    Write-Host "CiRCLE 已就绪：$liveUrl"
    if (-not $NoBrowser) { Start-Process -FilePath $liveUrl -WindowStyle Normal }
    exit 0
  }
  $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
  if (-not $nodeCommand) { throw '未找到 Node.js。请安装 Node.js 22.12 或更高版本，再次双击启动文件。' }
  $viteFile = Join-Path $projectRoot 'node_modules\vite\bin\vite.js'
  if (-not (Test-Path -LiteralPath $viteFile)) {
    Write-Host '正在安装项目依赖（仅首次启动需要）…'
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) { throw '依赖安装失败，请在项目目录运行 npm install 后重试。' }
  }
  $logs = Join-Path $projectRoot '.live'
  New-Item -ItemType Directory -Path $logs -Force | Out-Null
  $process = Start-Process -FilePath $nodeCommand.Source -ArgumentList @(('"' + $viteFile + '"'), '--host', '127.0.0.1', '--port', $Port, '--strictPort') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logs 'server.log') -RedirectStandardError (Join-Path $logs 'error.log')
  Set-Content -LiteralPath (Join-Path $logs 'server.pid') -Value $process.Id
  for ($attempt = 0; $attempt -lt 40; $attempt++) {
    Start-Sleep -Milliseconds 250
    $health = Get-LiveHealth
    if ($health -and $health.app -eq 'circle-virtual-live' -and $health.root -eq $projectRoot) {
      Write-Host "CiRCLE 已就绪：$liveUrl"
      if (-not $NoBrowser) { Start-Process -FilePath $liveUrl -WindowStyle Normal }
      exit 0
    }
    if ($process.HasExited) { throw "服务启动失败，端口 $Port 可能被占用。请查看 .live\error.log。" }
  }
  throw '服务未能及时就绪，请查看 .live/server.log 与 .live/error.log。'
} catch { Write-Host $_.Exception.Message -ForegroundColor Red; exit 1 }
