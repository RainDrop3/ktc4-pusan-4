export const formatWon = (amount: number): string =>
`${amount.toLocaleString('ko-KR')}원`;

export const formatNumber = (value: number): string =>
value.toLocaleString('ko-KR');

export const formatDate = (iso: string): string => {
  const [, month, day] = iso.split('-');
  return `${Number(month)}월 ${Number(day)}일`;
};

export const formatFullDate = (iso: string): string => {
  const [year, month, day] = iso.split('-');
  return `${year}. ${month}. ${day}`;
};

export const formatPeriod = (start: string, end: string): string =>
`${formatFullDate(start)} – ${formatFullDate(end)}`;

/** 낱말 뒤에 붙일 「로」·「으로」. 받침이 있으면(ㄹ 제외) 「으로」 — 가능으로, 불가로, 「개인」으로 */
export const ro = (word: string): '로' | '으로' => {
  const last = word.charCodeAt(word.length - 1) - 0xac00;
  const coda = last >= 0 && last < 11172 ? last % 28 : 0;
  return coda === 0 || coda === 8 ? '로' : '으로';
};
