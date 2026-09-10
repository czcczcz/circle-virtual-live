$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$pidFile = Join-Path $projectRoot '.live\server.pid'
if (-not (Test-Path -LiteralPath $pidFile)) { Write-Host '未记录由启动器创建的服务。手动启动的服务请在原终端关闭。'; exit 0 }
$liveProcessId = [int](Get-Content -LiteralPath $pidFile)
$process = Get-CimInstance Win32_Process -Filter "ProcessId = $liveProcessId"
$expectedVite = Join-Path $projectRoot 'node_modules\vite\bin\vite.js'
if (-not $process) { Write-Host '服务已经停止。'; exit 0 }
# PID reuse must never stop another application's process.
if ($process.Name -ne 'node.exe' -or -not $process.CommandLine.Contains($expectedVite)) { throw '该进程不属于此项目，未停止任何程序。' }
Stop-Process -Id $liveProcessId
Remove-Item -LiteralPath $pidFile
Write-Host 'CiRCLE 服务已停止。'
