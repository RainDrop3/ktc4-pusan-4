import type { ParseOutcome, ParsedRow } from './types';

export type {
  BlockedCode,
  BlockedOutcome,
  ParseOutcome,
  ParseStats,
  ParsedOutcome,
  ParsedRow,
  ParserStatus,
  SourceCard,
  UnsendableCode,
  UnsendableRow } from
'./types';
export { sampleFiles } from './samples';
export type { SampleFile } from './samples';

export async function parseCardBytes(_bytes: ArrayBuffer): Promise<ParseOutcome> {
  throw new Error('not implemented');
}

// 골격 단계의 자리표시: 파일 이름으로 정해 둔 결과를 돌려준다. 파서가 붙으면 parseCardBytes 를 부른다.
const row = (fields: Partial<ParsedRow>): ParsedRow => ({
  approvedAt: '2026-01-03',
  rawMerchant: '스타벅스코리아 서면점',
  amount: 11000,
  installmentMonths: 0,
  approvalNo: '78968731',
  naturalKey: '721607a430d35bfd',
  bizNo: '',
  memo: '',
  sourceCard: 'kb',
  status: '판정대상',
  isAggregated: false,
  needsReview: false,
  reviewReason: '',
  isCancel: false,
  masked: false,
  ...fields
});

export async function parseCardFile(file: Blob): Promise<ParseOutcome> {
  const name = file instanceof File ? file.name : '';
  if (name.includes('billing')) {
    return { kind: 'blocked', statement: '청구내역', code: 'BILLING', why: '청구 컬럼(청구금액) 있고 가맹점명 없음', detected: 'kb' };
  }
  if (name.includes('unknown')) {
    return { kind: 'blocked', statement: '판별불가', code: 'UNKNOWN_FORMAT', why: '형식 판별 실패', detected: 'unknown' };
  }
  const rows = [
  row({}),
  row({ approvedAt: '2026-01-05', rawMerchant: '의료_마스킹_01', amount: 15000, approvalNo: '10000002', naturalKey: '65d6a6efc6f1a70f', masked: true }),
  row({ approvedAt: '', rawMerchant: 'GS25 서면점', amount: 3000, approvalNo: '30000004', naturalKey: '' })];

  const sent = rows.slice(0, 2);
  return {
    kind: 'parsed',
    issuer: 'kb',
    rows,
    request: {
      sourceType: '승인내역',
      cardIssuer: '국민',
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
      fileHash: `sha256:${'0'.repeat(64)}`,
      transactions: sent.map((r) => ({
        approvedAt: r.approvedAt,
        merchantRaw: r.rawMerchant,
        amount: r.amount ?? 0,
        naturalKey: r.naturalKey,
        status: 'JUDGEABLE',
        installmentMonths: r.installmentMonths,
        approvalNo: r.approvalNo,
        bizNo: r.bizNo,
        memo: r.memo,
        isAggregated: r.isAggregated,
        needsReview: r.needsReview,
        reviewReason: r.reviewReason,
        sourceCard: r.sourceCard
      }))
    },
    unsendable: [{ index: 2, code: 'NO_DATE', row: rows[2] }],
    stats: {
      sourceRows: 3,
      foreignOnlySkipped: 0,
      kept: 3,
      byStatus: { 판정대상: 3, 취소상계: 0, 대상제외: 0 },
      nonTransaction: 0,
      cancels: 0,
      cancelsPaired: 0,
      cancelsAmbiguous: 0,
      cancelsUnpaired: 0,
      noAmount: 0,
      noDate: 1,
      aggregated: 0,
      medicalMasked: 1,
      needsReview: 0
    }
  };
}
