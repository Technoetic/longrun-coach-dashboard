# ================================================================
# Stylelint Validator Hook
# ================================================================
# 목적: CSS 파일 품질 검증 (구문 오류, 중복, 미사용 속성 등)
# 대상: src/css/*.css
# ================================================================

param(
    [string]$ProjectRoot = $PWD
)

$ErrorActionPreference = "Stop"
$LogFile = Join-Path $ProjectRoot ".claude\hooks\stylelint-validator.log"
$CssDir = Join-Path $ProjectRoot "src\css"

# UTF-8 인코딩 강제
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

# 로그 함수
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Write-Host $logMessage
    Add-Content -Path $LogFile -Value $logMessage
}

# 로그 파일 초기화
if (Test-Path $LogFile) { Clear-Content $LogFile }

Write-Log "=== Stylelint Validator 시작 ===" "INFO"

# ================================================================
# CSS 파일 수집
# ================================================================
$cssFiles = Get-ChildItem -Path $CssDir -Filter "*.css" -ErrorAction SilentlyContinue
if (-not $cssFiles -or $cssFiles.Count -eq 0) {
    Write-Log "CSS 파일을 찾을 수 없습니다: $CssDir" "ERROR"
    exit 1
}

Write-Log "검증 대상: $($cssFiles.Count)개 CSS 파일" "INFO"

$totalErrors = 0
$totalWarnings = 0
$fileResults = @()

foreach ($file in $cssFiles) {
    Write-Log "검증 중: $($file.Name)" "INFO"
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    $lines = Get-Content -Path $file.FullName -Encoding UTF8
    $fileErrors = 0
    $fileWarnings = 0
    $issues = @()

    # ================================================================
    # 1. 중괄호 균형 검사
    # ================================================================
    $openBraces = ([regex]::Matches($content, '\{')).Count
    $closeBraces = ([regex]::Matches($content, '\}')).Count
    if ($openBraces -ne $closeBraces) {
        $issues += "ERROR: 중괄호 불균형 (열림: $openBraces, 닫힘: $closeBraces)"
        $fileErrors++
    }

    # ================================================================
    # 2. 빈 규칙 블록 검사
    # ================================================================
    $emptyRules = [regex]::Matches($content, '[^{]+\{\s*\}')
    foreach ($match in $emptyRules) {
        $selector = $match.Value.Trim() -replace '\{.*', '' | ForEach-Object { $_.Trim() }
        $issues += "WARN: 빈 규칙 블록 - '$selector'"
        $fileWarnings++
    }

    # ================================================================
    # 3. 중복 속성 검사 (같은 블록 내)
    # ================================================================
    $blockPattern = '\{([^}]+)\}'
    $blocks = [regex]::Matches($content, $blockPattern)
    foreach ($block in $blocks) {
        $blockContent = $block.Groups[1].Value
        $properties = [regex]::Matches($blockContent, '(?m)^\s*([\w-]+)\s*:') | ForEach-Object { $_.Groups[1].Value }
        $duplicates = $properties | Group-Object | Where-Object { $_.Count -gt 1 }
        foreach ($dup in $duplicates) {
            $issues += "WARN: 중복 속성 '$($dup.Name)' ($($dup.Count)회)"
            $fileWarnings++
        }
    }

    # ================================================================
    # 4. !important 남용 검사
    # ================================================================
    $importantCount = ([regex]::Matches($content, '!important')).Count
    if ($importantCount -gt 10) {
        $issues += "WARN: !important 과다 사용 ($importantCount 회)"
        $fileWarnings++
    }

    # ================================================================
    # 5. 색상값 일관성 검사 (대소문자 혼용)
    # ================================================================
    $hexColors = [regex]::Matches($content, '#[0-9A-Fa-f]{3,8}\b')
    $mixedCase = $hexColors | Where-Object { $_.Value -cmatch '[A-F]' -and $_.Value -cmatch '[a-f]' }
    foreach ($mc in $mixedCase) {
        $issues += "WARN: 색상값 대소문자 혼용 - '$($mc.Value)'"
        $fileWarnings++
    }

    # ================================================================
    # 6. 구문 오류 검사 - 세미콜론 누락
    # ================================================================
    $lineNum = 0
    foreach ($line in $lines) {
        $lineNum++
        $trimmed = $line.Trim()
        # 속성 선언인데 세미콜론이 없는 경우 (블록 닫기/열기/주석/빈줄 제외)
        if ($trimmed -match '^[\w-]+\s*:' -and $trimmed -notmatch ';\s*$' -and $trimmed -notmatch '\{' -and $trimmed -notmatch '^\s*/') {
            # 다음 줄이 }가 아닌지 확인 (마지막 속성은 세미콜론 생략 가능하지만 권장하지 않음)
            $issues += "WARN: 세미콜론 누락 가능 (line $lineNum): $trimmed"
            $fileWarnings++
        }
    }

    # ================================================================
    # 7. 0px → 0 권장 검사
    # ================================================================
    $zeroPx = [regex]::Matches($content, '\b0px\b')
    if ($zeroPx.Count -gt 0) {
        $issues += "WARN: '0px' → '0' 권장 ($($zeroPx.Count)건)"
        $fileWarnings++
    }

    # 결과 집계
    $totalErrors += $fileErrors
    $totalWarnings += $fileWarnings

    $status = if ($fileErrors -gt 0) { "FAIL" } elseif ($fileWarnings -gt 0) { "WARN" } else { "PASS" }
    $fileResults += @{
        Name = $file.Name
        Status = $status
        Errors = $fileErrors
        Warnings = $fileWarnings
        Issues = $issues
    }

    Write-Log "$($file.Name): $status (오류: $fileErrors, 경고: $fileWarnings)" "INFO"
}

# ================================================================
# 결과 출력
# ================================================================
Write-Log "" "INFO"
Write-Log "=== 검증 결과 요약 ===" "INFO"
Write-Log "총 파일: $($cssFiles.Count)" "INFO"
Write-Log "총 오류: $totalErrors" "INFO"
Write-Log "총 경고: $totalWarnings" "INFO"

foreach ($result in $fileResults) {
    Write-Log "  $($result.Name): $($result.Status)" "INFO"
    foreach ($issue in $result.Issues) {
        Write-Log "    - $issue" "INFO"
    }
}

Write-Log "=== Stylelint Validator 완료 ===" "INFO"

if ($totalErrors -gt 0) {
    Write-Log "CSS 검증 실패: $totalErrors 건의 오류 발견" "ERROR"
    exit 1
} else {
    Write-Log "CSS 검증 통과 (경고: $totalWarnings 건)" "INFO"
    exit 0
}
