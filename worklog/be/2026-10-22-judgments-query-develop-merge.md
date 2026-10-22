# judgments-query 에 develop 을 merge 해 업로드 서비스(B4)와의 충돌을 푼다

- 브랜치: feature/judgments-query
- 커밋: f0b4a74 (merge 1개)
- 주요파일: TransactionRecordEntity.java, UploadBatchEntity.java, UploadBatchRepository.java

## 한 일

- #127·#128 을 develop 에 merge 하고 #132 의 base 를 develop 으로 바꾸기 전에, develop 을 이 브랜치에 merge 했다.
- `UploadBatchEntity`·`UploadBatchRepository`: #127 때(worklog `2026-10-22-judgment-runs-develop-merge`)와 같은 충돌이라 develop 쪽을 그대로 썼다.
- `TransactionRecordEntity`: #129 가 public 생성자와 `id()`·`merchantCategory()` 등 public 접근자를 더했고, 이 브랜치(97e2f53)는 같은 자리에 package-private `id()` 와 `toJudged()` 를 더했다. develop 쪽을 쓰고 `toJudged()` 만 더했다. `id()`·`merchantCategory()` 는 develop 의 public 판이 대신한다.

## 왜 이렇게 했나

- 저장소가 merge 후 브랜치를 지우지 않아 스택 PR 의 base 가 자동으로 develop 으로 바뀌지 않는다. base 를 손으로 바꾸고 이 merge 를 push 해서 CI 가 develop 과 합친 상태로 돌게 했다.

## 확인한 것

- `gradlew -p backend check` 통과(test 332, integrationTest 90).
