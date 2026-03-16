# tool-result hook
# 1. Read 도구로 Step 파일 읽은 후 자동 진행 리마인더
# 2. HTML 파일 수정 시 자동 Playwright 인터랙션 테스트
# 3. Step 결과 파일 Write 시 해당 validator 자동 실행

param(
    [string]$ProjectRoot = $PWD,
    [string]$ToolName = "",
    [string]$FilePath = ""
)

$ErrorActionPreference = "Stop"

# ================================================================
# 1. Step 파일 읽기 리마인더
# ================================================================
if ($ToolName -eq "Read") {
    if ($FilePath -match "step_archive[/\\]step(\d+)\.md") {
        $stepNum = [int]$matches[1]
        $nextStep = $stepNum + 1

        # Step 파일 총 개수 동적 감지
        $stepDir = Join-Path $ProjectRoot ".claude\step_archive"
        $totalSteps = 63
        if (Test-Path $stepDir) {
            $stepFiles = Get-ChildItem -Path $stepDir -Filter "step*.md" -ErrorAction SilentlyContinue
            if ($stepFiles.Count -gt 0) { $totalSteps = $stepFiles.Count }
        }

        if ($nextStep -le $totalSteps) {
            $message = @"

Step $stepNum 읽기 완료 -> 즉시 Step $nextStep 수행

"@
            Write-Output $message
        }
        elseif ($stepNum -eq $totalSteps) {
            $message = @"

Step $totalSteps/$totalSteps 완료 - 전체 작업 종료
최종 보고를 작성합니다.

"@
            Write-Output $message
        }
    }
}

