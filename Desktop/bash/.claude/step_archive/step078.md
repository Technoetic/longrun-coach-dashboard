# Step 78 - 콘솔 에러 수집 및 해결

Playwright로 앱을 실행하며 브라우저 콘솔 에러를 수집하고, 발견된 모든 에러를 소스 코드에서 찾아 해결한다.
에러가 0개가 될 때까지 수정과 재검증을 반복한다.

**이 단계에서 절대로 plan mode를 사용하지 않는다.**

**에러 0개 확인 없이 통과 처리 금지.**

## 수집 대상

```javascript
// playwright-console-check.js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const errors = [];
  const warnings = [];
  const networkFails = [];

  // 콘솔 에러/경고 수집
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
    if (msg.type() === 'warning') warnings.push(msg.text());
  });

  // JS 런타임 에러 수집
  page.on('pageerror', err => {
    errors.push(`[UNCAUGHT] ${err.message}\n${err.stack}`);
  });

  // 네트워크 실패 수집
  page.on('requestfailed', req => {
    networkFails.push(`${req.url()} - ${req.failure().errorText}`);
  });

  await page.goto('http://localhost:3000'); // 또는 file:// 경로
  await page.waitForTimeout(3000);

  console.log('=== ERRORS ===');
  errors.forEach(e => console.log(e));
  console.log('=== WARNINGS ===');
  warnings.forEach(w => console.log(w));
  console.log('=== NETWORK FAILS ===');
  networkFails.forEach(n => console.log(n));

  await browser.close();
})();
```

## 검증 절차

1. Playwright 스크립트 실행 → 에러 목록 출력
2. 에러가 있으면:
   - 각 에러의 원인 소스 파일 특정
   - 코드 수정
   - 스크립트 재실행
   - **에러 0개가 될 때까지 무한 반복**
3. 에러 0개 확인 후 다음 단계 진행

합리적인 선에서 최대한 많은 서브에이전트를 병렬로 사용한다.

서브에이전트는 항상 haiku를 사용한다.

---

이 지침을 완료한 즉시 자동으로 step079.md를 읽고 수행한다. 사용자 확인을 기다리지 않는다.
