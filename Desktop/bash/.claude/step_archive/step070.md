# Step 70 - 빌드 검증: HTML 프로젝트 번들링

프로덕션 빌드가 정상적으로 되는지 확인한다.

## 실행 내용

`src/index.html` + `src/js/*.js` + `src/css/*.css` 구조인 경우:

1. `.claude/hooks/html-bundler.ps1` 실행 → `dist/index.html` 자동 생성
2. `dist/index.html`이 file:// 프로토콜에서 정상 동작하는지 Playwright로 확인

```powershell
powershell -ExecutionPolicy Bypass -File .claude/hooks/html-bundler.ps1
```

**번들러 역할:**
- `src/js/*.js` → `<script>` 인라인 (export/import 자동 제거)
- `src/css/*.css` → `<style>` 인라인
- 결과물: `dist/index.html` (단일 파일, file:// 호환)

합리적인 선에서 최대한 많은 서브에이전트를 병렬로 사용하여 빌드 검증을 수행한다.

**빌드 검증 단계에서 절대로 plan mode를 사용하지 않는다.**

**검증:**
- `.claude/hooks/build-validator.ps1`에서 자동 검증
- HTML 프로젝트는 `dist/index.html` 존재 여부로 검증

**검증 실패 시:**
- 빌드 에러 분석
- 빌드 실패 원인 수정
- 검증 통과할 때까지 반복

서브에이전트는 항상 haiku를 사용한다.

---

이 지침을 완료한 즉시 자동으로 step071.md를 읽고 수행한다. 사용자 확인을 기다리지 않는다.
