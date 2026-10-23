package com.ktc4.pusan4.judgment.persistence;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * 판정 run 을 실행하는 전용 스레드 풀. 워커 하나가 run 하나를 끝까지 맡으므로 워커 수가 동시에 도는 run 의 최대 개수다.
 *
 * <ul>
 *   <li>워커 4: 동시 실행 측정(run 8개 × 1,200건)에서 처리량이 워커 1개의 3배였다. 8개는 4.5배로 덜 늘고
 *       DB 커넥션(Hikari 기본 10개)을 8개 차지한다. 4개면 6개가 웹 요청 몫으로 남는다.</li>
 *   <li>대기열 150: 맨 뒤 run 이 멈춘 run 정리(진행 없음 5분, JudgmentRunService.interruptStale) 전에 시작되는 상한이다.
 *       1,200건 run 하나가 약 8초라 150 × 8초 / 4 ≈ 5분이다.</li>
 * </ul>
 * 대기열까지 차면 JudgmentRunner 가 그 run 을 RUN_START_FAILED 로 끝낸다.
 */
@Configuration
class JudgmentRunExecutorConfiguration {

    static final int WORKERS = 4;
    static final int QUEUE_CAPACITY = 150;

    @Bean
    ThreadPoolTaskExecutor judgmentRunExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(WORKERS);
        executor.setMaxPoolSize(WORKERS);
        executor.setQueueCapacity(QUEUE_CAPACITY);
        executor.setThreadNamePrefix("judgment-run-");
        return executor;
    }
}
