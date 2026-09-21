package com.ktc4.pusan4.user.api;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Schema(description = "api.md 에 응답 필드가 적혀 있지 않아 mock-server 형태를 따랐다")
public record ContextResponse(
    UUID id,
    int version,
    String industryCode,
    long prevYearRevenue,
    LocalDate businessOpenDate,
    BookkeepingDuty bookkeepingDuty,
    boolean hasEmployee,
    Integer homeOfficeRatio,
    OffsetDateTime createdAt
) {
}
