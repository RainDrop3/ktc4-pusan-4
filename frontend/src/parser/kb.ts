import type { WorkSheet } from 'xlsx';
import type { AdapterResult, Grid } from './types';

export type XlsxModule = typeof import('xlsx');

/** SheetJS 는 업로드 화면에서만 필요하다. 처음 쓸 때 불러온다 */
export function loadXlsx(): Promise<XlsxModule> {
  throw new Error('not implemented');
}

export function gridFromSheet(_xlsx: XlsxModule, _sheet: WorkSheet): Grid {
  throw new Error('not implemented');
}

export function kbHeaders(_grid: Grid): string[] {
  throw new Error('not implemented');
}

export function kbRecords(_grid: Grid): Omit<AdapterResult, 'headers' | 'declaredPeriod'> {
  throw new Error('not implemented');
}

export function kbDeclaredPeriod(_grid: Grid): AdapterResult['declaredPeriod'] {
  throw new Error('not implemented');
}

export function readKb(_bytes: ArrayBuffer): Promise<AdapterResult> {
  throw new Error('not implemented');
}
