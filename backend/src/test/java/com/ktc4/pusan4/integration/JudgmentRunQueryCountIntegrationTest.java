package com.ktc4.pusan4.integration;

import com.ktc4.pusan4.judgment.domain.Citation;
import com.ktc4.pusan4.judgment.domain.Gate;
import com.ktc4.pusan4.judgment.domain.RuleCard;
import com.ktc4.pusan4.judgment.domain.RuleSet;
import com.ktc4.pusan4.judgment.persistence.JudgmentRunService;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 판정 run 이 거래 한 건에 보내는 쿼리 수를 고정한다. 3,000건 run 의 시간은 쿼리 수에 비례했다
 * (같은 Docker 네트워크에서 쿼리 왕복과 DB 대기가 run 시간의 95%).
 * 진행 확인은 JdbcTemplate 으로 해서 Hibernate 통계에 섞이지 않게 한다.
 */
@SpringBootTest(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
@Testcontainers
class JudgmentRunQueryCountIntegrationTest {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17-alpine");

    // rules/categories.yaml 의 카테고리마다 한 건. 규칙 카드마다 인용·질문 수가 달라 골고루 돈다.
    private static final List<String> CATEGORIES = List.of(
        "카페", "음식점", "편의점", "온라인쇼핑", "음식배달", "해외SaaS", "국내SW", "통신", "수도광열",
        "여비교통", "차량", "도서", "교육", "광고", "사무용품", "의료", "금융", "지자체_과태료",
        "경찰청_범칙금", "조세", "PG_미상", "기타", "게임", "구독서비스", "여가", "미용", "생활용품"
    );

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private JudgmentRunService runService;

    @Autowired
    private RuleSet ruleSet;

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    @Test
    void run_sends_bounded_queries_per_transaction() {
        insertCitedStatutes();
        UUID userId = insertUser();
        UUID batchId = insertBatch(userId);
        UUID contextId = insertContext(userId);
        for (int i = 0; i < CATEGORIES.size(); i++) {
            insertTransaction(userId, batchId, CATEGORIES.get(i), i);
        }
        Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        statistics.clear();

        UUID runId = runService.create(userId, batchId, contextId).id();
        awaitCompleted(runId);

        // run 생성·시작·완료를 포함해 27건에 385개(건당 14.3)다. 줄이기 전에는 684개(건당 25.3)였다.
        // 여유분은 1분마다 도는 정리 작업(interruptStale)이 측정 중에 끼어드는 경우를 위한 것이다.
        assertThat(statistics.getPrepareStatementCount()).isLessThanOrEqualTo(15L * CATEGORIES.size());
    }

    private void awaitCompleted(UUID runId) {
        Instant deadline = Instant.now().plus(Duration.ofSeconds(30));
        while (Instant.now().isBefore(deadline)) {
            String status = jdbcTemplate.queryForObject(
                "select status from judgment_run where id = ?", String.class, runId);
            if (Set.of("COMPLETED", "PARTIAL_FAILED", "FAILED").contains(status)) {
                assertThat(status).isEqualTo("COMPLETED");
                return;
            }
            try {
                Thread.sleep(50);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException(e);
            }
        }
        throw new AssertionError("run " + runId + " did not finish in time");
    }

    private void insertCitedStatutes() {
        Set<String> statuteIds = new TreeSet<>();
        for (Gate gate : Gate.values()) {
            for (RuleCard card : ruleSet.get(gate)) {
                card.citations().stream().map(Citation::statuteId).forEach(statuteIds::add);
            }
        }
        for (String statuteId : statuteIds) {
            jdbcTemplate.update("""
                insert into statute_version(
                    statute_id, doc_type, hierarchy, effective_from, body, body_hash,
                    doc_id, unit_level, title, source_url
                ) values (?, '법령', '법률', '2020-01-01', '원문', 'hash', 'DOC', '호', ?, 'https://law.go.kr/test')
                """, statuteId, statuteId);
        }
    }

    private UUID insertUser() {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update("insert into app_user(id, email) values (?, ?)", id, id + "@example.com");
        return id;
    }

    private UUID insertBatch(UUID ownerId) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update("""
            insert into upload_batch(id, user_id, source_type, card_issuer, period_start, period_end, file_hash)
            values (?, ?, '승인내역', '국민', '2025-01-01', '2025-12-31', ?)
            """, id, ownerId, id.toString());
        return id;
    }

    private UUID insertContext(UUID ownerId) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update("""
            insert into user_context(
                id, user_id, industry_code, prev_year_revenue, business_open_date,
                bookkeeping_duty, has_employee, version
            ) values (?, ?, '940909', 30000000, '2023-01-01', '간편장부', false, 1)
            """, id, ownerId);
        return id;
    }

    private void insertTransaction(UUID userId, UUID batchId, String category, int index) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update("""
            insert into transaction(
                id, batch_id, user_id, approved_at, merchant_raw, merchant_norm, merchant_category,
                amount, natural_key, source_status, user_inclusion, classification_status
            ) values (?, ?, ?, ?, ?, ?, ?, 33000, ?, 'JUDGEABLE', 'AUTO', 'CLASSIFIED')
            """, id, batchId, userId, LocalDate.of(2025, 1, 1).plusDays(index * 13L),
            "가맹점" + index, "가맹점" + index, category, id.toString());
    }
}
