<#
用法（仓库根目录，PowerShell）：

  .\scripts\release.ps1 -Version v0.2.0                 # 发布点 = master HEAD
  .\scripts\release.ps1 -Version v0.2.0 -Source abc1234 # 指定发布点 commit
  .\scripts\release.ps1 -Version v0.2.0 -DryRun         # 只预览将被聚合的改动，不写任何东西

说明：把发布点的整棵树写入 release 分支，形成一个版本 commit 并打 tag。
      不会 push 到任何远端。
#>
param(
  [Parameter(Mandatory = $true)][string]$Version,
  [string]$Source = "master",
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

# ---------- 1. 前置检查 ----------
$dirty = git status --porcelain
if ($dirty) { throw "工作区不干净，请先提交或暂存改动：`n$dirty" }

git rev-parse --verify --quiet $Source 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { throw "找不到发布点：$Source" }
$src = (git rev-parse $Source).Trim()
$short = $src.Substring(0, 7)

git rev-parse --verify --quiet "refs/tags/$Version" 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) { throw "tag $Version 已存在" }

git rev-parse --verify --quiet release 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "release 分支不存在，请先初始化：git switch --orphan release; git read-tree --reset -u <首个版本commit>; git commit -m 'release: v0.1.1 (from <短hash>)'; git tag -a v0.1.1 -m v0.1.1"
}

# ---------- 2. 上一个版本的源 commit ----------
# 从 release 分支最后一条 commit message 里的 "(from xxxxxxx)" 提取
$prev = $null
$lastMsg = (git log -1 --format=%s release).Trim()
if ($lastMsg -match '\(from ([0-9a-f]+)\)') { $prev = $Matches[1] }

# ---------- 3. 预览将被聚合的改动 ----------
if ($prev) {
  Write-Host "本次将聚合的改动（$prev..$short）：" -ForegroundColor Cyan
  git --no-pager log --oneline "$prev..$src"
}
else {
  Write-Host "release 分支上还没有版本 commit，将创建第一个版本。" -ForegroundColor Yellow
}

if ($DryRun) {
  Write-Host "`nDryRun：未做任何改动。" -ForegroundColor Yellow
  exit 0
}

# ---------- 4. 生成版本 commit ----------
$current = (git branch --show-current).Trim()

git switch release
git read-tree --reset -u $src
git commit -m "release: $Version (from $short)"
git tag -a $Version -m "release $Version"

if ($current) { git switch $current }

Write-Host "`n完成：$Version 已写入 release 分支并打 tag（未 push）。" -ForegroundColor Green
Write-Host "核对：git log --oneline release    |    git diff <上一版本tag> $Version --stat" -ForegroundColor Green
Write-Host "撤销：git switch release; git reset --hard HEAD~1; git tag -d $Version" -ForegroundColor DarkGray
