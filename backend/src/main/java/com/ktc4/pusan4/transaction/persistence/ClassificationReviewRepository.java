package com.ktc4.pusan4.transaction.persistence;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

interface ClassificationReviewRepository extends Repository<ClassificationReviewEntity, UUID> {

    boolean existsByTransactionIdAndStatus(UUID transactionId, String status);

    /**
     * 이 batch 의 분류 확인 요청과 거래 요약. 정렬: createdAt ASC, id ASC (api.md 3.5).
     * 지금 판정 대상(effectiveStatus = JUDGEABLE)인 거래만 본다. 제외한 거래의 요청은 지우지 않고 여기서 거른다.
     */
    @Query("""
        select new com.ktc4.pusan4.transaction.persistence.ClassificationReviewRepository$ReviewRow(
            review.id, transaction.batchId, transaction.id, review.status, review.createdAt, review.resolvedAt,
            transaction.approvedAt, transaction.merchantRaw, transaction.merchantNorm, transaction.merchantCategory,
            transaction.amount, transaction.installmentMonths)
        from ClassificationReviewEntity review, TransactionRecordEntity transaction
        where review.transactionId = transaction.id
          and transaction.userId = :userId
          and transaction.batchId = :batchId
          and (
            (transaction.sourceStatus = 'JUDGEABLE' and transaction.userInclusion <> 'EXCLUDED')
            or (transaction.sourceStatus = 'EXCLUDED' and transaction.userInclusion = 'INCLUDED')
          )
        order by review.createdAt, review.id
        """)
    List<ReviewRow> findRows(@Param("userId") UUID userId, @Param("batchId") UUID batchId);

    /** batchId 없이 부르면 사용자의 모든 batch. 정렬은 {@link #findRows(UUID, UUID)} 와 같다. */
    @Query("""
        select new com.ktc4.pusan4.transaction.persistence.ClassificationReviewRepository$ReviewRow(
            review.id, transaction.batchId, transaction.id, review.status, review.createdAt, review.resolvedAt,
            transaction.approvedAt, transaction.merchantRaw, transaction.merchantNorm, transaction.merchantCategory,
            transaction.amount, transaction.installmentMonths)
        from ClassificationReviewEntity review, TransactionRecordEntity transaction
        where review.transactionId = transaction.id
          and transaction.userId = :userId
          and (
            (transaction.sourceStatus = 'JUDGEABLE' and transaction.userInclusion <> 'EXCLUDED')
            or (transaction.sourceStatus = 'EXCLUDED' and transaction.userInclusion = 'INCLUDED')
          )
        order by review.createdAt, review.id
        """)
    List<ReviewRow> findRows(@Param("userId") UUID userId);

    record ReviewRow(
        UUID reviewId,
        UUID batchId,
        UUID transactionId,
        String status,
        OffsetDateTime createdAt,
        OffsetDateTime resolvedAt,
        LocalDate approvedAt,
        String merchantRaw,
        String merchantNorm,
        String merchantCategory,
        long amount,
        int installmentMonths
    ) {
    }
}
