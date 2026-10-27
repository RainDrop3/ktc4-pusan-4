# judgment-run-graceful-shutdown(#170) 에 develop 을 merge 하고 base 를 develop 으로 바꾼다

- 브랜치: refactor/judgment-run-graceful-shutdown
- 커밋: ee6f703 (merge 1개)
- 주요파일: application.yml

## 한 일

- base 였던 refactor/judgment-run-executor 가 #169 로 develop 에 들어가 base 를 develop 으로 바꿨다. develop(a7fb5a4)을 merge 했다. 뒤처진 develop 커밋은 69개다.
- `application.yml`: 이 브랜치는 `judgment-run.await-termination` 을, develop 은 5fc409f 에서 `app.auth` 를 같은 자리에 더했다. 서로 다른 키라 둘 다 남겼다.

## 왜 이렇게 했나

- 이미 push 된 브랜치라 rebase + force push 대신 merge 했다.

## 남은 것 · 아는 문제

- 리뷰 의견 2개는 아직 반영하지 않았다. 실행기 빈에 `@DependsOn("entityManagerFactory")` 를 걸어 종료 순서를 보장하는 것, `stop_grace_period` 를 90초에서 100초로 늘리는 것.

## 확인한 것

- `gradlew -p backend check` 통과(test 349, integrationTest 144, 스킵 0).
