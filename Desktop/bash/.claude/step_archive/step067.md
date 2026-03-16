# Step 67 - 최적화 검증: semgrep 경고 비교

최적화 전후 Semgrep 경고를 비교하여 최적화로 인해 보안/품질 경고가 증가하지 않았는지 확인한다.

## 실행 내용

```bash
semgrep --config auto --json src/
```

경고 증가 시 최적화 검증 실패로 간주한다.

**검증 결과는 청크 단위로 저장한다:**

```
step071_semgrep검증_chunk1.md (500줄 이하)
step071_semgrep검증_chunk2.md (500줄 이하)
...
```

**작성 규칙**:
- 각 청크는 500줄 이하로 작성 (성능 최적화)
- `.claude/hooks/research-validator.ps1`에서 각 청크 검증 (BOM/CRLF/줄수/파일크기)
- 청크 그대로 유지 (병합 안 함)

서브에이전트는 항상 haiku를 사용한다.

---

이 지침을 완료한 즉시 자동으로 step068.md를 읽고 수행한다. 사용자 확인을 기다리지 않는다.
