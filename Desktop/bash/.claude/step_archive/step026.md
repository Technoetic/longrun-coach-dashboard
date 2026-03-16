# Step 26 - jscpd 코드 중복 베이스라인 수집

## 실행 내용

`npx jscpd src/ --reporters json --output .claude/jscpd-baseline/` 실행하여 현재 코드 중복률을 측정한다.

이 베이스라인을 이후 리팩토링/최적화 단계에서 비교 기준으로 사용한다.

## 결과 저장

- `.claude/jscpd-baseline/` 디렉토리에 JSON 리포트 저장
- 중복률 요약을 `.claude/step031_jscpd베이스라인.md`에 기록

서브에이전트는 항상 haiku를 사용한다.

---

이 지침을 완료한 즉시 자동으로 step027.md를 읽고 수행한다. 사용자 확인을 기다리지 않는다.
