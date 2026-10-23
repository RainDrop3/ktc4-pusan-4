package com.ktc4.pusan4.judgment.persistence;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 판정일에 유효한 조문 버전을 메모리에서 고른다. effective_from 은 포함, effective_to 는 제외다.
 * 한 번 읽은 조문은 그 StatuteVersions 가 끝날 때까지 다시 읽지 않는다(작업 단위 스냅샷).
 */
@SpringBootTest
@Testcontainers
class StatuteVersionsIntegrationTest {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17-alpine");

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private JudgmentService judgmentService;

    @Test
    void picks_the_version_effective_on_the_date() {
        long old = insertVersion("버전경계", "2020-01-01", "2025-07-01");
        long current = insertVersion("버전경계", "2025-07-01", null);
        StatuteVersions versions = judgmentService.statuteVersions();

        assertThat(versions.effectiveVersionId("버전경계", LocalDate.parse("2020-01-01"))).isEqualTo(old);
        assertThat(versions.effectiveVersionId("버전경계", LocalDate.parse("2025-06-30"))).isEqualTo(old);
        assertThat(versions.effectiveVersionId("버전경계", LocalDate.parse("2025-07-01"))).isEqualTo(current);
        assertThatThrownBy(() -> versions.effectiveVersionId("버전경계", LocalDate.parse("2019-12-31")))
            .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> versions.effectiveVersionId("없는조문", LocalDate.parse("2025-07-01")))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void keeps_the_versions_it_read_until_the_work_ends() {
        long first = insertVersion("동기화중", "2020-01-01", null);
        StatuteVersions running = judgmentService.statuteVersions();
        assertThat(running.effectiveVersionId("동기화중", LocalDate.parse("2025-08-15"))).isEqualTo(first);

        // 작업 도중 법령 동기화가 옛 버전을 닫고 새 버전을 넣었다.
        jdbcTemplate.update("update statute_version set effective_to = '2025-08-01' where id = ?", first);
        long revised = insertVersion("동기화중", "2025-08-01", null);

        assertThat(running.effectiveVersionId("동기화중", LocalDate.parse("2025-08-15"))).isEqualTo(first);
        assertThat(judgmentService.statuteVersions().effectiveVersionId("동기화중", LocalDate.parse("2025-08-15")))
            .isEqualTo(revised);
    }

    private long insertVersion(String statuteId, String effectiveFrom, String effectiveTo) {
        return jdbcTemplate.queryForObject("""
            insert into statute_version(
                statute_id, doc_type, hierarchy, effective_from, effective_to, body, body_hash,
                doc_id, unit_level, title, source_url
            ) values (?, '법령', '법률', ?::date, ?::date, '원문', 'hash', 'DOC', '호', ?, 'https://law.go.kr/test')
            returning id
            """, Long.class, statuteId, effectiveFrom, effectiveTo, statuteId);
    }
}
