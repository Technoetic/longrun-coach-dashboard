# Step 55 - Dead Code 점검

리팩토링 완료 후 불필요한 코드를 제거한다.

합리적인 선에서 최대한 많은 서브에이전트를 병렬로 사용하여 Dead Code 점검을 수행한다.

**Dead Code 점검 단계에서 절대로 plan mode를 사용하지 않는다.**

**점검 대상:**
- 사용되지 않는 함수/변수/클래스
- 주석 처리된 코드 블록 (의도적 보존 제외)
- 도달 불가능한 코드 (unreachable code)
- 미사용 import/require
- 리팩토링 후 새로 생긴 dead code
- **jscpd 중복 코드 교차 분석**: `npx jscpd src/ --reporters json` 결과에서 중복 블록 쌍 중 한쪽이 dead code인지 확인한다. 중복 코드의 한쪽이 미사용이면 dead code로 제거한다.
- **Semgrep 미사용 코드 패턴 탐지**: `semgrep --config p/javascript src/` 실행하여 미사용 변수, 도달 불가 코드 등 dead code 패턴을 보조 탐지한다.

## tokei 코드 라인 비교

Dead code 제거 전후 `tokei src/ --output json` 결과를 비교하여 제거된 코드 라인 수를 정량적으로 기록한다. 제거 효과가 미미한 경우(1% 미만 감소) 추가 점검 대상을 탐색한다.

**객관적 검증 기준:**
- 제거 후 모든 테스트 통과 (테스트 실패 시 복구)
- 빌드 성공 (빌드 오류 시 복구)

**Dead Code 점검 결과는 청크 단위로 저장한다:**

```
step059_deadcode_chunk1.md (500줄 이하)
step059_deadcode_chunk2.md (500줄 이하)
...
```

**작성 규칙**:
- 각 청크는 500줄 이하로 작성 (성능 최적화)
- `.claude/hooks/research-validator.ps1`에서 각 청크 검증 (BOM/CRLF/줄수/파일크기)
- 청크 그대로 유지 (병합 안 함)

서브에이전트는 항상 haiku를 사용한다.

---

이 지침을 완료한 즉시 자동으로 step056.md를 읽고 수행한다. 사용자 확인을 기다리지 않는다.
