import type { UploadBatchRequest } from '../types/domain';
import type { AdapterResult, ParsedRow, SourceCard, UnsendableCode, UnsendableRow } from './types';

export function unsendableOf(_row: ParsedRow): UnsendableCode | null {
  throw new Error('not implemented');
}

export function toRequest(
_rows: ParsedRow[],
_issuer: SourceCard,
_fileHash: string,
_declaredPeriod: AdapterResult['declaredPeriod'])
: {request: UploadBatchRequest | null;unsendable: UnsendableRow[];} {
  throw new Error('not implemented');
}
