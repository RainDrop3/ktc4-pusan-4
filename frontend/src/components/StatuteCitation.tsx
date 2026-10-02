import { ExternalLinkIcon } from 'lucide-react';
import { api, useApi } from '../api';
import type { StatuteHierarchy } from '../types/domain';
import { Badge } from './ui/Badge';
import { cn } from './ui/cn';

interface StatuteCitationProps {
  statuteVersionId: number;
  /** 목록에서는 본문을 접고 상세에서만 펼친다 */
  showBody?: boolean;
}

/**
 * 근거 위계 (CONTEXT.md §6). 나누지 않으면 사용자가 판례·예규를 법령과 같은 무게로 읽는다.
 * 법령만 「근거」이고, 국세청 해석기준과 개별 사건 판단은 「참고」로 낮춰 보여준다.
 */
const TIER: Record<StatuteHierarchy, { label: string; note?: string }> = {
  법률: { label: '근거' },
  시행령: { label: '근거' },
  시행규칙: { label: '근거' },
  기본통칙: { label: '참고 해석기준', note: '국세청 해석기준이며 법적 구속력은 없습니다' },
  고시: { label: '참고 해석기준', note: '국세청 해석기준이며 법적 구속력은 없습니다' },
  예규: { label: '참고 해석기준', note: '국세청 해석기준이며 법적 구속력은 없습니다' },
  심판례: { label: '참고 사례', note: '개별 사건의 판단입니다' },
  판례: { label: '참고 사례', note: '개별 사건의 판단입니다' }
};

/** 판정 근거 조문 1건. GET /statutes/{statuteVersionId} 응답을 그대로 보여준다. */
export function StatuteCitation({
  statuteVersionId,
  showBody = true
}: StatuteCitationProps) {
  const { data: statute } = useApi(
    () => api.statutes.get(statuteVersionId),
    [statuteVersionId]
  );
  if (!statute) return null;

  const tier = TIER[statute.hierarchy];
  const binding = tier.note === undefined;

  return (
    <article
      className={cn(
        'rounded-xl border border-line p-3.5',
        binding ? 'bg-surface' : 'bg-canvas'
      )}>

      <header className="flex flex-wrap items-center gap-2">
        <Badge tone={binding ? 'ink' : 'neutral'}>{tier.label}</Badge>
        <h4 className="text-small font-semibold text-ink">{statute.title}</h4>
      </header>

      {showBody &&
      <p className="mt-2 text-small leading-6 text-ink2">{statute.body}</p>
      }

      <footer className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption tabular-nums text-muted">
        {tier.note && <span>{tier.note}</span>}
        <span>
          시행 {statute.effectiveFrom}
          {statute.effectiveTo ? ` – ${statute.effectiveTo}` : ' – 현행'}
        </span>
        <span>버전 #{statute.statuteVersionId}</span>
        <a
          href={statute.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-accent hover:underline">

          국가법령정보
          <ExternalLinkIcon className="h-3 w-3" aria-hidden="true" />
        </a>
      </footer>
    </article>);

}
