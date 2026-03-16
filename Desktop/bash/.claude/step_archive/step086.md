# Step 86 - 통합 테스트: semgrep 모듈 간 보안 스캔

## 실행 내용

`semgrep --config p/security-audit src/` 실행하여 모듈 간 인터페이스의 보안 취약점(입력 검증 누락, XSS, injection 등)을 집중 스캔한다. 발견된 취약점은 통합 테스트 시나리오에 포함한다.

서브에이전트는 항상 haiku를 사용한다.

---

이 지침을 완료한 즉시 자동으로 step087.md를 읽고 수행한다. 사용자 확인을 기다리지 않는다.
