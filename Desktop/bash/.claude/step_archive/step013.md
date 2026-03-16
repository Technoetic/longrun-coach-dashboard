# Step 13 - 전체 조사

합리적인 선에서 최대한 많은 서브에이전트를 병렬로 사용해 오직 조사만을 수행한다.

## 🚨 절대 규칙: 웹 데이터 수집

**다음 도구 사용 절대 금지:**

- ❌ WebFetch 도구 (자동 차단 불가 - 수동 준수 필수)
- ❌ WebSearch 도구 (자동 차단 불가 - 수동 준수 필수)
- ❌ 사전 지식만으로 문서 작성

**반드시 Playwright로만 웹 데이터 수집:**

### 실행 방법

**1단계: 각 URL마다 Playwright 스크립트 실행**

각 서브에이전트에게 다음 템플릿으로 조사 지시:

```javascript
// playwright-research-[N].js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // URL 방문
  await page.goto('${TARGET_URL}');

  // 스크린샷 저장
  await page.screenshot({
    path: '.claude/screenshots/research-${N}.png',
    fullPage: true
  });

  // 텍스트 콘텐츠 추출
  const content = await page.evaluate(() => {
    return document.body.innerText;
  });

  // 결과 저장
  const fs = require('fs');
  fs.writeFileSync(
    '.claude/research-raw-${N}.txt',
    content,
    'utf8'
  );

  await browser.close();
})();
```

**2단계: Bash 도구로 Playwright 실행**

```bash
node playwright-research-1.js
node playwright-research-2.js
node playwright-research-3.js
...
```

**3단계: 수집된 데이터 분석 및 문서화**

`.claude/research-raw-*.txt` 파일들을 읽고 step013_조사결과_chunk*.md로 정리

---

## tokei 코드 규모 베이스라인

조사 시작 전 `tokei src/ --output json > .claude/tokei-baseline.json` 실행하여 현재 프로젝트의 코드/주석/공백 라인 수를 기록한다. 이 베이스라인을 이후 리팩토링/최적화/Dead Code 단계에서 비교 기준으로 사용한다.

## ⚠️ 검증 체크리스트

**스크린샷과 원본 데이터가 없으면 조사 무효!**

### 🔧 자동 검증 스크립트

**Step 13 완료 후 실행:**

```powershell
# 전체 검증 (스크린샷, 원본 데이터, Playwright 스크립트)
.\.claude\hooks\step03-validator.ps1
```

**각 조사결과 청크 검증:**

```powershell
# 단일 파일 검증
.\.claude\hooks\research-chunk-validator.ps1 -FilePath "step013_조사결과_chunk1.md"

# 모든 청크 일괄 검증
Get-ChildItem "step013_조사결과_chunk*.md" | ForEach-Object {
    .\.claude\hooks\research-chunk-validator.ps1 -FilePath $_.FullName
}
```

## ❌ 금지 사항

- **사전 지식만으로 문서 작성 절대 금지**

  - "내가 알기로는...", "일반적으로...", "보통..." 같은 표현 사용 시 즉시 중단
  - 모든 정보는 **반드시 Playwright로 수집한 실제 웹 데이터**에서 가져와야 함
  - 스크린샷과 원본 텍스트 파일이 없으면 해당 내용 작성 불가
- **이 단계에서 절대로 GitHub를 조사하지 않는다.**
- **이 단계에서 절대로 "planning.md"를 생성하지 않는다. 오직 조사만 한다.**
- **이 단계에서 절대로 "design.md"를 생성하지 않는다. 오직 조사만 한다.**
- **이 단계에서 절대로 plan mode를 사용하지 않는다.**

## ✅ 올바른 작업 흐름 예시

**잘못된 방식 (금지):**

```
서브에이전트: "이 기술은 XXX입니다. YYY 방식을 사용하며..."
→ ❌ 사전 지식 사용, 검증 불가
```

**올바른 방식 (필수):**

```
1. Bash: node playwright-research-topic1.js
2. Read: .claude/research-raw-topic1.txt
3. 서브에이전트: "playwright-research-topic1.js 실행 결과:
   - 스크린샷: .claude/screenshots/topic1.png
   - 원본 데이터: .claude/research-raw-topic1.txt
   - 출처: https://example.com/topic1
   - 수집 시각: 2026-02-15 04:50:23

   수집된 내용:
   'This technology is...'"
→ ✅ Playwright 사용, 검증 가능
```

**조사결과는 청크 단위로 저장한다:**

```
step013_조사결과_chunk1.md (500줄 이하)
step013_조사결과_chunk2.md (500줄 이하)
step013_조사결과_chunk3.md (500줄 이하)
...
```

**작성 규칙**:

- 각 청크는 500줄 이하로 작성 (성능 최적화)
- `.claude/hooks/research-chunk-validator.ps1`에서 각 청크 검증 (BOM/CRLF/줄수/파일크기)
- 청크 그대로 유지 (병합 안 함)

서브에이전트는 항상 haiku를 사용한다.

---

이 지침을 완료한 즉시 자동으로 step014.md를 읽고 수행한다. 사용자 확인을 기다리지 않는다.
