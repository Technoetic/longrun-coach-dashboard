# python-syntax-check.ps1
# .py 파일 수정 시 자동 구문 검증 (py_compile)

param(
    [string]$ProjectRoot = $PWD,
    [string]$FilePath = ""
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

if (-not $FilePath -or -not (Test-Path $FilePath)) { exit 0 }
if ($FilePath -notmatch '\.py$') { exit 0 }

# node_modules 내부 파일 무시
if ($FilePath -match 'node_modules') { exit 0 }

$output = python -m py_compile $FilePath 2>&1 | Out-String

if ($LASTEXITCODE -ne 0) {
    Write-Output ""
    Write-Output "[SYNTAX ERROR] $FilePath"
    Write-Output $output.Trim()
    Write-Output ""
    exit 1
}

exit 0
