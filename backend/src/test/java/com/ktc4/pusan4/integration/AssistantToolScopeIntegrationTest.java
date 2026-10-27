package com.ktc4.pusan4.integration;

import com.ktc4.pusan4.auth.AccessTokens;
import com.ktc4.pusan4.judgment.domain.JudgmentOrigin;
import com.ktc4.pusan4.judgment.domain.JudgmentOriginType;
import com.ktc4.pusan4.judgment.persistence.JudgmentExecutor;
import com.ktc4.pusan4.user.domain.BusinessContext;
import com.ktc4.pusan4.user.persistence.BusinessContextService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * 비서의 조회 도구가 부르는 공개 API 는 다른 사용자의 데이터를 돌려주지 않는다 (agent-secretary.md QR-12).
 * 도구는 사용자 토큰으로 이 API 들을 부르므로(ai/assistant/tools.py), 여기가 비서의 사용자 경계다.
 * 다른 사용자의 업로드·거래·판정·질문을 만들어 두고, 고정 사용자로 그 ID 를 넣어 불러도 응답에 나오지 않는지 본다.
 * /classification-reviews 는 아직 목 응답이고(#156), /statutes 는 사용자 데이터가 아니라 뺐다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class AssistantToolScopeIntegrationTest {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17-alpine");

    private static final String THEIR_MERCHANT = "남의가맹점";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private JudgmentExecutor executor;

    @Autowired
    private BusinessContextService contextService;

    @Autowired
    private AccessTokens accessTokens;

    @ParameterizedTest
    @ValueSource(strings = {
        "/api/v1/transactions/{tx}",
        "/api/v1/transactions?batchId={batch}",
        "/api/v1/transactions?year=2025",
        "/api/v1/judgments?transactionId={tx}",
        "/api/v1/judgments?batchId={batch}",
        "/api/v1/judgments/summary?batchId={batch}",
        "/api/v1/judgments/summary?year=2025",
        "/api/v1/questions?transactionId={tx}&status=PENDING",
        "/api/v1/questions?batchId={batch}&status=PENDING&grouped=true",
        "/api/v1/questions/suggestions?batchId={batch}",
        "/api/v1/progress?batchId={batch}"
    })
    void another_users_data_never_reaches_the_assistant_tools(String template) throws Exception {
        Theirs theirs = theirs();

        MvcResult result = mockMvc.perform(get(template.replace("{tx}", theirs.transactionId.toString())
            .replace("{batch}", theirs.batchId.toString()))).andReturn();

        String body = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(result.getResponse().getStatus()).isIn(200, 404);
        assertThat(body).doesNotContain(theirs.transactionId.toString(), THEIR_MERCHANT, theirs.judgmentId.toString());
    }

    @Test
    void the_owner_does_see_it_so_the_checks_above_are_meaningful() throws Exception {
        Theirs theirs = theirs();
        String ownerToken = "Bearer " + accessTokens.issue(theirs.userId);

        String questions = mockMvc.perform(get("/api/v1/questions")
                .param("transactionId", theirs.transactionId.toString())
                .header("Authorization", ownerToken))
            .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat(questions).contains(theirs.transactionId.toString());
    }

    /** 다른 사용자의 카페 결제 하나. 판정하고 대기 질문까지 만든다. */
    private Theirs theirs() {
        jdbcTemplate.update("""
            insert into statute_version(
                statute_id, doc_type, hierarchy, effective_from, body, body_hash,
                doc_id, unit_level, title, source_url
            ) values (?, '법령', '법률', '2024-01-01', '원문', 'hash', 'DOC', '호', ?, 'https://law.go.kr/test')
            on conflict do nothing
            """, "소득세법-33-1-5", "소득세법-33-1-5");
        jdbcTemplate.update("""
            insert into statute_version(
                statute_id, doc_type, hierarchy, effective_from, body, body_hash,
                doc_id, unit_level, title, source_url
            ) values (?, '법령', '법률', '2024-01-01', '원문', 'hash', 'DOC', '호', ?, 'https://law.go.kr/test')
            on conflict do nothing
            """, "소득세법시행령-61-1-1", "소득세법시행령-61-1-1");
        UUID userId = UUID.randomUUID();
        jdbcTemplate.update("insert into app_user(id, email) values (?, ?)", userId, userId + "@example.com");
        UUID batchId = UUID.randomUUID();
        jdbcTemplate.update("""
            insert into upload_batch(id, user_id, source_type, card_issuer, period_start, period_end, file_hash)
            values (?, ?, '승인내역', '국민', '2025-10-01', '2025-10-31', ?)
            """, batchId, userId, batchId.toString());
        UUID contextId = UUID.randomUUID();
        jdbcTemplate.update("""
            insert into user_context(
                id, user_id, industry_code, prev_year_revenue, business_open_date,
                bookkeeping_duty, has_employee, version
            ) values (?, ?, '940909', 30000000, '2023-01-01', '간편장부', false, 1)
            """, contextId, userId);
        BusinessContext context = contextService.find(userId, contextId);
        UUID runId = UUID.randomUUID();
        jdbcTemplate.update("""
            insert into judgment_run(id, batch_id, context_id, context_version, status, total_count)
            values (?, ?, ?, 1, 'COMPLETED', 1)
            """, runId, batchId, contextId);
        UUID transactionId = UUID.randomUUID();
        jdbcTemplate.update("""
            insert into transaction(
                id, batch_id, user_id, approved_at, merchant_raw, merchant_norm, merchant_category,
                amount, natural_key, source_status, user_inclusion, classification_status
            ) values (?, ?, ?, '2025-10-08', ?, ?, '카페', 6500, ?, 'JUDGEABLE', 'AUTO', 'CLASSIFIED')
            """, transactionId, batchId, userId, THEIR_MERCHANT, THEIR_MERCHANT, transactionId.toString());
        UUID judgmentId = executor.judge(transactionId, context, new JudgmentOrigin(JudgmentOriginType.RUN, runId));
        return new Theirs(userId, batchId, transactionId, judgmentId);
    }

    private record Theirs(UUID userId, UUID batchId, UUID transactionId, UUID judgmentId) {
    }
}
