package com.ktc4.pusan4.merchant.classify;

import com.ktc4.pusan4.merchant.MerchantCategoryVocabulary;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * 모델 답을 어떻게 쓸지 정한다 (docs/category_decision_eval.md). DB 를 보지 않는다.
 *
 * <p>known·confidence 가 둘 다 기준 이상이고 top-1 이 쓸 수 있는 카테고리면 분류 확인 없이 확정한다.
 * 아니면 분류 확인으로 보내고 후보를 최대 3개 보여 준다.
 * 쓸 수 있는 카테고리는 허용 어휘({@code categories.yaml}) 에서 {@code 기타}·{@code PG_미상} 을 뺀 것이다.
 * {@code 미분류} 는 허용 어휘에 없어 따로 빼지 않아도 걸러진다.
 */
@Component
public class AutoConfirmPolicy {

    private static final Set<String> NOT_A_DECISION = Set.of("기타", "PG_미상");
    private static final int MAX_SUGGESTIONS = 3;

    private final MerchantCategoryVocabulary vocabulary;
    private final double knownMin;
    private final double confidenceMin;

    public AutoConfirmPolicy(
        MerchantCategoryVocabulary vocabulary,
        @Value("${app.classify.known-min}") double knownMin,
        @Value("${app.classify.confidence-min}") double confidenceMin
    ) {
        this.vocabulary = vocabulary;
        this.knownMin = knownMin;
        this.confidenceMin = confidenceMin;
    }

    /** 확정할 카테고리. 분류 확인으로 보내면 비어 있다. */
    public Optional<String> confirmedCategory(ModelDecision decision) {
        boolean sure = !decision.refused()
            && decision.known() != null && decision.known() >= knownMin
            && decision.confidence() >= confidenceMin;
        return sure && usable(decision.category()) ? Optional.of(decision.category()) : Optional.empty();
    }

    /** 분류 확인 화면의 후보. 거절했으면 없다. */
    public List<String> suggestions(boolean refused, List<String> suggestions) {
        if (refused) {
            return List.of();
        }
        return suggestions.stream().filter(this::usable).distinct().limit(MAX_SUGGESTIONS).toList();
    }

    private boolean usable(String category) {
        return category != null && vocabulary.contains(category) && !NOT_A_DECISION.contains(category);
    }
}
