package com.ktc4.pusan4.judgment.persistence;

import com.ktc4.pusan4.judgment.domain.Citation;
import com.ktc4.pusan4.judgment.domain.Judgment;
import com.ktc4.pusan4.shared.UuidGenerator;
import jakarta.persistence.NoResultException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class JudgmentService {

    private final JudgmentRepository judgmentRepository;
    private final TransactionRecordRepository transactionRepository;
    private final StatuteVersionRepository statuteVersionRepository;
    private final JudgmentCitationRepository citationRepository;
    private final QuestionQueueRepository questionRepository;
    private final UnmatchedLogRepository unmatchedLogRepository;
    private final UuidGenerator uuidGenerator;

    public JudgmentService(
        JudgmentRepository judgmentRepository,
        TransactionRecordRepository transactionRepository,
        StatuteVersionRepository statuteVersionRepository,
        JudgmentCitationRepository citationRepository,
        QuestionQueueRepository questionRepository,
        UnmatchedLogRepository unmatchedLogRepository,
        UuidGenerator uuidGenerator
    ) {
        this.judgmentRepository = judgmentRepository;
        this.transactionRepository = transactionRepository;
        this.statuteVersionRepository = statuteVersionRepository;
        this.citationRepository = citationRepository;
        this.questionRepository = questionRepository;
        this.unmatchedLogRepository = unmatchedLogRepository;
        this.uuidGenerator = uuidGenerator;
    }

    @Transactional
    public UUID save(SaveJudgmentCommand command) {
        return save(command, statuteVersions());
    }

    /** 여러 건을 저장하는 쪽은 statuteVersions 를 한 번 만들어 넘겨 조문 버전을 건마다 다시 읽지 않는다. */
    @Transactional
    UUID save(SaveJudgmentCommand command, StatuteVersions statuteVersions) {
        Judgment judgment = command.judgment();
        UUID judgmentId = uuidGenerator.generate();
        judgmentRepository.save(new JudgmentEntity(
            judgmentId,
            command,
            nextRevision(command.transactionId())
        ));

        saveCitations(judgmentId, judgment.citations(), command.statuteEffectiveDate(), statuteVersions);
        judgment.questions().forEach(question ->
            questionRepository.save(new QuestionQueueEntity(
                uuidGenerator.generate(), judgmentId, question
            ))
        );
        if (judgment.unmatchedReason() != null) {
            requireUnmatchedContext(command);
            unmatchedLogRepository.save(new UnmatchedLogEntity(judgmentId, command));
        }
        return judgmentId;
    }

    // 락 획득 순서 불변식: user(app_user) → transaction. 여기서 잡는 transaction 락은
    // 항상 user 락(UserFactPersistenceService.nextVersion) 다음에만 잡는다(데드락 방지).
    private int nextRevision(UUID transactionId) {
        transactionRepository.findByIdForUpdate(transactionId)
            .orElseThrow(NoResultException::new);
        return judgmentRepository.findNextRevision(transactionId);
    }

    StatuteVersions statuteVersions() {
        return new StatuteVersions(statuteVersionRepository);
    }

    private void saveCitations(
        UUID judgmentId, List<Citation> citations, LocalDate effectiveDate, StatuteVersions statuteVersions
    ) {
        List<Long> versionIds = citations.stream()
            .map(citation -> statuteVersions.effectiveVersionId(citation.statuteId(), effectiveDate))
            .toList();
        if (!versionIds.isEmpty()) {
            citationRepository.insertAll(judgmentId, versionIds);
        }
    }

    private static void requireUnmatchedContext(SaveJudgmentCommand command) {
        Objects.requireNonNull(command.merchantCategory(), "merchantCategory is required for unmatched log");
        Objects.requireNonNull(command.merchantRaw(), "merchantRaw is required for unmatched log");
        Objects.requireNonNull(command.industryCode(), "industryCode is required for unmatched log");
    }
}
