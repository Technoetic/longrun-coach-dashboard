# Step 34 - CSS 파일 분리

컴포넌트화된 HTML 구조에 맞춰 CSS를 **최대한** 분리하고 구조화한다.

## 파일 구조 규칙

- CSS는 `src/css/*.css` 로 분리 유지
- `src/index.html`에서 `<link rel="stylesheet" href="css/...">` 로 참조
- **`<style>` 태그 인라인 삽입 금지** — Step 73에서 html-bundler.ps1이 자동 번들링

합리적인 선에서 최대한 많은 서브에이전트를 병렬로 사용하여 CSS 파일 분리를 수행한다.

**CSS 분리 단계에서 절대로 plan mode를 사용하지 않는다.**

서브에이전트는 항상 haiku를 사용한다.

---

이 지침을 완료한 즉시 자동으로 step035.md를 읽고 수행한다. 사용자 확인을 기다리지 않는다.
