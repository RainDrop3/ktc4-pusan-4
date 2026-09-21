package com.ktc4.pusan4.judgment.api;

import com.ktc4.pusan4.judgment.domain.Verdict;

import java.util.List;
import java.util.Map;

public record JudgmentSummaryResponse(
    Scope scope,
    int totalCount,
    Map<Verdict, VerdictSummary> byVerdict,
    List<AccountSummary> byAccount
) {

    public record Scope(SummaryScopeType type, String id) {
    }

    public record VerdictSummary(int count, long finalAmount) {
    }

    public record AccountSummary(String account, int count, long finalAmount) {
    }
}
