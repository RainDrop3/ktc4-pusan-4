import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRightIcon, CheckIcon, LayersIcon, SearchXIcon } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Badge, Button, ChoiceGroup, Empty, Pagination } from '../components/ui';
import { useSession } from '../contexts/SessionContext';
import { api, ApiRequestError, useApi } from '../api';
import type { QuestionGroup, Transaction } from '../types/domain';
import { formatDate, formatNumber, formatWon, ro } from '../utils/format';

/** F1-a. 한 번에 보여주는 질문 수(잠정). 다 답하면 다음 질문이 이어서 나온다 */
const BATCH_SIZE = 15;
/** F1-c. 남은 질문이 이만큼 이하일 때만 일괄 답변을 연다. 첫 화면부터 전부 닫아버리지 않게 */
const BULK_THRESHOLD = 5;
/** 카드마다 보여주는 거래 수. 넘으면 「외 N건」 */
const SHOWN_TRANSACTIONS = 3;

const errorMessage = (caught: unknown, fallback: string) =>
caught instanceof ApiRequestError ? caught.message : fallback;

const groupId = (group: QuestionGroup) => `${group.groupKey}|${group.factType}`;

/** 같은 factType 질문들이 모두 허용하는 선택지. 일괄 답변은 이 값만 보낼 수 있다 (3.11) */
const commonOptions = (groups: QuestionGroup[]) =>
groups[0].options.filter((option) => groups.every((group) => group.options.includes(option)));

/**
 * 3.9~3.11 룰엔진 확인 질문.
 * 질문을 자르지 않고 묶어서 나눠 보여준다(F1-a). 미해소 건수·금액은 항상 보이고(F1-b),
 * 남은 꼬리는 한 번에 닫을 수 있다(F1-c). 답한 질문도 다시 바꿀 수 있다(3.10 답변 정정).
 */
