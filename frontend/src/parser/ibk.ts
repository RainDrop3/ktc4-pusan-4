import type { AdapterResult } from './types';

export function decodeIbk(_bytes: ArrayBuffer): string {
  throw new Error('not implemented');
}

export function bsText(_element: Element): string {
  throw new Error('not implemented');
}

export function ibkHeaders(_doc: Document): string[] {
  throw new Error('not implemented');
}

export function ibkRecords(_doc: Document): Omit<AdapterResult, 'headers' | 'declaredPeriod'> {
  throw new Error('not implemented');
}

export function readIbk(_html: string): AdapterResult {
  throw new Error('not implemented');
}
