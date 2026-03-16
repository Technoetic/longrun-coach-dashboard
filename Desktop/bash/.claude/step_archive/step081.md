# Step 81 - E2E 테스트 성능 최적화

현재 성능을 측정(baseline)하고 프로젝트 특성에 맞는 목표를 동적으로 설정하여 최적화한다.

Playwright E2E 테스트 실행 속도를 최적화한다.

합리적인 선에서 최대한 많은 서브에이전트를 병렬로 사용한다.

## Lighthouse CI 성능 영향 확인

E2E 테스트 최적화 후 Lighthouse CI를 실행하여 테스트 최적화가 실제 성능 메트릭에 영향을 주지 않았는지 확인한다:

```bash
npx lhci autorun --collect.url=http://localhost:PORT
```

Step 75 베이스라인 대비 성능 점수가 하락하지 않았는지 확인한다.

**성능 최적화 단계에서 절대로 plan mode를 사용하지 않는다.**

서브에이전트는 항상 haiku를 사용한다.

---

이 지침을 완료한 즉시 자동으로 step082.md를 읽고 수행한다. 사용자 확인을 기다리지 않는다.
