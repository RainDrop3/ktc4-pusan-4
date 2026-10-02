import { useEffect, useState } from 'react';
import { ArrowRightIcon, CopyCheckIcon, CopyIcon, SearchXIcon } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Button, Empty, Table, type Column } from '../components/ui';
import { useSession } from '../contexts/SessionContext';
import { api, useApi } from '../api';
import type { BusinessContext, JudgmentSummary, UploadBatch, UnresolvedSummary } from '../types/domain';
import { formatNumber, formatPeriod, formatWon } from '../utils/format';

type AccountRow = JudgmentSummary['byAccount'][number];

/** 한 달 배치면 「2026년 1월」, 아니면 기간 그대로 */
const periodLabel = (batch: UploadBatch) => {
  const [startYear, startMonth] = batch.periodStart.split('-');
  const [endYear, endMonth] = batch.periodEnd.split('-');
  return startYear === endYear && startMonth === endMonth ?
  `${startYear}년 ${Number(startMonth)}월` :
  formatPeriod(batch.periodStart, batch.periodEnd);
};

/**
 * 세무대리인에게 넘길 문장. 화면에 보이는 숫자와 문진 응답만으로 만든다.
 * 판정하지 않은 것을 판정한 것처럼 말하지 않는다.
 */
const handoffText = (
period: string | null,
summary: JudgmentSummary,
unresolved: UnresolvedSummary | undefined,
context: BusinessContext | null | undefined) =>
{
  const { AVAILABLE, UNAVAILABLE, NEEDS_REVIEW } = summary.byVerdict;
  const lines = [
  `${period ? `${period} ` : ''}카드내역 ${formatNumber(summary.totalCount)}건을 규칙으로 판정했습니다.`,
  `필요경비로 볼 수 있는 것 ${formatNumber(AVAILABLE.count)}건(${formatWon(AVAILABLE.finalAmount)}), 볼 수 없는 것 ${formatNumber(UNAVAILABLE.count)}건, 근거를 확정하지 못한 것 ${formatNumber(NEEDS_REVIEW.count)}건입니다.`];

  if (unresolved && unresolved.count > 0)
  lines.push(
    `확정하지 못한 것 중 ${formatNumber(unresolved.count)}건(${formatWon(unresolved.amount)})은 사용 목적 등을 아직 답하지 않았습니다.`
  );
  if (context)
  lines.push(
    `문진 응답: 업종코드 ${context.industryCode}, ${context.bookkeepingDuty} 대상, 직원 ${
    context.hasEmployee ? '있음' : '없음'}, 자택 작업공간 비율 ${
    context.homeOfficeRatio ? `${context.homeOfficeRatio}%` : '해당 없음'}.`
  );
  return lines.join(' ');
};

/**
 * 3.7 판정 결과 요약.
 * batchId 로 거래별 현재 판정을 집계한다. 한도 잔량·감가상각 스케줄은 API 가 없어
 * 보여주지 않는다 — 응답에 없는 숫자를 화면에 두지 않는다.
 */
