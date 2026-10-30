package com.ktc4.pusan4.merchant.classify;

import com.ktc4.pusan4.merchant.MerchantCategoryVocabulary;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 자동 확정 기준 known ≥ 0.99, confidence ≥ 0.995 (application.yml app.classify). 응답이 소수 둘째 자리라 사실상 1.00 이다.
 */
class AutoConfirmPolicyTest {

    private final AutoConfirmPolicy policy = new AutoConfirmPolicy(vocabulary(), 0.99, 0.995);

    @Test
    void known_and_confidence_at_the_threshold_confirm_the_top_category() {
        assertThat(policy.confirmedCategory(decision("음식점", 1.00, 0.99))).contains("음식점");
    }

    @Test
    void below_either_threshold_goes_to_review() {
        assertThat(policy.confirmedCategory(decision("음식점", 1.00, 0.98))).isEmpty();
        assertThat(policy.confirmedCategory(decision("음식점", 0.99, 0.99))).isEmpty();
        assertThat(policy.confirmedCategory(decision("음식점", 1.00, null))).isEmpty();
    }

    @Test
    void refused_goes_to_review_without_suggestions() {
        ModelDecision refused = new ModelDecision("음식점", 1.00, 1.00, List.of("음식점", "카페"), true, "m");

        assertThat(policy.confirmedCategory(refused)).isEmpty();
        assertThat(policy.suggestions(refused.refused(), refused.suggestions())).isEmpty();
    }

    @Test
    void top_category_outside_the_vocabulary_or_etc_goes_to_review() {
        assertThat(policy.confirmedCategory(decision("없는카테고리", 1.00, 1.00))).isEmpty();
        assertThat(policy.confirmedCategory(decision("기타", 1.00, 1.00))).isEmpty();
        assertThat(policy.confirmedCategory(decision("PG_미상", 1.00, 1.00))).isEmpty();
        assertThat(policy.confirmedCategory(decision(null, 1.00, 1.00))).isEmpty();
    }

    @Test
    void suggestions_keep_order_drop_invalid_and_stop_at_three() {
        List<String> raw = List.of("기타", "해외SaaS", "없는카테고리", "PG_미상", "미분류", "해외SaaS", "국내SW", "구독서비스",
            "온라인쇼핑");

        assertThat(policy.suggestions(false, raw)).containsExactly("해외SaaS", "국내SW", "구독서비스");
    }

    private static ModelDecision decision(String category, double confidence, Double known) {
        return new ModelDecision(category, confidence, known, List.of(), false, "m");
    }

    private static MerchantCategoryVocabulary vocabulary() {
        try {
            return MerchantCategoryVocabulary.load(Path.of("..", "rules"));
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
