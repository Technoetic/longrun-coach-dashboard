# Step 33 - JavaScript 모듈화

구현된 JavaScript 코드를 모듈 시스템을 적용하여 **최대한** 분리한다.

## 파일 구조 규칙

- 소스 파일은 `src/` 디렉토리에 분리 유지 (개발 소스)
- 엔트리 HTML은 `src/index.html`에 작성하고 `<script src="js/...">`, `<link href="css/...">` 로 참조
- `dist/index.html`은 Step 73 빌드 단계에서 `.claude/hooks/html-bundler.ps1`이 자동 생성
- **직접 index.html에 인라인으로 합치는 것 금지** (번들러가 담당)

## 이유

file:// 프로토콜의 ES 모듈 CORS 제한은 번들러(html-bundler.ps1)가 dist/ 단계에서 해결한다.
소스 코드는 항상 분리된 파일로 유지한다.

합리적인 선에서 최대한 많은 서브에이전트를 병렬로 사용하여 모듈화를 수행한다.

**모듈화 단계에서 절대로 plan mode를 사용하지 않는다.**

서브에이전트는 항상 haiku를 사용한다.

---

이 지침을 완료한 즉시 자동으로 step034.md를 읽고 수행한다. 사용자 확인을 기다리지 않는다.
