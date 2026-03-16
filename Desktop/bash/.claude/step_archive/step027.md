# Step 27 - knip 미사용 코드 베이스라인 수집

## 실행 내용

`npx knip --reporter json > .claude/knip-baseline.json` 실행하여 미사용 파일/export/dependency 초기 현황을 기록한다.

이 베이스라인을 이후 Dead Code 점검/리팩토링 단계에서 비교 기준으로 사용한다.

## 결과 저장

- `.claude/knip-baseline.json`에 JSON 리포트 저장
- 미사용 코드 요약을 `.claude/step032_knip베이스라인.md`에 기록

서브에이전트는 항상 haiku를 사용한다.

---

이 지침을 완료한 즉시 자동으로 step028.md를 읽고 수행한다. 사용자 확인을 기다리지 않는다.
