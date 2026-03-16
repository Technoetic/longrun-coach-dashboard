# build-test-validator.ps1
# src/ 소스 수정 후 빌드 + 단위 테스트 자동 검증
# exit 1 시 Claude 도구 호출 차단 → 수정 강제

param(
    [string]$ProjectRoot = $PWD,
    [string]$FilePath = ""
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

# src/ 하위 파일만 대상
if ($FilePath -notmatch '[/\\]src[/\\]') { exit 0 }

# ================================================================
# 1. Vite 빌드 검증
# ================================================================
Write-Output ""
Write-Output "[BUILD] vite build 실행 중..."

$buildOutput = & npx vite build --logLevel error 2>&1 | Out-String
$buildExit = $LASTEXITCODE

if ($buildExit -ne 0) {
    Write-Output "[BUILD FAIL] vite build 실패"
    Write-Output $buildOutput.Trim()
    Write-Output ""
    Write-Output "[ACTION] 빌드 에러를 수정하세요."
    exit 1
}

Write-Output "[BUILD OK] vite build 성공"

# ================================================================
# 2. Vitest 단위 테스트 검증
# ================================================================
$testDir = Join-Path $ProjectRoot "tests"
$hasTests = (Test-Path $testDir) -and ((Get-ChildItem -Path $testDir -Filter "*.test.*" -ErrorAction SilentlyContinue).Count -gt 0)

if ($hasTests) {
    Write-Output "[TEST] vitest run 실행 중..."

    $testOutput = & npx vitest run --reporter=verbose 2>&1 | Out-String
    $testExit = $LASTEXITCODE

    if ($testExit -ne 0) {
        Write-Output "[TEST FAIL] vitest 실패"
        # 마지막 30줄만 출력 (핵심 에러)
        $lines = $testOutput.Trim() -split "`n"
        $tail = if ($lines.Count -gt 30) { $lines[-30..-1] } else { $lines }
        Write-Output ($tail -join "`n")
        Write-Output ""
        Write-Output "[ACTION] 테스트 실패를 수정하세요."
        exit 1
    }

    Write-Output "[TEST OK] vitest 전체 통과"
}

Write-Output ""
exit 0
