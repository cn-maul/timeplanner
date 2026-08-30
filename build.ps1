# ---------------------------------------------------------------------------
#  时间规划助手 - 一键构建脚本
#
#  用法示例：
#    .\build.ps1                    # 完整构建（前端 + 后端）
#    .\build.ps1 -Run               # 构建完成后立即启动服务
#    .\build.ps1 -Run -NoOpen       # 启动但不自动打开浏览器
#    .\build.ps1 -SkipFrontend      # 前端未改动时只重编后端（要求 web/dist 已存在）
#    .\build.ps1 -SkipBackend       # 只构建前端
#    .\build.ps1 -Clean             # 构建前清理 web/dist 与旧 exe
#    .\build.ps1 -Output plan.exe   # 自定义输出文件名
#
#  兼容 Windows PowerShell 5.1 及 PowerShell 7+。
# ---------------------------------------------------------------------------
#Requires -Version 5.1
param(
    [switch]$SkipFrontend,
    [switch]$SkipBackend,
    [switch]$Run,
    [switch]$NoOpen,
    [switch]$Clean,
    [string]$Output = 'timeplanner.exe'
)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

function Write-Step([string]$Message) { Write-Host "==> $Message" -ForegroundColor Cyan }
function Write-Ok([string]$Message)   { Write-Host "    $Message" -ForegroundColor Green }

function Assert-LastExit([string]$What) {
    if ($LASTEXITCODE -ne 0) {
        throw "$What 失败（退出码 $LASTEXITCODE）"
    }
}

function Assert-Command([string]$Name, [string]$Hint) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "未找到命令 $Name。$Hint"
    }
}

if ($Clean) {
    Write-Step '清理构建产物'
    foreach ($p in @((Join-Path $PSScriptRoot $Output), (Join-Path $PSScriptRoot 'web/dist'))) {
        if (Test-Path $p) {
            Remove-Item -Recurse -Force $p
            Write-Ok "已删除 $p"
        }
    }
}

# ---------- 前端 ----------
if (-not $SkipFrontend) {
    Assert-Command 'node' '请先安装 Node.js（>= 20）：https://nodejs.org/'
    Assert-Command 'npm'  'npm 不在 PATH 中，请确认 Node.js 安装完整'

    Write-Step '构建前端（frontend -> web/dist）'
    Push-Location (Join-Path $PSScriptRoot 'frontend')
    try {
        if (-not (Test-Path 'node_modules')) {
            Write-Host '    首次构建，安装依赖（可能需要几分钟）…'
            npm install --no-fund --no-audit
            Assert-LastExit 'npm install'
        }
        npm run build
        Assert-LastExit 'npm run build'
    }
    finally {
        Pop-Location
    }

    if (-not (Test-Path (Join-Path $PSScriptRoot 'web/dist/index.html'))) {
        throw '前端构建后仍未找到 web/dist/index.html，请检查上方构建日志'
    }
}

# ---------- 后端 ----------
if (-not $SkipBackend) {
    if (-not (Test-Path (Join-Path $PSScriptRoot 'web/dist/index.html'))) {
        throw 'web/dist/index.html 不存在。请先构建前端（去掉 -SkipFrontend，或在 frontend 目录执行 npm run build）'
    }
    Assert-Command 'go' '请先安装 Go（>= 1.27）：https://go.dev/dl/'

    Write-Step '编译后端（内嵌前端产物）'
    go build -o $Output .
    Assert-LastExit 'go build'
}

if (-not (Test-Path $Output)) {
    throw "构建产物 $Output 不存在（是否同时使用了 -SkipFrontend 与 -SkipBackend？）"
}
$size = '{0:N1} MB' -f ((Get-Item $Output).Length / 1MB)
Write-Host ''
Write-Host "构建完成：$Output（$size）" -ForegroundColor Green
Write-Host '运行方式：双击启动，或命令行执行；浏览器访问 http://127.0.0.1:7777'

# ---------- 可选：立即启动 ----------
if ($Run) {
    Write-Step '启动服务（Ctrl+C 停止）'
    $exeArgs = @()
    if ($NoOpen) { $exeArgs += '-no-open' }
    & (Join-Path $PSScriptRoot $Output) @exeArgs
}
