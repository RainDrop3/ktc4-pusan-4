# classification-reviews-query(#156) 에 develop 을 merge 하고 base 를 develop 으로 바꾼다

- 브랜치: feature/classification-reviews-query
- 커밋: 2df8bbb (merge 1개)
- 주요파일: MockFixtures.java

## 한 일

- base 였던 feature/transactions-api 가 #148 로 develop 에 들어가 base 를 develop 으로 바꿨다. develop(a7fb5a4)을 merge 했다. 뒤처진 develop 커밋은 219개다.
- `MockFixtures`: 이 브랜치는 목에서 실제 조회로 바꾸며 `UNCLASSIFIED_TRANSACTION_ID`·`REVIEW_ID` 를 지웠고, develop 은 #157(199dfee)에서 `OVERRIDE_JUDGMENT_ID`·`OVERRIDE_ID` 를 지웠다. 네 개 모두 지웠다. 남은 사용처는 없다.

## 왜 이렇게 했나

- 이미 push 된 브랜치라 rebase + force push 대신 merge 했다.

## 남은 것 · 아는 문제

- 리뷰 의견은 아직 반영하지 않았다. 두 `findRows` 에 `effectiveStatus` 가 JUDGEABLE 인 거래만 보이게 거는 것.
- #158(feature/classification-responses)은 이 브랜치 위에 쌓여 있어 이 merge 를 다시 받았다.

## 확인한 것

- `gradlew -p backend check` 통과(test 349, integrationTest 146, 스킵 0).
