import type { AdapterResult, ParseStats, ParsedRow, RawRecord } from './types';

export function newStats(_sourceRows: number, _foreignOnlySkipped: number): ParseStats {
  throw new Error('not implemented');
}

export function markNonTransactions(_records: RawRecord[], _stats: ParseStats): RawRecord[] {
  throw new Error('not implemented');
}

export function resolveCancellations(_records: RawRecord[], _stats: ParseStats): RawRecord[] {
  throw new Error('not implemented');
}

export class MedicalMasker {
  mask(_merchant: string, _bizNo: string): string {
    throw new Error('not implemented');
  }

  get size(): number {
    throw new Error('not implemented');
  }
}

export function toRows(_records: RawRecord[], _stats: ParseStats): Promise<ParsedRow[]> {
  throw new Error('not implemented');
}

export function runPipeline(_adapter: AdapterResult): Promise<{rows: ParsedRow[];stats: ParseStats;}> {
  throw new Error('not implemented');
}
