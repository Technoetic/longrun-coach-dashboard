# Step 20 - 기획 보강: API 계약 문서 조사결과

## 실행 내용

step15 API 계약 문서 조사결과를 기반으로 기획 문서를 보강한다.

**필요한 파일:**
- step018_planning_chunk*.md (기획 문서)
- step016_조사결과_chunk*.md (API 계약 문서 조사결과)

기획 문서를 읽고, step15 API 계약 문서 조사결과에서 반영할 내용을 식별하여 기획 문서를 업데이트한다.

Class 지향으로 기획한다.

합리적인 선에서 최대한 많은 서브에이전트를 병렬로 사용해야 한다.

**보강된 기획 결과는 기존 청크를 덮어쓴다:**

```
step018_planning_chunk1.md (500줄 이하)
step018_planning_chunk2.md (500줄 이하)
step018_planning_chunk3.md (500줄 이하)
...
```

**작성 규칙**:
- 각 청크는 500줄 이하로 작성 (성능 최적화)
- `.claude/hooks/research-validator.ps1`에서 각 청크 검증 (BOM/CRLF/줄수/파일크기)
- 청크 그대로 유지 (병합 안 함)

서브에이전트는 항상 haiku를 사용한다.

---

이 지침을 완료한 즉시 자동으로 step021.md를 읽고 수행한다. 사용자 확인을 기다리지 않는다.
