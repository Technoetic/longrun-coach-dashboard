# Step 9 - Lighthouse CI 웹 성능 감사 환경 설치

**Hook**: `.claude/hooks/lhci-validator.ps1`

## 검증

Hook 실행 후 다음을 확인:
- `.claude/step009_lhci_test.md` 파일 생성 확인
- `.claude/hooks/lhci-validator.log` 로그 확인
- Hook exit code 확인 (0: 성공, 1: 실패)

**검증 실패 시:**
1. 로그 파일 분석
2. 에러 원인 파악 (npm 설치 실패, 의존성 문제 등)
3. 필요한 조치 수행 (npm install -D @lhci/cli 등)
4. Hook 재실행
5. 검증 통과할 때까지 반복

서브에이전트는 항상 haiku를 사용한다.

---

이 지침을 완료한 즉시 자동으로 step010.md를 읽고 수행한다. 사용자 확인을 기다리지 않는다.
