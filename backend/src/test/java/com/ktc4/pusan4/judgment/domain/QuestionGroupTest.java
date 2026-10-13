package com.ktc4.pusan4.judgment.domain;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static com.ktc4.pusan4.judgment.domain.QuestionFixtures.question;
import static com.ktc4.pusan4.judgment.domain.QuestionFixtures.uuid;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

class QuestionGroupTest {

    @Test
    void groups_by_group_key_fact_type_and_status_in_order_of_first_question() {
        // given: 같은 가맹점의 대기 질문 둘(거래일 역순), 답한 질문 하나, 다른 factType 하나
        Question later = question(1, uuid(102), LocalDate.parse("2025-10-20"), 3_000L, QuestionStatus.PENDING);
        Question earlier = question(2, uuid(101), LocalDate.parse("2025-10-01"), 10_000L, QuestionStatus.PENDING);
        Question answered = question(3, uuid(103), 7_000L, QuestionStatus.ANSWERED);
        Question proof = withFactType(question(4, uuid(101), 10_000L, QuestionStatus.PENDING), "증빙유무");

        // when
        List<QuestionGroup> groups = QuestionGroup.group(List.of(later, earlier, answered, proof));

        // then: 상태·factType 이 다르면 다른 그룹이고, 그룹 안 거래는 거래일 순이다
        assertThat(groups).extracting(QuestionGroup::status, QuestionGroup::factType, QuestionGroup::questionIds)
            .containsExactly(
                tuple(QuestionStatus.PENDING, "용도", List.of(earlier.id(), later.id())),
                tuple(QuestionStatus.ANSWERED, "용도", List.of(answered.id())),
                tuple(QuestionStatus.PENDING, "증빙유무", List.of(proof.id()))
            );
        assertThat(groups.getFirst().count()).isEqualTo(2);
        assertThat(groups.getFirst().totalAmount()).isEqualTo(13_000L);
    }

    @Test
    void bulk_answerable_only_when_pending_and_no_transaction_awaits_explanation() {
        // given: 같은 그룹이 될 대기 질문 둘 중 하나가 소명 대기 거래의 질문이다
        Question normal = question(1, uuid(101), 10_000L, QuestionStatus.PENDING);
        Question awaiting = awaitingExplanation(question(2, uuid(102), 3_000L, QuestionStatus.PENDING));

        // when / then
        assertThat(QuestionGroup.group(List.of(normal)).getFirst().bulkAnswerable()).isTrue();
        assertThat(QuestionGroup.group(List.of(normal, awaiting)).getFirst().bulkAnswerable()).isFalse();
        assertThat(QuestionGroup.group(List.of(question(3, uuid(103), 1_000L, QuestionStatus.ANSWERED)))
            .getFirst().bulkAnswerable()).isFalse();
    }

    @Test
    void answered_group_shares_the_answer_and_pending_group_has_none() {
        // when
        QuestionGroup answered = QuestionGroup.group(List.of(question(1, uuid(101), 1_000L, QuestionStatus.ANSWERED)))
            .getFirst();
        QuestionGroup pending = QuestionGroup.group(List.of(question(2, uuid(102), 1_000L, QuestionStatus.PENDING)))
            .getFirst();

        // then
        assertThat(answered.answer()).isEqualTo("사업");
        assertThat(pending.answer()).isNull();
    }

    private static Question awaitingExplanation(Question question) {
        return new Question(question.id(), question.batchId(), question.transactionId(), question.groupKey(),
            question.factType(), question.questionText(), question.options(), question.status(),
            question.answeredFactId(), question.answer(), question.createdAt(), question.answeredAt(),
            question.transaction(), question.overridden(), true);
    }

    private static Question withFactType(Question question, String factType) {
        return new Question(question.id(), question.batchId(), question.transactionId(), question.groupKey(), factType,
            question.questionText(), question.options(), question.status(), question.answeredFactId(),
            question.answer(), question.createdAt(), question.answeredAt(), question.transaction(),
            question.overridden(), question.awaitingExplanation());
    }
}
