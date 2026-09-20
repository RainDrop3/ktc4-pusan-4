import type { Verdict } from './coded';

const AVAILABLE_LIKE = new Set([
  '해외SaaS', '국내SW', '여비교통', '도서', '교육', '광고', '사무용품', '임차료', '전문가수수료', '구독서비스',
]);
const UNAVAILABLE_LIKE = new Set(['지자체_과태료', '경찰청_범칙금', '조세', '의료', '게임', '여가', '미용']);

/**
 * 실제 6관문 룰카드 엔진(backend/judgment/domain)은 옮기지 않는다. mock은
 * docs/categories.md의 '세무 성격'을 대략 반영하는 카테고리→verdict 매핑 하나로
 * 재판정 결과를 흉내낸다 — 판정 로직의 정확성은 이 mock의 목적이 아니다.
 */
export function pickVerdictForCategory(category: string): Verdict {
  if (AVAILABLE_LIKE.has(category)) return 'AVAILABLE';
  if (UNAVAILABLE_LIKE.has(category)) return 'UNAVAILABLE';
  return 'NEEDS_REVIEW';
}

export interface MockJudgmentFields {
  blockedAtGate: string | null;
  account: string | null;
  finalAmount: number | null;
}

/**
 * verdict에 따른 account/finalAmount/blockedAtGate를 만드는 규칙 하나를 모든 mock 판정
 * 생성 경로(judgment-runs, classification-responses)가 공유한다 — 경로마다 따로 정하면
 * 같은 verdict인데 계정과목/금액 유무가 갈리는 불일치가 생긴다.
 */
export function mockJudgmentFields(verdict: Verdict, amount: number): MockJudgmentFields {
  if (verdict === 'AVAILABLE') return { blockedAtGate: null, account: '소모품비', finalAmount: amount };
  if (verdict === 'UNAVAILABLE') return { blockedAtGate: 'G1', account: null, finalAmount: null };
  return { blockedAtGate: 'G2', account: null, finalAmount: null };
}
