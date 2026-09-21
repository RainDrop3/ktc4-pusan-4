package com.ktc4.pusan4.judgment.api;

/**
 * summary 집계 범위. api.md 예시에는 BATCH 만 있어 YEAR·RUN 은 쿼리 파라미터에서 추론했다.
 */
public enum SummaryScopeType {
    BATCH,
    YEAR,
    RUN
}
