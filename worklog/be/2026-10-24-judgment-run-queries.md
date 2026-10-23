# 판정 run 이 거래 한 건에 보내는 쿼리를 줄인다

- 브랜치: refactor/judgment-run-queries
- 커밋: de64585..2dd091f (3개)
- 주요파일: AssignedIdEntity.java, JudgmentCitationRepository.java, StatuteVersions.java, JudgmentReferences.java

## 한 일

- id 를 저장 전에 직접 채우는 `judgment`, `question_queue`, `judgment_run_item` 이 `AssignedIdEntity`(`Persistable`)를 상속한다. 막 만든 객체는 `isNew()` 가 true 라 `save()` 가 merge 대신 persist 로 가서 INSERT 전 SELECT 가 빠진다 (de64585)
- 판정 하나의 인용을 HQL insert-select 한 문장으로 넣는다(`JudgmentCitationRepository.insertAll`). 쓰이지 않게 된 `save` 와 `JudgmentCitationEntity` 생성자를 지웠다 (e2716a4)
- run 과 rejudge 가 작업을 시작할 때 `JudgmentReferences`(공휴일 + `StatuteVersions`)를 만들어 끝까지 쓴다. 조문 버전 기간은 조문마다 처음 인용할 때 `findPeriods` 로 한 번 읽고, 판정일에 유효한 버전은 메모리에서 고른다. `findEffectiveVersionIds` 는 지웠다 (2dd091f)
- 테스트
  - `JudgmentRunQueryCountIntegrationTest`: 27건 run 의 쿼리 수를 Hibernate Statistics 로 센다. 684개(건당 25.3)에서 385개(건당 14.3)가 됐고, 건당 15개 이하로 고정했다
  - `StatuteVersionsIntegrationTest`: effective_from 포함·effective_to 제외 경계, 버전이 없을 때 예외, 한 번 읽은 조문은 그 작업이 끝날 때까지 다시 읽지 않는 것
  - `JudgmentRunInterruptionIntegrationTest`: `judgeItem` 에 references 를 넘기도록 고쳤다
- `docs/architecture.md` 판정 실행(run) 절에 "공휴일과 조문 버전은 run 을 시작할 때 기준으로 판정한다" 를 더했다

## 왜 이렇게 했나

- 인용은 Persistable 대신 insert 한 문장으로 바꿨다. id 가 IDENTITY 라 Hibernate 가 INSERT 를 묶지 못한다. native(`unnest`)나 SEQUENCE 전환 대신 HQL insert-select 를 골라 PostgreSQL 전용 문법과 마이그레이션 없이 한 문장으로 만들었다
- `insertAll` 은 `flushAutomatically = true` 다. 이 쿼리는 judgment 테이블을 건드리지 않아 Hibernate 가 참조하는 judgment INSERT 를 먼저 보내지 않는다
- `in :statuteVersionIds` 는 같은 버전을 두 번 넘겨도 한 행만 넣는다. 원래 `UNIQUE(judgment_id, statute_version_id)` 라 두 번 들어갈 수 없어서 차이가 없다
- 조문 버전은 규칙 카드 목록으로 미리 읽지 않고 처음 인용할 때 읽는다. 질문 응답 effect 에도 인용이 있어 카드 목록만으로는 빠지는 조문이 생긴다
- 서버 전역 캐시 대신 작업 단위로 읽었다. 조문 버전은 주간 법령 동기화로 서버 운영 중에도 바뀌어서, 전역 캐시는 무효화 장치가 필요하다. 작업 단위면 그 작업이 끝날 때 버려진다
- `StatuteVersionsIntegrationTest` 는 전용 조문 ID 를 쓴다. 규칙 카드가 인용하는 조문 행을 닫으면 같은 컨테이너를 쓰는 다른 테스트가 깨진다

## 남은 것 · 아는 문제

- 이미 있는 id 로 새 엔티티를 만들어 `save()` 하면 이제 덮어쓰지 않고 키 중복으로 실패한다. 지금은 세 엔티티 모두 `new` 로 막 만든 객체만 저장한다
- 거래마다 커밋하는 비용, run·item 장부 쿼리, 거래 이중 조회는 그대로다. 잠금 범위와 트랜잭션 경계가 바뀌어 이번에는 건드리지 않았다
- 사용자 사실(user_fact)은 거래마다 그대로 읽는다. run 단위로 읽으면 run 도중 들어온 답변이 남은 거래에 반영되지 않는다
