import { useState } from 'react';
import { TriangleAlertIcon } from 'lucide-react';
import type { Judgment, JudgmentOriginType, Transaction } from '../../types/domain';
import { api, ApiRequestError, useApi } from '../../api';
import { Badge, Button, ChoiceGroup, Input } from '../ui';
import { VerdictBadge } from '../VerdictBadge';
import { StatuteCitation } from '../StatuteCitation';
import { VERDICT_LABEL } from '../../utils/verdict';
import { formatFullDate, formatWon } from '../../utils/format';

/** 2.8 이 revision 이 생긴 직접 원인 */
const ORIGIN_LABEL: Record<JudgmentOriginType, string> = {
  RUN: '자동 판정',
  USER_FACT: '답변 반영',
  CLASSIFICATION_REVIEW: '분류 확인 반영',
  OVERRIDE: '사용자 수정'
};

/** 사용자가 바꿀 수 있는 판정. 확인 필요로 되돌리는 수정은 받지 않는다 (#62 논의) */
type Target = 'AVAILABLE' | 'UNAVAILABLE';

/** 3.8 reason. 자주 쓰는 사유를 고르고, 필요하면 덧붙여 적는다 */
const REASONS: Record<Target, string[]> = {
  AVAILABLE: ['사업에 직접 사용한 비용입니다', '업무 관련 지출이며 증빙이 있습니다'],
  UNAVAILABLE: ['개인적으로 사용한 비용입니다', '사업과 관련 없는 지출입니다']
};

/** 「가능으로」·「불가로」. 받침이 있으면(ㄹ 제외) 「으로」 */
const toLabel = (code: Target) => {
  const label = VERDICT_LABEL[code];
  const last = label.charCodeAt(label.length - 1) - 0xac00;
  const coda = last >= 0 && last < 11172 ? last % 28 : 0;
  return `${label}${coda === 0 || coda === 8 ? '로' : '으로'}`;
};

const errorMessage = (caught: unknown, fallback: string) =>
caught instanceof ApiRequestError ? caught.message : fallback;

interface JudgmentDetailPanelProps {
  /** 거래의 현재 판정 */
  judgment: Judgment;
  transaction: Transaction | undefined;
  /** 수정·해제로 현재 판정이 바뀌었을 때 */
  onChanged: () => void;
}

