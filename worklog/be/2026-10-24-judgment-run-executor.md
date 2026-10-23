# 판정 run 을 전용 스레드 풀(워커 4, 대기열 150)에서 실행한다

- 브랜치: refactor/judgment-run-executor
- 커밋: 770f994 (1개)
- 주요파일: JudgmentRunExecutorConfiguration.java, JudgmentRunner.java, JudgmentRunService.java

## 한 일

- `JudgmentRunExecutorConfiguration` 에 판정 run 전용 `ThreadPoolTaskExecutor`(`judgmentRunExecutor`)를 뒀다. 워커 4(core = max), 대기열 150, 스레드 이름 `judgment-run-`
- `JudgmentRunner.onCreated` 에서 `@Async` 를 빼고, `@TransactionalEventListener` 안에서 풀에 직접 넘긴다. `TaskRejectedException` 이면 `runService.fail` 로 run 을 `RUN_START_FAILED` 로 끝낸다
- `JudgmentRunService.fail` 을 `REQUIRES_NEW` 로 바꿨다
- 쓰이지 않게 된 `shared/AsyncConfiguration`(`@EnableAsync`)을 지웠다
- `JudgmentRunRejectionIntegrationTest`: 풀이 거절하면 run 생성은 성공하고 그 run 이 `FAILED`, 항목이 `RUN_START_FAILED` 로 남는다. `REQUIRES_NEW` 를 `REQUIRED` 로 되돌리면 run 이 `QUEUED` 로 남아 실패하는 것을 확인했다
- `docs/architecture.md` 판정 실행(run) 절에 전용 풀과 대기열이 찼을 때를 적고, `docs/api.md` `RUN_START_FAILED` 설명에 "판정 대기열이 가득 참" 을 더했다

## 왜 이렇게 했나

- 워커 4: 같은 Docker 네트워크에서 run 8개 × 1,200건을 동시에 만들어 Spring Boot 기본 풀 크기를 1·2·4·8 로 바꿔 쟀다. 처리량이 185 → 375 → 562 → 829 건/초(1 대비 2.0·3.0·4.5배)였다. 8 은 덜 늘고 DB 커넥션 10개 중 8개를 차지한다. 진행률 GET 은 8 에서도 최대 41ms 였다(폴링 클라이언트 하나)
- 대기열 150: 멈춘 run 정리(`interruptStale`)가 QUEUED 도 진행 없음 5분이면 끝낸다. 1,200건 run 하나가 약 8초라 150 × 8초 / 4 ≈ 5분이다
- 풀에 직접 넘긴 이유: `@Async` 는 대기열이 찼을 때 `TaskRejectedException` 을 run 을 만든 요청의 커밋 뒤(afterCommit)에 그 요청 스레드로 던진다. run 은 저장됐는데 응답이 500 이 된다
- `REQUIRES_NEW`: AFTER_COMMIT 리스너 안에서 `REQUIRED` 로 들어가면 이미 끝난 트랜잭션에 참여해 바꾼 내용이 커밋되지 않는다. `fail` 을 부르는 다른 곳(실행 스레드, 테스트)은 바깥 트랜잭션이 없어 동작이 같다
- 새 에러 코드 대신 `RUN_START_FAILED` 를 썼다. "Run 을 시작하지 못했다" 는 뜻이 같다

## 남은 것 · 아는 문제

- 측정은 개발 PC(Docker Desktop) 값이다. EC2 에서 처리량과 워커 4 의 효과는 재지 않았다
- 사용자 여럿이 동시에 폴링하는 부하는 재지 않았다
- 종료할 때 진행 중인 run 을 기다리는 설정(graceful shutdown)은 다음 브랜치에서 한다
