# Step 24 - 환경 준비

## 🔒 사전 조건 확인

**자동 실행 Hook:** `.claude/hooks/dependency-checker.ps1`

- 프로젝트 기술 스택 자동 감지 (package.json, requirements.txt 등)
- step027_설계_chunk*.md (레이아웃 설계)에서 필요 라이브러리 추출
- step028_설계_chunk*.md (전체 설계)에서 필요 라이브러리 추출
- 설치 여부 자동 확인
- 실행 로그: `.claude/hooks/dependency-checker.log`

**⚠️ 미설치 패키지 발견 시:**

- Hook이 강제 실패 (exit 1)
- 설치 명령 자동 제안
- Claude에게 오류 전달

---

## 실행 내용

`dependency-checker.ps1`의 자동 검증 결과를 확인하고, 필요 시 패키지를 설치한다.

---

이 지침을 완료한 즉시 자동으로 step025.md를 읽고 수행한다. 사용자 확인을 기다리지 않는다.
