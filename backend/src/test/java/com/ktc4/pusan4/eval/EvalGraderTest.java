package com.ktc4.pusan4.eval;

import com.ktc4.pusan4.eval.EvalGrader.Outcome;
import com.ktc4.pusan4.judgment.domain.Citation;
import com.ktc4.pusan4.judgment.domain.Gate;
import com.ktc4.pusan4.judgment.domain.Judgment;
import com.ktc4.pusan4.judgment.domain.TransactionInput;
import com.ktc4.pusan4.judgment.domain.UnmatchedReason;
import com.ktc4.pusan4.judgment.domain.UserContext;
import com.ktc4.pusan4.judgment.domain.Verdict;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class EvalGraderTest {

    private static EvalCase parkingFine(boolean critical, String status) {
        return new EvalCase(
            "E-T01", "G1", status, critical,
            new TransactionInput(UUID.randomUUID(), LocalDate.of(2025, 3, 14),
                "부산광역시청 주정차위반과태료", "지자체_과태료", 50_000),
            new UserContext("940909", false, null),
            List.of(),
            new EvalCase.Expectation(
                Verdict.UNAVAILABLE, true, Gate.G1,
                List.of("소득세법-33-1-2"), List.of("소득세법-33-1-12"),
                false, Map.of()
            )
        );
    }

    private static Judgment judgment(Verdict verdict, Gate gate, boolean inference, String... citations) {
        return new Judgment(
            verdict, gate, inference, inference ? UnmatchedReason.RULE_NOT_FOUND : null, null,
            List.of(), List.of(), List.of(citations).stream().map(Citation::new).toList(),
            Map.of(), List.of()
        );
    }

    @Test
    void exact_match() {
        EvalGrader.Grade grade = EvalGrader.grade(parkingFine(true, "미검수"),
            judgment(Verdict.UNAVAILABLE, Gate.G1, false, "소득세법-33-1-2"));

        assertThat(grade.outcome()).isEqualTo(Outcome.MATCH);
    }

    @Test
    void needs_review_on_critical_case_is_shortfall_so_ci_passes_without_cards() {
        EvalGrader.Grade grade = EvalGrader.grade(parkingFine(true, "미검수"),
            judgment(Verdict.NEEDS_REVIEW, Gate.G2, true));

        assertThat(grade.outcome()).isEqualTo(Outcome.SHORTFALL);
    }

    @Test
    void available_when_expected_unavailable_is_critical() {
        EvalGrader.Grade grade = EvalGrader.grade(parkingFine(false, "미검수"),
            judgment(Verdict.AVAILABLE, null, false, "소득세법-27-1"));

        assertThat(grade.outcome()).isEqualTo(Outcome.CRITICAL);
        assertThat(grade.problems()).anyMatch(problem -> problem.startsWith("오탐"));
    }

    @Test
    void unavailable_when_expected_available_is_critical() {
        EvalCase base = parkingFine(false, "미검수");
        EvalCase expectedAvailable = new EvalCase(base.id(), base.group(), base.reviewStatus(), base.critical(),
            base.transaction(), base.context(), base.facts(),
            new EvalCase.Expectation(Verdict.AVAILABLE, false, null, List.of(), List.of(), false, Map.of()));

        EvalGrader.Grade grade = EvalGrader.grade(expectedAvailable,
            judgment(Verdict.UNAVAILABLE, Gate.G1, false, "소득세법-33-1-2"));

        assertThat(grade.outcome()).isEqualTo(Outcome.CRITICAL);
        assertThat(grade.problems()).anyMatch(problem -> problem.startsWith("미탐"));
    }

    @Test
    void citing_excluded_statute_is_critical_even_with_right_verdict() {
        EvalGrader.Grade grade = EvalGrader.grade(parkingFine(false, "미검수"),
            judgment(Verdict.UNAVAILABLE, Gate.G1, false, "소득세법-33-1-12"));

        assertThat(grade.outcome()).isEqualTo(Outcome.CRITICAL);
    }

    @Test
    void final_verdict_without_citation_is_critical() {
        EvalGrader.Grade grade = EvalGrader.grade(parkingFine(false, "미검수"),
            judgment(Verdict.UNAVAILABLE, Gate.G1, false));

        assertThat(grade.outcome()).isEqualTo(Outcome.CRITICAL);
    }

    @Test
    void wrong_path_on_critical_case_with_final_verdict_is_critical() {
        EvalGrader.Grade grade = EvalGrader.grade(parkingFine(true, "미검수"),
            judgment(Verdict.UNAVAILABLE, Gate.G1, false, "소득세법-33-1-4"));

        assertThat(grade.outcome()).isEqualTo(Outcome.CRITICAL);
        assertThat(grade.problems()).contains("근거 누락: 소득세법-33-1-2");
    }

    @Test
    void wrong_path_on_non_critical_case_is_shortfall() {
        EvalGrader.Grade grade = EvalGrader.grade(parkingFine(false, "미검수"),
            judgment(Verdict.UNAVAILABLE, Gate.G1, false, "소득세법-33-1-4"));

        assertThat(grade.outcome()).isEqualTo(Outcome.SHORTFALL);
    }

    @Test
    void on_hold_case_is_not_graded() {
        EvalGrader.Grade grade = EvalGrader.grade(parkingFine(true, "보류"),
            judgment(Verdict.AVAILABLE, null, false));

        assertThat(grade.outcome()).isEqualTo(Outcome.ON_HOLD);
    }
}
