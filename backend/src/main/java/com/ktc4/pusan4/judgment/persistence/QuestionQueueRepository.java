package com.ktc4.pusan4.judgment.persistence;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

interface QuestionQueueRepository extends Repository<QuestionQueueEntity, UUID> {

    QuestionQueueEntity save(QuestionQueueEntity question);

    @Query("""
        select question
        from QuestionQueueEntity question,
             JudgmentEntity judgment,
             TransactionRecordEntity transaction,
             UploadBatchEntity batch
        where question.id = :questionId
          and question.judgmentId = judgment.id
          and judgment.transactionId = transaction.id
          and transaction.batchId = batch.id
          and batch.userId = :userId
        """)
    Optional<QuestionQueueEntity> findForUser(
        @Param("questionId") UUID questionId,
        @Param("userId") UUID userId
    );

    @Query("""
        select transaction.batchId
        from QuestionQueueEntity question,
             JudgmentEntity judgment,
             TransactionRecordEntity transaction
        where question.id = :questionId
          and question.judgmentId = judgment.id
          and judgment.transactionId = transaction.id
        """)
    UUID findBatchId(@Param("questionId") UUID questionId);

    // 새 revision 이 생기면 같은 거래의 이전 revision 에 남은 대기 질문은 더 필요 없다 (api.md 3.12).
    // 아직 필요한 질문은 새 revision 이 다시 만든다. 답한 질문(ANSWERED)은 이력이라 그대로 둔다.
    @Modifying
    @Query("""
        update QuestionQueueEntity question
        set question.status = 'CANCELED'
        where question.status = 'PENDING'
          and question.judgmentId in (
            select judgment.id
            from JudgmentEntity judgment
            where judgment.transactionId = :transactionId
              and judgment.id <> :judgmentId
          )
        """)
    int cancelPendingOfOtherRevisions(
        @Param("transactionId") UUID transactionId,
        @Param("judgmentId") UUID judgmentId
    );
}
