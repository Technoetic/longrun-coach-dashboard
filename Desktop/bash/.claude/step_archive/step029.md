# Step 29 - 인코딩 규칙 (모지바케 방지)

코드 작성 시 반드시 아래 인코딩 규칙을 준수하여 한글 문자 깨짐(모지바케)을 방지한다.

## 필수 규칙

1. **모든 텍스트 파일은 UTF-8 (BOM 없음)으로 저장**
   - BOM(Byte Order Mark) 포함 시 일부 도구에서 파싱 오류 발생
   - PowerShell Set-Content 사용 시 `-Encoding UTF8` 명시

2. **줄바꿈은 LF(`\n`)만 사용 (CRLF 금지)**
   - Windows 기본값 CRLF(`\r\n`)는 diff 노이즈와 쉘 오류 유발
   - `.editorconfig`, `.gitattributes`에 `* text=auto eol=lf` 설정

3. **PowerShell 출력 시 인코딩 명시**
   ```powershell
   [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
   $OutputEncoding = [System.Text.Encoding]::UTF8
   ```

4. **파일 Write 도구 사용 시 한글 포함 내용은 UTF-8로 직접 작성**
   - Bash의 `echo` 리다이렉션 금지 (인코딩 불일치 위험)
   - 반드시 Write 도구 사용

5. **검증**
   - `.claude/hooks/research-validator.ps1`에서 BOM/CRLF 자동 검사

---

이 지침을 완료한 즉시 자동으로 step030.md를 읽고 수행한다. 사용자 확인을 기다리지 않는다.
