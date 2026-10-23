package com.ktc4.pusan4.judgment.persistence;

import com.ktc4.pusan4.judgment.persistence.StatuteVersionRepository.VersionPeriod;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 조문마다 버전 기간을 처음 쓸 때 한 번 읽어 두고, 판정일에 유효한 버전을 메모리에서 고른다.
 * 판정 작업 하나(run 하나, 재판정 한 번) 동안만 쓴다. 그 사이 법령 동기화가 돌아도 처음 읽은 버전으로 판정한다.
 *
 * <p>인용 조문은 규칙 카드뿐 아니라 질문 응답 effect 에서도 오므로, 미리 목록을 정하지 않고 쓰는 조문만 읽는다.
 */
final class StatuteVersions {

    private final StatuteVersionRepository repository;
    private final Map<String, List<VersionPeriod>> periodsByStatuteId = new HashMap<>();

    StatuteVersions(StatuteVersionRepository repository) {
        this.repository = repository;
    }

    long effectiveVersionId(String statuteId, LocalDate date) {
        List<Long> versionIds = periodsByStatuteId.computeIfAbsent(statuteId, repository::findPeriods).stream()
            .filter(period -> period.isEffectiveOn(date))
            .map(VersionPeriod::id)
            .toList();
        if (versionIds.size() != 1) {
            throw new IllegalStateException("Expected one effective statute version for " + statuteId);
        }
        return versionIds.getFirst();
    }
}