export function JudgmentDetailPanel({
  judgment,
  transaction,
  onChanged
}: JudgmentDetailPanelProps) {
  const [target, setTarget] = useState<Target | null>(null);
  const [preset, setPreset] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 현재 판정이 바뀌면 이력도 다시 읽는다
  const historyQ = useApi(
    () =>
    api.judgments.list({
      transactionId: judgment.transactionId,
      latestOnly: false,
      size: 20
    }),
    [judgment.transactionId, judgment.id]
  );

  if (!transaction) return null;

  const overridden = judgment.origin.type === 'OVERRIDE';
  const targets: Target[] = (['AVAILABLE', 'UNAVAILABLE'] as const).filter(
    (code) => code !== judgment.verdict.code
  );
  const reason = [preset, note.trim()].filter(Boolean).join(' — ');
  const attributes = Object.entries(judgment.attributes);

  const open = (next: Target) => {
    setTarget(next);
    setPreset('');
    setNote('');
    setError(null);
  };

  const save = async () => {
    if (!target || !reason || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.judgments.override(judgment.id, { toVerdict: target, reason });
      setTarget(null);
      onChanged();
    } catch (caught) {
      setError(errorMessage(caught, '판정을 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.'));
    } finally {
      setBusy(false);
    }
  };

  const release = async () => {
    if (!judgment.origin.id || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.judgments.removeOverride(judgment.origin.id);
      onChanged();
    } catch (caught) {
      setError(errorMessage(caught, '수정을 되돌리지 못했습니다. 잠시 후 다시 시도해 주세요.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <header className="border-b border-line px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <VerdictBadge verdict={judgment.verdict} size="md" />
          {judgment.outOfScope && <Badge tone="warn">판정 범위 밖</Badge>}
          <Badge>{ORIGIN_LABEL[judgment.origin.type]}</Badge>
          <span className="text-caption tabular-nums text-muted">
            rev.{judgment.revision}
          </span>
        </div>
        <h2 className="mt-2.5 text-h4 font-bold tracking-tight text-ink">
          {transaction.merchantNorm}
        </h2>
        <p className="mt-1 text-caption tabular-nums text-muted">
          {formatFullDate(transaction.approvedAt)} · {transaction.merchantRaw}
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-px border-b border-line bg-line">
        <div className="bg-surface px-5 py-3">
          <dt className="text-caption text-muted">승인금액</dt>
          <dd className="mt-0.5 text-body-lg font-semibold tabular-nums text-ink">
            {formatWon(transaction.amount)}
          </dd>
        </div>
        <div className="bg-surface px-5 py-3">
          <dt className="text-caption text-muted">필요경비 산입액</dt>
          <dd
            className={`mt-0.5 text-body-lg font-semibold tabular-nums ${
            judgment.finalAmount ? 'text-ok' : 'text-muted'}`
            }>

            {judgment.finalAmount !== null ? formatWon(judgment.finalAmount) : '—'}
          </dd>
        </div>
      </dl>

      <section className="border-b border-line px-5 py-4">
        <h3 className="text-small font-semibold text-ink">판정 이유</h3>
        <p className="mt-2 text-small leading-6 text-ink2">
          {overridden ?
          '직접 수정한 판정입니다. 규칙 엔진이 낸 판정과 그 이유는 아래 이력에 그대로 남아 있습니다.' :
          judgment.explanation ??
          '적용된 규칙 카드에 설명 문구가 없습니다. 근거 조문을 확인해 주세요.'}
        </p>
        {judgment.blockedAtGate && !overridden &&
        <p className="mt-2 text-caption tabular-nums text-muted">
            막힌 게이트 {judgment.blockedAtGate}
            {judgment.unmatchedReason && ` · 사유 ${judgment.unmatchedReason}`}
          </p>
        }
      </section>

      <section className="border-b border-line px-5 py-4">
        <h3 className="text-small font-semibold text-ink">근거 조문</h3>
        {judgment.citations.length > 0 ?
        <div className="mt-2.5 space-y-2">
            {judgment.citations.map((citation) =>
          <StatuteCitation
            key={citation.statuteVersionId}
            statuteVersionId={citation.statuteVersionId} />

          )}
          </div> :

        <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-warn-line bg-warn-bg p-3.5">
            <TriangleAlertIcon
            className="mt-0.5 h-4 w-4 shrink-0 text-warn"
            aria-hidden="true" />

            <p className="text-small leading-6 text-ink2">
              <strong className="font-semibold text-warn">근거 조문 없음.</strong>{' '}
              조문을 붙일 수 없어 가능·불가로 확정하지 않았습니다. 확인 필요 상태로만
              유지됩니다.
            </p>
          </div>
        }
      </section>

      <section className="border-b border-line bg-canvas px-5 py-3.5">
        <dl className="space-y-1 text-caption tabular-nums text-muted">
          <div className="flex justify-between gap-2">
            <dt>계정과목</dt>
            <dd className="text-ink2">{judgment.account ?? '—'}</dd>
          </div>
          {attributes.map(([key, value]) =>
          <div key={key} className="flex justify-between gap-2">
              <dt>{key}</dt>
              <dd className="text-ink2">{String(value)}</dd>
            </div>
          )}
          {judgment.ruleCardId &&
          <div className="flex justify-between gap-2">
              <dt>규칙 카드</dt>
              <dd className="text-ink2">
                {judgment.ruleCardId}
                {judgment.ruleCardVersion !== null && ` v${judgment.ruleCardVersion}`}
                {judgment.appliedRuleIds.length > 1 &&
                ` 외 ${judgment.appliedRuleIds.length - 1}장`}
              </dd>
            </div>
          }
          {judgment.rulesCommitSha &&
          <div className="flex justify-between gap-2">
              <dt>규칙 커밋</dt>
              <dd className="text-ink2">{judgment.rulesCommitSha.slice(0, 8)}</dd>
            </div>
          }
          {judgment.userContextVersion !== null &&
          <div className="flex justify-between gap-2">
              <dt>문진 버전</dt>
              <dd className="text-ink2">v{judgment.userContextVersion}</dd>
            </div>
          }
          <div className="flex justify-between gap-2">
            <dt>판정 시각</dt>
            <dd className="text-ink2">{judgment.computedAt.slice(0, 16).replace('T', ' ')}</dd>
          </div>
        </dl>
      </section>

      <section className="border-b border-line px-5 py-4">
        <h3 className="text-small font-semibold text-ink">
          판정이 실제와 다르다면
        </h3>
        <p className="mt-1.5 text-caption text-muted">
          바꾼 기록은 새 revision 으로 남고, 이전 판정은 지워지지 않습니다.
        </p>

        {overridden &&
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-canvas px-3.5 py-3">
            <p className="text-small text-ink2">직접 수정한 판정을 쓰고 있습니다.</p>
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => void release()}>
              수정 되돌리기
            </Button>
          </div>
        }

        {target === null ?
        <div className="mt-3 flex gap-2">
            {targets.map((code) =>
          <Button
            key={code}
            variant="secondary"
            size="sm"
            className="flex-1"
            disabled={busy}
            onClick={() => open(code)}>

                {toLabel(code)} 바꾸기
              </Button>
          )}
          </div> :

        <div className="mt-3 space-y-3">
            <p className="text-small font-semibold text-ink">
              {toLabel(target)} 바꾸는 이유
            </p>
            <ChoiceGroup
            name={`${toLabel(target)} 바꾸는 이유`}
            columns={2}
            value={preset}
            onChange={setPreset}
            options={REASONS[target].map((text) => ({ value: text, label: text }))} />

            <Input
            aria-label="사유 직접 적기"
            placeholder="직접 적기 (선택)"
            maxLength={200}
            value={note}
            onChange={(event) => setNote(event.target.value)} />

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => setTarget(null)}>
                취소
              </Button>
              <Button size="sm" disabled={!reason || busy} onClick={() => void save()}>
                {busy ? '저장 중…' : '저장'}
              </Button>
            </div>
          </div>
        }

        {error &&
        <p
          role="alert"
          className="mt-3 rounded-xl border border-deny-line bg-deny-bg px-3.5 py-2.5 text-small text-deny">

            {error}
          </p>
        }
      </section>

      <section className="px-5 py-4">
        <h3 className="text-small font-semibold text-ink">판정 이력</h3>
        {historyQ.error ?
        <p className="mt-2 text-caption text-muted">
            이력을 불러오지 못했습니다.{' '}
            <button type="button" onClick={historyQ.reload} className="text-accent hover:underline">
              다시 시도
            </button>
          </p> :

        <ol className="mt-2.5 space-y-2">
            {(historyQ.data?.items ?? []).map((revision) =>
          <li key={revision.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption tabular-nums text-muted">
                <span className="w-10 shrink-0">rev.{revision.revision}</span>
                <VerdictBadge verdict={revision.verdict} />
                <span className="text-ink2">{ORIGIN_LABEL[revision.origin.type]}</span>
                <span>{revision.computedAt.slice(0, 16).replace('T', ' ')}</span>
                {revision.id === judgment.id && <Badge tone="ink">현재</Badge>}
              </li>
          )}
          </ol>
        }
      </section>
    </div>);

}
