<#
用法（仓库根目录，PowerShell）：

  .\scripts\release.ps1 -Version v1.1.2                            # 发布点 = master HEAD
  .\scripts\release.ps1 -Version v1.1.2 -Source abc1234            # 指定发布点 commit
  .\scripts\release.ps1 -Version v1.1.2 -Message "v1.1.2 日历优化" # 自定义版本 commit 信息
  .\scripts\release.ps1 -Version v1.1.2 -DryRun                    # 只预览将被聚合的 commit，不改动

说明：在 release 分支上用 `git merge --no-ff <发布点>` 生成一个版本 merge commit，并打 tag。
      release 与 master 同源，merge-base 随每次发版自动前进，因此可长期重复使用。
      不要用 `--squash`：squash commit 不记录父提交，merge-base 不前进，下次会重复聚合旧改动。
      不会 push 到任何远端。
#>
param(
  [Parameter(Mandatory = $true)][string]$Version,
  [string]$Source = "master",
  [string]$Message,
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
if ($LASTEXITCODE -ne 0) { throw "release 分支不存在，请先初始化：git switch -C release master" }

# 版本号必须与发布点的 package.json 一致
$pkg = (git show "${src}:package.json" | Out-String) | ConvertFrom-Json
if ("v$($pkg.version)" -ne $Version) {
  throw "版本号不一致：参数为 $Version，发布点 $short 的 package.json 为 v$($pkg.version)。请先在 master 上改好版本号并提交。"
}

# ---------- 2. 本次聚合区间 ----------
$baseOut = git merge-base release $src 2>$null
if ($LASTEXITCODE -ne 0) { throw "release 与 $Source 没有共同祖先（不同源），无法按 merge 方式发版" }
$base = "$baseOut".Trim()
if ($base -eq $src) { throw "没有可发布的新提交：$Source 已全部包含在 release 中" }

# ---------- 3. 预览将被聚合的改动 ----------
Write-Host "本次将聚合的改动（$base..$short）：" -ForegroundColor Cyan
git --no-pager log --oneline "$base..$src"

if ($DryRun) {
  Write-Host "`nDryRun：未做任何改动。" -ForegroundColor Yellow
  exit 0
}

# ---------- 4. 生成版本 merge commit ----------
$msg = if ($Message) { $Message } else { "$Version (from $short)" }
$current = (git branch --show-current).Trim()

git switch release
git merge --no-ff -m $msg $src
if ($LASTEXITCODE -ne 0) {
  Write-Host "`n合并失败或存在冲突，release 仍处于合入未完成状态。" -ForegroundColor Red
  Write-Host "解决冲突后 git commit 完成本次发版，或放弃：git merge --abort" -ForegroundColor Red
  exit 1
}
git tag -a $Version -m "$Version"

if ($current -and $current -ne "release") { git switch $current }

Write-Host "`n完成：$Version 已作为 merge commit 写入 release 并打 tag（未 push）。" -ForegroundColor Green
Write-Host "核对：git log --oneline --first-parent release    |     git diff $Version~1 $Version --stat" -ForegroundColor Green
Write-Host "撤销：git switch release; git reset --hard HEAD~1; git tag -d $Version" -ForegroundColor DarkGray
