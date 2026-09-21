package com.ktc4.pusan4.transaction.api;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Schema(description = "api.md 에는 \"Batch 메타데이터와 거래 수 등\"으로만 적혀 있어 mock-server 형태를 따랐다")
public record UploadBatchResponse(
    UUID id,
    SourceType sourceType,
    CardIssuer cardIssuer,
    LocalDate periodStart,
    LocalDate periodEnd,
    int transactionCount,
    int skippedDuplicateCount,
    int classificationPendingCount,
    OffsetDateTime createdAt
) {
}
