<#
用法（仓库根目录，PowerShell）：

  .\scripts\release.ps1 -Version v1.1.2                            # 发布点 = master HEAD
  .\scripts\release.ps1 -Version v1.1.2 -Source abc1234            # 指定发布点 commit
  .\scripts\release.ps1 -Version v1.1.2 -Message "v1.1.2 日历优化" # 自定义版本 commit 信息
  .\scripts\release.ps1 -Version v1.1.2 -Edit                      # 打开编辑器写 commit 信息
  .\scripts\release.ps1 -Version v1.1.2 -Base abc1234              # 显式指定上一发布点（自动解析失败时用）
  .\scripts\release.ps1 -Version v1.1.2 -DryRun                    # 只预览将被聚合的 commit 清单，不改动

说明：release 是独立历史的**快照分支**，每个 commit = 一个已发布版本的完整树。
      发版 = 用发布点的整棵树生成一个 commit，因此相邻两版 diff 就是本版全部改动（squash 效果）。
      不要改成 `git merge --squash` / `merge --no-ff`：前者 merge-base 不前进会重复聚合，后者会把
      master 的提交历史带进 release，破坏"一版一 commit"。
      不会 push 到任何远端。
#>
param(
  [Parameter(Mandatory = $true)][string]$Version,
  [string]$Source = "master",
  [string]$Message,
  [string]$Base,
  [switch]$Edit,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
# 让原生命令的非零退出不直接中断，改为手动检查 $LASTEXITCODE（兼容 PS 7.3+）
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
  $PSNativeCommandUseErrorActionPreference = $false
}

# ---------- 1. 前置检查 ----------
$dirty = git status --porcelain --untracked-files=no
if ($dirty) { throw "工作区有未提交的已跟踪改动，请先提交或暂存：`n$dirty" }

git rev-parse --verify --quiet $Source 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { throw "找不到发布点：$Source" }
$src = (git rev-parse $Source).Trim()
$short = $src.Substring(0, 7)

git rev-parse --verify --quiet "refs/tags/$Version" 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) { throw "tag $Version 已存在" }

git rev-parse --verify --quiet release 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "release 分支不存在，请先初始化：git switch --orphan release; git read-tree --reset -u $short; git commit -m '$Version (from $short)'; git tag -a $Version -m '$Version (from $short)'"
}

# 版本号必须与发布点的 package.json 一致
$pkg = (git show "${src}:package.json" | Out-String) | ConvertFrom-Json
if ("v$($pkg.version)" -ne $Version) {
  throw "版本号不一致：参数为 $Version，发布点 $short 的 package.json 为 v$($pkg.version)。请先在 master 上改好版本号并提交。"
}

$headTree = (git rev-parse "release^{tree}").Trim()
if ((git rev-parse "$src^{tree}").Trim() -eq $headTree) {
  throw "发布点 $short 的内容与 release 当前版本完全一致，无需发版"
}

# ---------- 2. 上一发布点（只用于预览聚合区间） ----------
$base = $null
if ($Base) {
  git rev-parse --verify --quiet "$Base^{commit}" 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "找不到上一发布点：$Base" }
  $base = (git rev-parse "$Base^{commit}").Trim()
}
else {
  # 优先从 release 上一条 commit 信息里的 "(from xxxxxxx)" 读取
  $lastMsg = (git log -1 --format=%s release).Trim()
  if ($lastMsg -match '\(from ([0-9a-fA-F]{7,40})\)') {
    $cand = $Matches[1]
    git rev-parse --verify --quiet "$cand^{commit}" 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $base = (git rev-parse "$cand^{commit}").Trim() }
  }
  # 兜底：在发布点历史里找树与 release HEAD 相同的 commit
  if (-not $base) {
    $hit = git log $Source --format="%H %T" | Where-Object { ($_ -split '\s+')[1] -eq $headTree } | Select-Object -First 1
    if ($hit) { $base = ($hit -split '\s+')[0] }
  }
}

# ---------- 3. 预览将被聚合的改动 ----------
if ($base) {
  Write-Host "本次将聚合的改动（$($base.Substring(0, 7))..$short）：" -ForegroundColor Cyan
  git --no-pager log --oneline "$base..$src"
}
else {
  Write-Host "无法确定上一发布点，跳过区间预览（可用 -Base 指定）。" -ForegroundColor Yellow
}

if ($DryRun) {
  Write-Host "`nDryRun：未做任何改动。" -ForegroundColor Yellow
  exit 0
}

# ---------- 4. 生成版本快照 commit ----------
$msg = if ($Message) { $Message } else { "$Version (from $short)" }
$current = (git branch --show-current).Trim()

git switch release
git read-tree --reset -u $src
if ($Edit) { git commit -m $msg -e } else { git commit -m $msg }
if ($LASTEXITCODE -ne 0) {
  Write-Host "`n生成版本 commit 失败。release 工作区已是 $short 的内容，可执行 git reset --hard HEAD 还原。" -ForegroundColor Red
  exit 1
}
git tag -a $Version -m $msg

if ($current -and $current -ne "release") { git switch $current }

Write-Host "`n完成：$Version 已作为快照 commit 写入 release 并打 tag（未 push）。" -ForegroundColor Green
Write-Host "核对：git log --oneline release    |     git diff ${Version}~1 $Version --stat" -ForegroundColor Green
Write-Host "撤销：git switch release; git reset --hard HEAD~1; git tag -d $Version" -ForegroundColor DarkGray
