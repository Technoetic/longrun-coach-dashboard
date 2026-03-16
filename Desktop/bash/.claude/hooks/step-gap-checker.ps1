# step-gap-checker.ps1
# Step 파일 번호 변경/추가/삭제 후 순차 번호 갭 자동 검증

param(
    [string]$ProjectRoot = $PWD,
    [string]$FilePath = ""
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# step_archive 내 파일 수정 시에만 실행
if ($FilePath -notmatch 'step_archive') { exit 0 }

$stepDir = Join-Path $ProjectRoot ".claude\step_archive"
if (-not (Test-Path $stepDir)) { exit 0 }

$stepFiles = Get-ChildItem -Path $stepDir -Filter "step*.md" -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^step(\d+)\.md$' } |
    ForEach-Object { [int]($_.Name -replace '^step(\d+)\.md$', '$1') } |
    Sort-Object

if ($stepFiles.Count -eq 0) { exit 0 }

$gaps = @()
$prev = $stepFiles[0]

for ($i = 1; $i -lt $stepFiles.Count; $i++) {
    $curr = $stepFiles[$i]
    if ($curr -ne ($prev + 1)) {
        for ($missing = $prev + 1; $missing -lt $curr; $missing++) {
            $gaps += $missing
        }
    }
    $prev = $curr
}

if ($gaps.Count -gt 0) {
    Write-Output ""
    Write-Output "[STEP GAP] 누락된 Step 번호: $($gaps -join ', ')"
    Write-Output "[STEP GAP] 총 $($stepFiles.Count)개 파일, 범위: step$($stepFiles[0])~step$($stepFiles[-1])"
    Write-Output "[STEP GAP] 번호 갭을 수정하세요."
    Write-Output ""
    exit 1
}

exit 0