export function Questions() {
  const { batchId } = useSession();
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** 이번에 고른 답. 응답에 답한 값이 없어서 새로고침하면 사라진다 */
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [bulkChoice, setBulkChoice] = useState<Record<string, string>>({});
  /** 건너뛴 질문이 앞자리를 막아도 뒤 질문에 닿을 수 있게 페이지를 넘긴다 */
  const [page, setPage] = useState(0);
  const noticeRef = useRef<HTMLParagraphElement>(null);

  const pendingQ = useApi(
    () =>
    batchId ?
    api.questions.grouped({ batchId, status: 'PENDING', page, size: BATCH_SIZE }) :
    Promise.resolve(null),
    [batchId, page]
  );
  const answeredQ = useApi(
    () =>
    batchId ?
    api.questions.grouped({ batchId, status: 'ANSWERED', size: 100 }) :
    Promise.resolve(null),
    [batchId]
  );
  /**
   * 그룹 응답에는 거래가 없다. 지금 보이는 카드의 질문(카드당 3개)만 골라 질문 → 거래를 찾고,
   * 그 거래만 받는다. 판정이 확인 필요가 아니게 된 거래(사용자 수정)나 100건 너머의 질문도 빠지지 않는다.
   */
  const shownIds = (pendingQ.data?.items ?? []).flatMap((group) =>
  group.questionIds.slice(0, SHOWN_TRANSACTIONS)
  );
  const rowsQ = useApi(
    async () => {
      const need = new Set(shownIds);
      const transactionIdOf = new Map<string, string>();
      for (let next = 0; batchId && transactionIdOf.size < need.size; next++) {
        const result = await api.questions.list({ batchId, status: 'PENDING', page: next, size: 100 });
        result.items.forEach((question) => {
          if (need.has(question.id)) transactionIdOf.set(question.id, question.transactionId);
        });
        if (!result.page.hasNext) break;
      }
      const transactions = await Promise.all(
        [...new Set(transactionIdOf.values())].map((id) => api.transactions.get(id).catch(() => null))
      );
      const byId = new Map(
        transactions.
        filter((transaction): transaction is Transaction => transaction !== null).
        map((transaction) => [transaction.id, transaction])
      );
      return new Map(
        [...transactionIdOf].
        map(([questionId, transactionId]) => [questionId, byId.get(transactionId)] as const).
        filter((entry): entry is [string, Transaction] => entry[1] !== undefined)
      );
    },
    [batchId, shownIds.join()]
  );
  const transactionOfQuestion = rowsQ.data ?? new Map<string, Transaction>();

  // 마지막 질문에 답해 그 페이지가 비면 첫 페이지로 돌아간다
  useEffect(() => {
    if (page > 0 && pendingQ.data && pendingQ.data.items.length === 0) setPage(0);
  }, [page, pendingQ.data]);

  const pending = pendingQ.data?.items ?? [];
  const pendingTotal = pendingQ.data?.page.totalElements ?? 0;
  const answered = answeredQ.data?.items ?? [];
  const answeredTotal = answeredQ.data?.page.totalElements ?? 0;
  const unresolved = pendingQ.data?.unresolved;

  const reload = () => {
    pendingQ.reload();
    answeredQ.reload();
  };

  // 답한 카드가 목록에서 빠지면 초점이 사라진다. 결과 문구로 초점을 옮겨 읽어 준다
  const announce = (message: string) => {
    setNotice(message);
    window.setTimeout(() => noticeRef.current?.focus(), 0);
  };

  const answer = async (group: QuestionGroup, value: string) => {
    if (busy) return;
    const key = groupId(group);
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      const result = await api.questions.respond({
        questionIds: group.questionIds,
        answer: { value }
      });
      setChosen((prev) => ({ ...prev, [key]: value }));
      setEditing(null);
      announce(
        `「${value}」${ro(value)} 답했습니다. 거래 ${formatNumber(result.rejudgedTransactionCount)}건을 다시 판정했고, 이전 판정은 이력에 남습니다.`
      );
      reload();
    } catch (caught) {
      setError(errorMessage(caught, '답을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'));
    } finally {
      setBusy(null);
    }
  };

  const answerAll = async (factType: string, groups: QuestionGroup[], value: string | undefined) => {
    if (!batchId || !value || busy) return;
    setBusy(`bulk|${factType}`);
    setError(null);
    setNotice(null);
    try {
      const result = await api.questions.bulkAnswer({ batchId, factType, answer: { value } });
      setChosen((prev) => ({
        ...prev,
        ...Object.fromEntries(groups.map((group) => [groupId(group), value]))
      }));
      announce(
        `질문 ${formatNumber(result.answeredCount)}건에 「${value}」${ro(value)} 답하고 거래 ${formatNumber(
          result.rejudgedTransactionCount
        )}건을 다시 판정했습니다.${
        result.skippedCount > 0 ?
        ` 종류가 다른 질문 ${formatNumber(result.skippedCount)}건은 그대로 남았습니다.` :
        ''}`
      );
      reload();
    } catch (caught) {
      setError(errorMessage(caught, '한 번에 답하지 못했습니다. 잠시 후 다시 시도해 주세요.'));
    } finally {
      setBusy(null);
    }
  };

  // 남은 질문이 적을 때만 factType 별로 묶어 일괄 답변을 연다
  const bulkTargets =
  pendingTotal > 0 && pendingTotal <= BULK_THRESHOLD ?
  [...new Set(pending.map((group) => group.factType))].
  map((factType) => {
    const groups = pending.filter((group) => group.factType === factType);
    return { factType, groups, options: commonOptions(groups) };
  }).
  filter((target) => target.groups.length > 1 && target.options.length > 0) :
  [];

  /** 카드 머리의 가맹점 이름과 아래 건별 줄 */
  const transactionsOf = (group: QuestionGroup) =>
  group.questionIds.
  map((id) => transactionOfQuestion.get(id)).
  filter((transaction): transaction is Transaction => transaction !== undefined);

  const header =
  <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-small font-semibold text-accent">사람 게이트 ②</p>
        <h1 className="mt-1.5 text-h2 font-bold tracking-tight text-ink">
          확인이 필요한 것만 물어봅니다
        </h1>
        <p className="mt-2 max-w-xl text-body text-ink2">
          같은 사유·같은 가맹점끼리 묶어 묻고, 한 번 답하면 묶인 거래에 함께 적용합니다.
        </p>
      </div>
      <Button to="/results" variant="secondary" size="sm">
        결과로 돌아가기
      </Button>
    </header>;


  if (!batchId || pendingQ.error) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl">
          {header}
          {!batchId ?
          <Empty
            className="mt-6"
            icon={<SearchXIcon className="h-5 w-5" />}
            title="올린 카드내역이 없습니다"
            description="카드내역을 올리고 판정하면 확인이 필요한 것만 여기서 묻습니다."
            action={
            <Button to="/upload" size="sm" variant="secondary">
                  카드내역 올리기
                </Button>
            } /> :


          <Empty
            className="mt-6"
            icon={<SearchXIcon className="h-5 w-5" />}
            title="질문을 불러오지 못했습니다"
            description="잠시 후 다시 시도해 주세요. 계속 안 되면 새로고침해 주세요."
            action={
            <Button size="sm" variant="secondary" onClick={reload}>
                  다시 시도
                </Button>
            } />

          }
        </div>
      </AppShell>);

  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        {header}

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-line bg-surface px-4 py-3 text-small tabular-nums">
          <span className="text-muted">
            남은 질문{' '}
            <strong className="font-semibold text-ink">
              {pendingQ.data ? `${formatNumber(pendingTotal)}개` : '—'}
            </strong>
          </span>
          {unresolved &&
          <span className="text-muted">
              확인 필요{' '}
              <strong className={`font-semibold ${unresolved.count > 0 ? 'text-warn' : 'text-ink'}`}>
                {formatNumber(unresolved.count)}건 · {formatWon(unresolved.amount)}
              </strong>
            </span>
          }
        </div>

        {pendingTotal > BATCH_SIZE &&
        <p className="mt-3 text-small text-muted">
            질문이 많아 {BATCH_SIZE}개씩 보여줍니다. 답하면 다음 질문이 앞으로 당겨지고, 건너뛴
            질문은 아래 페이지에서 넘겨 볼 수 있습니다.
          </p>
        }

        {/* 결과를 읽어 주는 자리. 비어 있어도 DOM 에 남아 있어야 바뀐 내용을 읽는다 */}
        <p
          ref={noticeRef}
          role="status"
          tabIndex={-1}
          className={notice ? 'mt-3 text-small text-ink2 outline-none' : 'sr-only'}>

          {notice}
        </p>
        {error &&
        <p
          role="alert"
          className="mt-3 rounded-xl border border-deny-line bg-deny-bg px-4 py-3 text-body text-deny">

            {error}
          </p>
        }

        {!pendingQ.loading && pending.length === 0 ?
        <Empty
          className="mt-4"
          tone="ok"
          icon={<CheckIcon className="h-5 w-5" />}
          title="확인할 질문이 없습니다"
          description={
          answeredTotal > 0 ?
          '모든 질문에 답했습니다. 답을 바꾸려면 아래 답한 질문에서 고르세요.' :
          answeredQ.data ?
          '규칙으로 판정하면서 더 물어볼 것이 생기지 않았습니다.' :
          '지금 답할 질문은 없습니다.'
          } /> :


        <ol className="mt-4 space-y-3">
            <AnimatePresence initial={false}>
              {pending.map((group, index) => {
              const key = groupId(group);
              const rows = transactionsOf(group);
              return (
                <motion.li
                  key={key}
                  layout
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}>

                    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
                      <header className="flex items-start gap-3 border-b border-line2 px-5 py-4">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-canvas text-caption font-semibold tabular-nums text-ink2">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {rows[0] &&
                          <Badge>
                                {rows[0].merchantNorm}
                                {new Set(rows.map((row) => row.merchantNorm)).size > 1 && ' 외'}
                              </Badge>
                          }
                            <span className="flex items-center gap-1 text-caption tabular-nums text-muted">
                              <LayersIcon className="h-3 w-3" aria-hidden="true" />
                              {formatNumber(group.count)}건 · {formatWon(group.totalAmount)}
                            </span>
                          </div>
                          <h2 className="mt-2 text-h4 font-semibold text-ink">{group.questionText}</h2>
                          {rows.length > 0 &&
                        <ul className="mt-2 space-y-0.5 text-small tabular-nums text-muted">
                              {rows.slice(0, SHOWN_TRANSACTIONS).map((row) =>
                          <li key={row.id} className="truncate">
                                  {formatDate(row.approvedAt)} · {row.merchantRaw} · {formatWon(row.amount)}
                                </li>
                          )}
                              {group.count > SHOWN_TRANSACTIONS &&
                          <li>외 {formatNumber(group.count - SHOWN_TRANSACTIONS)}건</li>
                          }
                            </ul>
                        }
                        </div>
                      </header>

                      <div className="px-5 py-4">
                        {/* 저장하는 동안은 다른 카드의 선택지도 막는다. 눌러도 아무 일 없는 버튼을 두지 않는다 */}
                        <fieldset disabled={busy !== null} className={busy !== null ? 'opacity-60' : ''}>
                          <ChoiceGroup
                          name={group.questionText}
                          columns={group.options.length >= 3 ? 3 : 2}
                          value={chosen[key] ?? ''}
                          onChange={(value) => void answer(group, value)}
                          options={group.options.map((option) => ({ value: option, label: option }))} />

                        </fieldset>
                        <p className="mt-3 text-caption text-muted">
                          {busy === key ?
                        '저장하고 다시 판정하는 중…' :
                        `고르면 묶인 ${formatNumber(group.count)}건에 함께 적용하고 바로 다시 판정합니다.`}
                        </p>
                      </div>
                    </section>
                  </motion.li>);

            })}
            </AnimatePresence>
          </ol>
        }

        {pendingQ.data && pendingQ.data.page.totalPages > 1 &&
        <Pagination
          page={pendingQ.data.page}
          onChange={setPage}
          note={`남은 질문 ${formatNumber(pendingTotal)}개 중 ${formatNumber(
            page * BATCH_SIZE + 1
          )}–${formatNumber(page * BATCH_SIZE + pending.length)}번째`} />

        }

        {bulkTargets.length > 0 &&
        <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-body font-semibold text-ink">남은 질문 한 번에 답하기</h2>
            <p className="mt-1 text-small text-muted">
              같은 종류의 질문에 같은 답을 한 번에 보냅니다. 한 번에 답한 뒤에도 질문마다 다시
              바꿀 수 있습니다.
            </p>
            <div className="mt-4 space-y-5">
              {bulkTargets.map((target) =>
            <div key={target.factType}>
                  <p className="text-small font-semibold text-ink">
                    「{target.factType}」 질문 {formatNumber(target.groups.length)}개 ·{' '}
                    {formatNumber(target.groups.reduce((sum, group) => sum + group.count, 0))}건
                  </p>
                  {target.options.length > 1 &&
              <ChoiceGroup
                className="mt-2"
                name={`「${target.factType}」 질문 한 번에 답하기`}
                columns={target.options.length >= 3 ? 3 : 2}
                value={bulkChoice[target.factType] ?? ''}
                onChange={(value) =>
                setBulkChoice((prev) => ({ ...prev, [target.factType]: value }))
                }
                options={target.options.map((option) => ({ value: option, label: `전부 ${option}` }))} />

              }
                  <div className="mt-3 flex justify-end">
                    {/* 함께 고를 수 있는 답이 하나뿐이면 고르는 단계 없이 그 답으로 보낸다 */}
                    <Button
                  variant="secondary"
                  size="sm"
                  disabled={
                  target.options.length > 1 && !bulkChoice[target.factType] || busy !== null
                  }
                  onClick={() =>
                  void answerAll(
                    target.factType,
                    target.groups,
                    target.options.length === 1 ? target.options[0] : bulkChoice[target.factType]
                  )
                  }>

                      {busy === `bulk|${target.factType}` ?
                  '답하는 중…' :
                  target.options.length === 1 ?
                  `${formatNumber(target.groups.length)}개 전부 「${target.options[0]}」${ro(target.options[0])} 답하기` :
                  `${formatNumber(target.groups.length)}개 한 번에 답하기`}
                    </Button>
                  </div>
                </div>
            )}
            </div>
          </section>
        }

        {answered.length > 0 &&
        <section className="mt-6">
            <h2 className="text-body font-semibold text-ink">
              답한 질문 <span className="tabular-nums text-muted">{formatNumber(answeredTotal)}개</span>
              {answeredTotal > answered.length &&
            <span className="ml-2 text-small font-normal text-muted">
                  앞의 {formatNumber(answered.length)}개만 보여줍니다
                </span>
            }
            </h2>
            <ul className="mt-3 divide-y divide-line2 overflow-hidden rounded-2xl border border-line bg-surface">
              {answered.map((group) => {
              const key = groupId(group);
              const open = editing === key;
              return (
                <li key={key} className="px-5 py-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-small font-medium text-ink">{group.questionText}</p>
                        <p className="mt-0.5 text-caption tabular-nums text-muted">
                          {chosen[key] ? `「${chosen[key]}」${ro(chosen[key])} 답함` : '답함'} ·{' '}
                          {formatNumber(group.count)}건 · {formatWon(group.totalAmount)}
                        </p>
                      </div>
                      <Button
                      variant="ghost"
                      size="sm"
                      aria-expanded={open}
                      disabled={busy !== null}
                      onClick={() => setEditing(open ? null : key)}>

                        {open ? '닫기' : '답 바꾸기'}
                      </Button>
                    </div>
                    {open &&
                  <ChoiceGroup
                    className="mt-3"
                    name={`${group.questionText} 답 바꾸기`}
                    columns={group.options.length >= 3 ? 3 : 2}
                    value={chosen[key] ?? ''}
                    onChange={(value) => void answer(group, value)}
                    options={group.options.map((option) => ({ value: option, label: option }))} />

                  }
                  </li>);

            })}
            </ul>
          </section>
        }

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button to="/summary">
            요약으로
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </Button>
          <p className="text-small text-muted">
            모르는 건 건너뛰어도 됩니다. 답하지 않은 질문은 요약의 세무대리인에게 넘길 문장에
            건수와 금액으로 적힙니다.
          </p>
        </div>
      </div>
    </AppShell>);

}