export function Summary() {
  const { batchId } = useSession();
  const [copy, setCopy] = useState<'idle' | 'done' | 'failed'>('idle');

  const batchQ = useApi(
    () => batchId ? api.uploads.get(batchId) : Promise.resolve(null),
    [batchId]
  );
  const summaryQ = useApi(
    () => batchId ? api.judgments.summary({ batchId }) : Promise.resolve(null),
    [batchId]
  );
  const questionsQ = useApi(
    () =>
    batchId ?
    api.questions.grouped({ batchId, status: 'PENDING', size: 1 }) :
    Promise.resolve(null),
    [batchId]
  );
  const contextQ = useApi(() => api.contexts.current(), []);

  // 「복사했습니다」는 잠깐만 보여준다
  useEffect(() => {
    if (copy === 'idle') return;
    const timer = window.setTimeout(() => setCopy('idle'), 2000);
    return () => window.clearTimeout(timer);
  }, [copy]);

  const summary = summaryQ.data;
  const unresolved = questionsQ.data?.unresolved;
  const period = batchQ.data ? periodLabel(batchQ.data) : null;

  const header =
  <header>
      <p className="text-small font-semibold text-accent">4단계 · 반영</p>
      <h1 className="mt-1.5 text-h2 font-bold tracking-tight text-ink">
        {period ? `${period} 요약` : '판정 요약'}
      </h1>
    </header>;


  if (!batchId || summaryQ.error || summary?.totalCount === 0) {
    return (
      <AppShell>
        {header}
        <Empty
          className="mt-6"
          icon={<SearchXIcon className="h-5 w-5" />}
          {...!batchId ?
          {
            title: '올린 카드내역이 없습니다',
            description: '카드내역을 올리고 판정을 마치면 요약이 여기에 나옵니다.',
            action:
            <Button to="/upload" size="sm" variant="secondary">
                    카드내역 올리기
                  </Button>

          } :
          summaryQ.error ?
          {
            title: '요약을 불러오지 못했습니다',
            description: '잠시 후 다시 시도해 주세요. 계속 안 되면 새로고침해 주세요.',
            action:
            <Button size="sm" variant="secondary" onClick={summaryQ.reload}>
                    다시 시도
                  </Button>

          } :
          {
            title: '아직 판정한 거래가 없습니다',
            description: '분류 확인과 사업자 문진을 마친 뒤 판정을 실행하면 요약이 나옵니다.',
            action:
            <Button to="/confirm" size="sm" variant="secondary">
                    판정하러 가기
                  </Button>

          }} />

      </AppShell>);

  }

  const counts = {
    available: summary?.byVerdict.AVAILABLE.count ?? 0,
    needsReview: summary?.byVerdict.NEEDS_REVIEW.count ?? 0,
    unavailable: summary?.byVerdict.UNAVAILABLE.count ?? 0
  };
  const total = summary?.totalCount ?? 0;

  const distribution = [
  { label: '가능', value: counts.available, bar: 'bg-ok' },
  { label: '확인 필요', value: counts.needsReview, bar: 'bg-warn' },
  { label: '불가', value: counts.unavailable, bar: 'bg-deny' }];


  const accountColumns: Column<AccountRow>[] = [
  {
    header: '계정과목',
    cell: (row) => <span className="font-medium text-ink">{row.account}</span>
  },
  {
    header: '건수',
    align: 'right',
    width: 'w-20',
    cell: (row) => <span className="text-ink2">{formatNumber(row.count)}건</span>
  },
  {
    header: '인정 금액',
    align: 'right',
    width: 'w-36',
    cell: (row) =>
    <span className="whitespace-nowrap font-semibold text-ink">
          {formatWon(row.finalAmount)}
        </span>

  }];


  const text = summary ? handoffText(period, summary, unresolved, contextQ.data) : '';

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopy('done');
    } catch {
      setCopy('failed');
    }
  };

  return (
    <AppShell>
      {header}

      <section className="mt-6 rounded-2xl border border-line bg-surface p-6">
        <p className="text-small text-muted">현재까지 인정된 필요경비</p>
        {summary ?
        <p className="mt-1.5 text-stat font-bold tabular-nums text-ink">
            {formatWon(summary.byVerdict.AVAILABLE.finalAmount)}
          </p> :

        <span className="mt-1.5 block h-9 w-48 animate-pulse rounded bg-line2" />
        }
        <p className="mt-2 text-small tabular-nums text-muted">
          전체 {formatNumber(total)}건 중 가능으로 판정한 것만 더했습니다.
        </p>

        {unresolved && unresolved.count > 0 &&
        <p className="mt-4 rounded-xl border border-warn-line bg-warn-bg px-4 py-3 text-small text-ink2">
            <strong className="font-semibold text-warn">
              미확정 {formatNumber(unresolved.count)}건 · {formatWon(unresolved.amount)}
            </strong>{' '}
            — 질문에 답하기 전이라 위 합계에 넣지 않았습니다.
          </p>
        }

        <div className="mt-6" aria-hidden="true">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-line2">
            {distribution.map((item) =>
            <div
              key={item.label}
              className={item.bar}
              style={{ width: `${total ? item.value / total * 100 : 0}%` }} />

            )}
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-4">
          {distribution.map((item) =>
          <div key={item.label}>
              <dt className="flex items-center gap-1.5 text-caption text-muted">
                <span className={`h-2 w-2 rounded-full ${item.bar}`} aria-hidden="true" />
                {item.label}
              </dt>
              <dd className="mt-1 text-h4 font-semibold tabular-nums text-ink">
                {formatNumber(item.value)}건
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="mt-4">
        <h2 className="text-body font-semibold text-ink">계정과목별 인정 경비</h2>
        <Table
          className="mt-3"
          caption="계정과목별 인정 경비"
          columns={accountColumns}
          rows={summary?.byAccount ?? []}
          rowKey={(row) => row.account}
          loading={summaryQ.loading}
          empty={
          <Empty
            title="가능으로 판정한 거래가 아직 없습니다"
            description="가능으로 판정되면 계정과목별로 여기에 모입니다." />

          } />

      </section>

      <section className="mt-4 rounded-2xl border border-line bg-surface p-6">
        <h2 className="text-body font-semibold text-ink">세무대리인에게 넘길 문장</h2>
        <p className="mt-1.5 text-small text-muted">
          판정 결과와 문진 응답을 상담용 문장으로 정리했습니다. 판정하지 못한 것은
          그대로 적습니다.
        </p>
        <blockquote className="mt-4 rounded-xl bg-canvas p-4 text-small leading-6 text-ink2">
          {text}
        </blockquote>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="sm" disabled={!text} onClick={() => void copyText()}>
            {copy === 'done' ?
            <CopyCheckIcon className="h-4 w-4" aria-hidden="true" /> :
            <CopyIcon className="h-4 w-4" aria-hidden="true" />}
            {copy === 'done' ? '복사했습니다' : '문장 복사'}
          </Button>
          {unresolved && unresolved.count > 0 &&
          <Button to="/questions" variant="secondary" size="sm">
              질문에 답하기
              <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </Button>
          }
          <Button to="/results" variant="ghost" size="sm">
            판정 목록 보기
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        {copy === 'failed' &&
        <p role="alert" className="mt-3 text-small text-deny">
            복사하지 못했습니다. 문장을 직접 선택해 복사해 주세요.
          </p>
        }
      </section>
    </AppShell>);

}
