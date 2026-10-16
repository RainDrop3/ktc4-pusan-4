export type KbSample = 'full' | 'noSummary' | 'billing' | 'empty';
export type IbkSample = 'full' | 'billing' | 'noHeader';

export interface SampleFile {
  id: string;
  label: string;
  file: File;
}

export function buildKbXls(_variant: KbSample = 'full'): Promise<ArrayBuffer> {
  throw new Error('not implemented');
}

export function buildIbkHtml(_variant: IbkSample = 'full'): string {
  throw new Error('not implemented');
}

/** 목업 모드의 「샘플 파일로 해 보기」. 가짜 거래로 만든 파일이다 */
export async function sampleFiles(): Promise<SampleFile[]> {
  return [
  { id: 'kb', label: 'KB국민 승인내역', file: new File(['kb'], 'kb_sample.xls') },
  { id: 'ibk', label: 'IBK기업 승인내역', file: new File(['ibk'], 'ibk_sample.xls') },
  { id: 'billing', label: 'KB국민 청구내역', file: new File(['billing'], 'kb_billing_sample.xls') }];

}
