# 판정 스택 리뷰 반영

## 18:05 판정 실패 항목에 예외 메시지 대신 고정 문구를 남긴다 (#127 리뷰)

- 브랜치: feature/judgment-runs
- 커밋: a188d70 (1개)
- 주요파일: JudgmentRunItemEntity.java, JudgmentRunner.java, JudgmentRunIntegrationTest.java

### 한 일

- 거래 한 건 판정이 실패하면 `error_message` 에 예외 메시지 대신 고정 문구 "판정 처리 중 오류가 발생했습니다." 를 남긴다. `recordFailure`·`fail` 이 메시지를 받지 않는다.
- 원인은 지금처럼 `JudgmentRunner` 의 `log.warn(..., e)` 에만 남는다.
- architecture.md 의 판정 실행 설명을 고쳤다.

### 왜 이렇게 했나

- 리뷰: 실패 목록 API(`GET /judgment-runs/{id}/failures`) 로 내부 예외 문구(룰카드 id 등)가 사용자에게 나간다.
- 문구는 api.md 3.6 응답 예시에 이미 있던 것을 그대로 썼다.

### 확인한 것

- `JudgmentRunIntegrationTest` 의 실패 항목 검사를 룰카드 id 포함에서 고정 문구 일치로 바꿨다.
- `gradlew -p backend check` 통과.
