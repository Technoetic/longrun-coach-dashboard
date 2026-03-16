# Step 83 - 성능 테스트

프로젝트 특성과 성능 목표를 분석하여 테스트 시나리오를 동적으로 결정한다.

성능 테스트 및 벤치마크를 수행한다.

## Lighthouse CI 웹 성능 감사 (핵심)

`lhci autorun`을 실행하여 Core Web Vitals 메트릭을 측정하고 임계치 기반 pass/fail을 판정한다:

```bash
npx lhci autorun --collect.url=http://localhost:PORT --collect.numberOfRuns=3
```

**임계치 기준 (lighthouserc.js assertions):**
- Performance 점수 ≥ 90
- LCP < 2.5s
- CLS < 0.1
- TTFB < 800ms

임계치 미달 시 성능 테스트 실패로 간주한다. 결과를 `.claude/lhci-results/` 에 저장한다.

합리적인 선에서 최대한 많은 서브에이전트를 병렬로 사용한다.

**성능 테스트 단계에서 절대로 plan mode를 사용하지 않는다.**

서브에이전트는 항상 haiku를 사용한다.

---

이 지침을 완료한 즉시 자동으로 step084.md를 읽고 수행한다. 사용자 확인을 기다리지 않는다.
