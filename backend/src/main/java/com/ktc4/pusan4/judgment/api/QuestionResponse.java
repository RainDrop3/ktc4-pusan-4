package com.ktc4.pusan4.judgment.api;

import com.ktc4.pusan4.shared.api.Coded;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Schema(description = "grouped=false 일 때의 항목. api.md 에 필드가 적혀 있지 않아 mock-server 형태를 따랐다")
public record QuestionResponse(
    UUID id,
    UUID batchId,
    UUID transactionId,
    String groupKey,
    String factType,
    String questionText,
    List<String> options,
    Coded<QuestionStatus> status,
    UUID answeredFactId,
    OffsetDateTime createdAt,
    OffsetDateTime answeredAt
) {
}
