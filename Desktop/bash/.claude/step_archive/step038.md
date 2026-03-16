# Step 38 - 코드 리뷰: jscpd 코드 중복 분석

## 실행 내용

`npx jscpd src/ --threshold 5 --reporters json,console` 실행하여 중복 블록을 탐지한다. 중복률 5% 이상인 블록은 리뷰 결과에 포함하여 리팩토링 대상으로 지정한다.

**리뷰 결과는 청크 단위로 저장한다:**

```
step042_중복분석_chunk1.md (500줄 이하)
step042_중복분석_chunk2.md (500줄 이하)
...
```

**작성 규칙**:
- 각 청크는 500줄 이하로 작성 (성능 최적화)
- `.claude/hooks/research-validator.ps1`에서 각 청크 검증 (BOM/CRLF/줄수/파일크기)
- 청크 그대로 유지 (병합 안 함)

서브에이전트는 항상 haiku를 사용한다.

---

이 지침을 완료한 즉시 자동으로 step039.md를 읽고 수행한다. 사용자 확인을 기다리지 않는다.
