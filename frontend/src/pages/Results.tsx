import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, CircleHelpIcon, SearchXIcon } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { JudgmentDetailPanel } from '../components/results/JudgmentDetailPanel';
import { VerdictBadge } from '../components/VerdictBadge';
import {
  Button,
  Empty,
  FilterBar,
  Pagination,
  Table,
  type Column } from
'../components/ui';
import { useSession } from '../contexts/SessionContext';
import { api, useApi } from '../api';
import type { Judgment, Transaction, Verdict } from '../types/domain';
import { formatFullDate, formatNumber, formatPeriod, formatWon } from '../utils/format';

type Filter = 'ALL' | Verdict;

/**
 * 3.7 판정 결과.
 * batchId 로 거래별 「현재」 판정을 읽는다. runId 로 읽으면 그 Run 이 만든 판정만 와서
 * 답변·사용자 수정이 화면에 반영되지 않는다.
 */
export function Results() {
  const { batchId } = useSession();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [page, setPage] = useState(0);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const panel = useRef<HTMLElement>(null);

  const batchQ = useApi(
    () => batchId ? api.uploads.get(batchId) : Promise.resolve(null),
    [batchId]
  );
  const summaryQ = useApi(
    () => batchId ? api.judgments.summary({ batchId }) : Promise.resolve(null),
    [batchId]
  );
  const judgmentsQ = useApi(
    () =>
    batchId ?
    api.judgments.list({
      batchId,
      verdict: filter === 'ALL' ? undefined : filter,
      page,
      size: 20
    }) :
    Promise.resolve(null),
    [batchId, filter, page]
  );
  const questionsQ = useApi(
    () =>
    batchId ?
    api.questions.grouped({ batchId, status: 'PENDING', size: 1 }) :
    Promise.resolve(null),
    [batchId]
  );

  const judgments: Judgment[] = judgmentsQ.data?.items ?? [];

  // 판정 응답에는 거래 정보가 없어 지금 페이지의 거래만 따로 받는다 (최대 20건)
  const transactionsQ = useApi(
    () =>
    Promise.all(
      judgments.map((judgment) =>
      api.transactions.get(judgment.transactionId).catch(() => null)
      )
    ),
    [judgments.map((judgment) => judgment.transactionId).join()]
  );
  const transactions = new Map(
    (transactionsQ.data ?? []).
    filter((transaction): transaction is Transaction => transaction !== null).
    map((transaction) => [transaction.id, transaction])
  );

  // 패널은 고른 거래의 현재 판정을 따로 읽는다. 수정하면 그 행이 목록 맨 위로 올라가도
  // (computedAt DESC) 패널은 그 거래에 머문다
  const currentQ = useApi(
    () =>
    selectedTx ? api.judgments.list({ transactionId: selectedTx.id }) : Promise.resolve(null),
    [selectedTx?.id]
  );
  const current = currentQ.data?.items[0];

  // 처음에는 첫 행을 보여준다
  const firstTransaction = judgments[0] && transactions.get(judgments[0].transactionId);
  useEffect(() => {
    if (!selectedTx && firstTransaction) setSelectedTx(firstTransaction);
  }, [selectedTx, firstTransaction]);

  // 마지막 행이 다른 분류로 빠지면 그 페이지가 빈다. Pagination 이 사라지므로 첫 페이지로
  useEffect(() => {
    if (page > 0 && judgmentsQ.data && judgmentsQ.data.items.length === 0) setPage(0);
  }, [page, judgmentsQ.data]);

  const select = (transaction: Transaction) => {
    setSelectedTx(transaction);
    // 좁은 화면에서는 패널이 표 아래에 있어 고른 것이 보이지 않는다
    if (window.matchMedia('(max-width: 1023px)').matches)
    panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const changed = () => {
    judgmentsQ.reload();
    summaryQ.reload();
    currentQ.reload();
  };

  const summary = summaryQ.data;
  const filters = [
  { value: 'ALL' as const, label: '전체', count: summary?.totalCount },
  { value: 'AVAILABLE' as const, label: '가능', count: summary?.byVerdict.AVAILABLE.count },
  { value: 'NEEDS_REVIEW' as const, label: '확인 필요', count: summary?.byVerdict.NEEDS_REVIEW.count },
  { value: 'UNAVAILABLE' as const, label: '불가', count: summary?.byVerdict.UNAVAILABLE.count }];

  const unresolved = questionsQ.data?.unresolved;
  const questionGroups = questionsQ.data?.page.totalElements ?? 0;

  const pending = (width: string) =>
  <span className={`block h-4 ${width} animate-pulse rounded bg-line2`} />;

  const missing = (judgment: Judgment) =>
  !transactions.has(judgment.transactionId) && !transactionsQ.loading;

  const columns: Column<Judgment>[] = [
  {
    header: '승인일',
    width: 'w-[7.5rem]',
    hideBelow: 'sm',
    cell: (row) => {
      const transaction = transactions.get(row.transactionId);
      if (!transaction) return missing(row) ? '—' : pending('w-20');
      return (
        <span className="whitespace-nowrap tabular-nums text-ink2">
            {formatFullDate(transaction.approvedAt)}
          </span>);

    }
  },
  {
    header: '가맹점',
    // 남는 폭을 가맹점이 갖고 넘치면 말줄임한다. 금액·판정은 좁은 화면에서도 보여야 한다
    width: 'w-full max-w-0',
    cell: (row) => {
      const transaction = transactions.get(row.transactionId);
      if (!transaction)
      return missing(row) ?
      <span className="text-small text-muted">거래 정보를 불러오지 못했습니다</span> :
      pending('w-32');
      return (
        <span className="block min-w-0">
            <span className="block truncate font-medium text-ink">{transaction.merchantNorm}</span>
            <span className="block truncate text-small text-muted">
              {/* 승인일 열은 좁은 화면에서 숨기므로, 그 정보를 여기로 옮긴다 */}
              <span className="sm:hidden">{formatFullDate(transaction.approvedAt)} · </span>
              {transaction.merchantRaw} · {transaction.merchantCategory}
              {transaction.installmentMonths > 0 &&
            ` · ${transaction.installmentMonths}개월 할부`}
            </span>
          </span>);

    }
  },
  {
    header: '금액',
    align: 'right',
    cell: (row) => {
      const transaction = transactions.get(row.transactionId);
      if (!transaction) return missing(row) ? '—' : pending('ml-auto w-20');
      // 「일부 인정」은 AVAILABLE + finalAmount < amount 다 (2.1)
      const partial =
      row.verdict.code === 'AVAILABLE' &&
      row.finalAmount !== null &&
      row.finalAmount !== transaction.amount;
      return (
        <span className="block">
            <span className="whitespace-nowrap font-semibold text-ink">{formatWon(transaction.amount)}</span>
            {partial && row.finalAmount !== null &&
          <span className="block whitespace-nowrap text-caption text-ok">
                산입 {formatWon(row.finalAmount)}
              </span>
          }
          </span>);

    }
  },
  {
    header: '판정',
    align: 'right',
    cell: (row) =>
    <span className="inline-flex flex-col items-end gap-1">
          <VerdictBadge verdict={row.verdict} />
          {row.origin.type === 'OVERRIDE' &&
      <span className="text-caption text-muted">직접 수정</span>
      }
        </span>

  }];


  const header =
  <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-small font-semibold text-accent">4단계 · 반영</p>
        <h1 className="mt-1.5 text-h2 font-bold tracking-tight text-ink">판정 결과</h1>
        {summary &&
      <p className="mt-2 text-body tabular-nums text-muted">
            {batchQ.data &&
        `${formatPeriod(batchQ.data.periodStart, batchQ.data.periodEnd)} · `}
            {formatNumber(summary.totalCount)}건 · 인정 경비{' '}
            <strong className="font-semibold text-ink">
              {formatWon(summary.byVerdict.AVAILABLE.finalAmount)}
            </strong>
          </p>
      }
      </div>
      <Button to="/summary" variant="secondary" size="sm">
        요약 보기
        <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
      </Button>
    </header>;


  if (!batchId) {
    return (
      <AppShell>
        {header}
        <Empty
          className="mt-6"
          icon={<SearchXIcon className="h-5 w-5" />}
          title="올린 카드내역이 없습니다"
          description="카드내역을 올리고 판정을 마치면 결과가 여기에 쌓입니다."
          action={
          <Button to="/upload" size="sm" variant="secondary">
              카드내역 올리기
            </Button>
          } />

      </AppShell>);

  }

  const failed = Boolean(judgmentsQ.error || summaryQ.error);
  const nothingJudged = summary?.totalCount === 0;

  const empty = failed ?
  <Empty
    icon={<SearchXIcon className="h-5 w-5" />}
    title="판정 결과를 불러오지 못했습니다"
    description="잠시 후 다시 시도해 주세요. 계속 안 되면 새로고침해 주세요."
    action={
    <Button
      size="sm"
      variant="secondary"
      onClick={() => {
        judgmentsQ.reload();
        summaryQ.reload();
      }}>

          다시 시도
        </Button>
    } /> :

  nothingJudged ?
  <Empty
    icon={<SearchXIcon className="h-5 w-5" />}
    title="아직 판정한 거래가 없습니다"
    description="분류 확인과 사업자 문진을 마친 뒤 판정을 실행하면 결과가 나옵니다."
    action={
    <Button to="/confirm" size="sm" variant="secondary">
            판정하러 가기
          </Button>
    } /> :

  filter === 'NEEDS_REVIEW' ?
  <Empty
    tone="ok"
    icon={<SearchXIcon className="h-5 w-5" />}
    title="확인이 필요한 거래가 없습니다"
    description="남은 판정은 모두 가능 또는 불가로 정리됐습니다." /> :

  <Empty
    icon={<SearchXIcon className="h-5 w-5" />}
    title="이 판정에 해당하는 거래가 없습니다"
    description="다른 판정을 골라 보세요." />;


  return (
    <AppShell>
      {header}

      {unresolved && unresolved.count > 0 &&
      <Link
        to="/questions"
        className="mt-6 flex items-center gap-3 rounded-2xl border border-warn-line bg-warn-bg px-5 py-4 transition-colors duration-150 ease-snap hover:bg-warn-bg/70">

          <CircleHelpIcon className="h-5 w-5 shrink-0 text-warn" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-body font-semibold tabular-nums text-ink">
              확인 필요 {formatNumber(unresolved.count)}건 · {formatWon(unresolved.amount)}
            </span>
            <span className="mt-0.5 block text-small text-ink2">
              질문 {formatNumber(questionGroups)}개에 답하면 정리됩니다. 같은 사유끼리 묶어
              물어보고, 한 번 답하면 다음 판정에서 다시 묻지 않습니다.
            </span>
          </span>
          <ArrowRightIcon className="h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
        </Link>
      }

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0">
          <FilterBar
            name="판정 결과"
            value={filter}
            onChange={(next) => {
              setFilter(next);
              setPage(0);
            }}
            options={filters} />

          <Table
            className="mt-3"
            caption="거래별 판정 결과"
            columns={columns}
            rows={failed ? [] : judgments}
            rowKey={(row) => row.id}
            loading={judgmentsQ.loading}
            selectedKey={judgments.find((row) => row.transactionId === selectedTx?.id)?.id}
            onRowClick={(row) => {
              const transaction = transactions.get(row.transactionId);
              if (transaction) select(transaction);
            }}
            empty={empty} />

          {!failed && judgmentsQ.data && judgments.length > 0 &&
          <Pagination page={judgmentsQ.data.page} onChange={setPage} />
          }
        </section>

        {current && selectedTx &&
        <aside ref={panel} className="scroll-mt-20 lg:sticky lg:top-32 lg:self-start">
            <JudgmentDetailPanel
            key={selectedTx.id}
            judgment={current}
            transaction={selectedTx}
            onChanged={changed} />

          </aside>
        }
      </div>
    </AppShell>);

}
