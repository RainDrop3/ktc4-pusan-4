import type { DetectedFormat, StatementVerdict } from './types';

/** 파일 앞부분으로 카드사 형식을 고른다. KB 는 바이너리 xls, IBK 는 HTML 표다 */
export function detectFormat(_bytes: Uint8Array): DetectedFormat {
  throw new Error('not implemented');
}

/** 헤더로 승인내역 / 청구내역 / 판별불가를 가른다 (tools/parsers classify_statement) */
export function classifyStatement(_headers: readonly string[]): StatementVerdict {
  throw new Error('not implemented');
}