# ================================================================
# 2. Write/Edit 시 자동 검증
# ================================================================
if ($ToolName -eq "Write" -or $ToolName -eq "Edit") {

    # --------------------------------------------------------------
    # 2a. Step 결과 파일 → validator 자동 실행
    # --------------------------------------------------------------
    $validatorMap = @{
        "step02_playwright"       = "playwright-validator.ps1"
        "step03_axe_core"         = "axe-core-validator.ps1"
        "step04_조사결과"         = "research-chunk-validator.ps1"
        "step05_조사결과"         = "research-chunk-validator.ps1"
        "step06_조사결과"         = "research-chunk-validator.ps1"
        "step07_조사결과"         = "research-chunk-validator.ps1"
        "step23_리팩토링"         = "refactoring-validator.ps1"
    }

    # 청크 파일 공통 검증 (research-validator)
    $chunkPatterns = @(
        "step01_", "step04_", "step05_", "step06_", "step07_", "step08_",
        "step09_", "step10_", "step18_", "step19_", "step21_", "step23_",
        "step24_", "step25_", "step26_", "step27_", "step28_", "step29_",
        "step30_", "step31_", "step32_", "step33_", "step34_", "step36_",
        "step38_", "step52_", "step57_", "step58_", "step59_"
    )

    if ($FilePath -match '[/\\]\.claude[/\\](step\d+_.+?)_chunk\d+\.md$' -or
        $FilePath -match '[/\\]\.claude[/\\](step\d+_.+?)\.md$') {

        $fileBase = $matches[1]

        # 청크 파일이면 research-validator 실행
        $isChunk = $FilePath -match '_chunk\d+\.md$'
        if ($isChunk) {
            foreach ($pattern in $chunkPatterns) {
                if ($fileBase.StartsWith($pattern)) {
                    $researchValidator = Join-Path $PSScriptRoot "research-validator.ps1"
                    if (Test-Path $researchValidator) {
                        Write-Output "`n[AUTO] 청크 검증: research-validator.ps1"
                        & powershell -ExecutionPolicy Bypass -File $researchValidator -FilePath $FilePath 2>&1 | Out-String | Write-Output
                        if ($LASTEXITCODE -ne 0) {
                            Write-Output "[AUTO] 청크 검증 실패 - 수정 필요"
                        }
                    }
                    break
                }
            }
        }

        # Step별 전용 validator 실행
        foreach ($key in $validatorMap.Keys) {
            if ($fileBase -match $key) {
                $validatorScript = Join-Path $PSScriptRoot $validatorMap[$key]
                if (Test-Path $validatorScript) {
                    Write-Output "`n[AUTO] Step 검증: $($validatorMap[$key])"
                    & powershell -ExecutionPolicy Bypass -File $validatorScript -ProjectRoot $ProjectRoot 2>&1 | Out-String | Write-Output
                    if ($LASTEXITCODE -ne 0) {
                        Write-Output "[AUTO] Step 검증 실패 - 수정 필요"
                    } else {
                        Write-Output "[AUTO] Step 검증 통과"
                    }
                }
                break
            }
        }
    }

    # --------------------------------------------------------------
    # 2b-0. Python 파일 수정 시 자동 구문 검증
    # --------------------------------------------------------------
    if ($FilePath -match '\.py$' -and $FilePath -notmatch 'node_modules') {
        $pyChecker = Join-Path $PSScriptRoot "python-syntax-check.ps1"
        if (Test-Path $pyChecker) {
            & powershell -ExecutionPolicy Bypass -File $pyChecker -ProjectRoot $ProjectRoot -FilePath $FilePath 2>&1 | Out-String | Write-Output
        }
    }

    # --------------------------------------------------------------
    # 2b-1. Step 파일 수정 시 번호 갭 검증
    # --------------------------------------------------------------
    if ($FilePath -match 'step_archive') {
        $gapChecker = Join-Path $PSScriptRoot "step-gap-checker.ps1"
        if (Test-Path $gapChecker) {
            & powershell -ExecutionPolicy Bypass -File $gapChecker -ProjectRoot $ProjectRoot -FilePath $FilePath 2>&1 | Out-String | Write-Output
        }
    }

    # --------------------------------------------------------------
    # 2b. src/*.js 수정 시 구문 검증 + import 경로 확인
    # --------------------------------------------------------------
    if ($FilePath -match '[/\\]src[/\\].*\.js$') {
        # 구문 검증
        $syntaxChecker = Join-Path $PSScriptRoot "src-lint-on-save.ps1"
        if (Test-Path $syntaxChecker) {
            & powershell -ExecutionPolicy Bypass -File $syntaxChecker -ProjectRoot $ProjectRoot -FilePath $FilePath 2>&1 | Out-String | Write-Output
        }

        # import/require 경로 확인
        $importResolver = Join-Path $PSScriptRoot "import-resolver.ps1"
        if (Test-Path $importResolver) {
            & powershell -ExecutionPolicy Bypass -File $importResolver -ProjectRoot $ProjectRoot -FilePath $FilePath 2>&1 | Out-String | Write-Output
        }
    }

    # --------------------------------------------------------------
    # 2c. src/ 소스 코드 수정 시 자동 번들링 + 콘솔 에러 체크
    # --------------------------------------------------------------
    if ($FilePath -match '[/\\]src[/\\].*\.(js|ts|jsx|tsx|css|html)$') {
        $bundler = Join-Path $PSScriptRoot "html-bundler.ps1"
        $srcIndex = Join-Path $ProjectRoot "src\index.html"
        if ((Test-Path $bundler) -and (Test-Path $srcIndex)) {
            Write-Output "`n[AUTO] HTML 번들링: html-bundler.ps1"
            & powershell -ExecutionPolicy Bypass -File $bundler 2>&1 | Out-String | Write-Output

            # 번들링 성공 후 콘솔 에러 체크
            if ($LASTEXITCODE -eq 0) {
                $consoleChecker = Join-Path $PSScriptRoot "console-error-checker.ps1"
                if (Test-Path $consoleChecker) {
                    & powershell -ExecutionPolicy Bypass -File $consoleChecker -ProjectRoot $ProjectRoot 2>&1 | Out-String | Write-Output
                }
            }
        }
    }

    # --------------------------------------------------------------
    # 2d. src/ 수정 시 빌드 + 테스트 검증 (exit 1로 블로킹)
    #     번들링(2c) 이후 실행 → 빌드/테스트 실패 시 Claude 진행 차단
    # --------------------------------------------------------------
    if ($FilePath -match '[/\\]src[/\\].*\.(js|ts|jsx|tsx|css|html)$') {
        $buildTestValidator = Join-Path $PSScriptRoot "build-test-validator.ps1"
        if (Test-Path $buildTestValidator) {
            & powershell -ExecutionPolicy Bypass -File $buildTestValidator -ProjectRoot $ProjectRoot -FilePath $FilePath 2>&1 | Out-String | Write-Output
            if ($LASTEXITCODE -ne 0) {
                Write-Output "[BLOCKED] 빌드/테스트 실패 - 수정 필요"
                exit 1
            }
        }
    }

    # --------------------------------------------------------------
    # 2e. HTML 파일 수정 시 자동 인터랙션 테스트 + 자동 수정 루프
    # --------------------------------------------------------------
    if ($FilePath -match '\.html?$' -and $FilePath -and (Test-Path $FilePath)) {
        Write-Output "`nHTML 파일 수정 감지: $FilePath"
        Write-Output "Playwright 인터랙션 테스트 + 자동 수정 루프 시작...`n"

        $autoFixScript = Join-Path $PSScriptRoot "html-auto-fix-loop.ps1"

        if (Test-Path $autoFixScript) {
            & powershell -File $autoFixScript -HtmlFilePath $FilePath

            $exitCode = $LASTEXITCODE

            if ($exitCode -eq 0) {
                Write-Output "`nHTML 인터랙션 테스트 통과!"
                Write-Output "스크린샷 저장 완료`n"
            } elseif ($exitCode -eq 2) {
                Write-Output "`nClaude의 수정을 기다리는 중..."
                Write-Output "파일을 수정하면 자동으로 재테스트됩니다.`n"
            }
        } else {
            Write-Output "자동 수정 스크립트를 찾을 수 없습니다: $autoFixScript"
        }
    }
}

exit 0
