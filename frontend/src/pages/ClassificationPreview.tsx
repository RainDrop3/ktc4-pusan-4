import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon, CheckIcon, SparklesIcon } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { api, useApi } from '../api';
import { useSession } from '../contexts/SessionContext';
import { Badge, Button, Card, Empty, Select } from '../components/ui';
import { MERCHANT_CATEGORIES } from '../types/domain';
import { formatNumber, formatWon } from '../utils/format';

/**
 * 2단계 · 분류 확인.
 * 서버가 가맹점을 분류하지 못한 거래를 사용자가 카테고리로 확정한다.
 * 미분류로 남은 거래는 룰엔진에 전달되지 않으므로(api.md 3.3) 판정에서 빠진다는 것을 화면에서 말한다.
 */
export function ClassificationPreview() {
  const navigate = useNavigate();
  const { batchId } = useSession();
  const [resolving, setResolving] = useState<Record<string, true>>({});

  const groupsQ = useApi(
    () => api.classificationReviews.grouped({ batchId: batchId ?? undefined, status: 'PENDING' }),
    [batchId]
  );
  const batchQ = useApi(
    () => batchId ? api.uploads.get(batchId) : Promise.resolve(null),
    [batchId]
  );

  const groups = groupsQ.data?.items ?? [];
  const batch = batchQ.data;
  const total = batch?.transactionCount ?? 0;
  const pendingCount = groups.reduce((sum, group) => sum + group.count, 0);
  const pendingAmount = groups.reduce((sum, group) => sum + group.totalAmount, 0);
  const classified = Math.max(0, total - pendingCount);
  const coverage = total ? classified / total * 100 : 100;
  const done = groups.length === 0;

  const resolve = async (groupKey: string, reviewIds: string[], category: string) => {
    setResolving((prev) => ({ ...prev, [groupKey]: true }));
    await api.classificationReviews.respond({ reviewIds, merchantCategory: category });
    // 카드가 빠지는 게 보이도록 전환이 끝난 뒤 다시 읽는다
    window.setTimeout(() => {
      groupsQ.reload();
      batchQ.reload();
      setResolving((prev) => {
        const next = { ...prev };
        delete next[groupKey];
        return next;
      });
    }, 280);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <header>
          <p className="text-small font-semibold text-accent">2단계 · 분류 확인</p>
          <h1 className="mt-1.5 text-h2 font-bold tracking-tight text-ink">
            {done ? '모든 거래를 분류했습니다' : '읽지 못한 가맹점만 확인합니다'}
          </h1>
          <p className="mt-2 max-w-2xl text-body leading-6 text-ink2">
            {done ?
            '모든 거래에 업종이 붙었습니다. 판정은 이제 규칙이 순서대로 실행하며 내립니다.' :
            '가맹점 이름을 업종으로 바꾸는 일까지는 AI가 합니다. 확신이 없는 건만 남겨 두었으니 여기서 골라 주세요. 판정은 그다음에 규칙이 합니다.'}
          </p>
        </header>

        {/* 분류 진척 */}
        <Card tone="canvas" padding="md" className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-small text-muted">분류를 마친 거래</p>
              <p className="mt-1 text-stat font-bold tabular-nums text-ink">
                {formatNumber(classified)}
                <span className="ml-1 text-h4 font-semibold text-muted">
                  / {formatNumber(total)}건
                </span>
              </p>
            </div>
            {done ?
            <Badge tone="ok" symbol="✓">
                분류 완료
              </Badge> :

            <p className="text-small tabular-nums text-warn">
                확인 필요 {formatNumber(pendingCount)}건 ·{' '}
                {formatWon(pendingAmount)}
              </p>
            }
          </div>

          <div
            className="mt-4 h-2 overflow-hidden rounded-full bg-line2"
            role="progressbar"
            aria-valuenow={Math.round(coverage)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="가맹점 분류 진척">

            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500 ease-snap"
              style={{ width: `${coverage}%` }} />

          </div>
        </Card>

        {/* 확인 필요 목록 */}
        <section className="mt-8">
          {!done &&
          <h2 className="text-h4 font-bold text-ink">
              확인이 필요한 가맹점 {groups.length}곳
            </h2>
          }

          {done ?
          <Empty
            tone="ok"
            icon={<CheckIcon className="h-5 w-5" strokeWidth={2.5} />}
            title="확인할 가맹점이 없습니다"
            description="모든 거래에 업종이 붙었습니다. 이제 사업자 문진을 마치면 판정을 시작할 수 있습니다."
            action={
            <Button to="/interview" size="md">
                  사업자 문진으로
                  <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                </Button>
            } /> :


          <ul className="mt-4 space-y-3">
              {groups.map((group) =>
            <Card
              key={group.groupKey}
              as="li"
              padding="md"
              className={`border-l-[3px] border-l-warn transition-all duration-300 ease-snap hover:shadow-card ${
              resolving[group.groupKey] ?
              'scale-[0.98] opacity-0' :
              'opacity-100'}`
              }>

                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="text-body-lg font-semibold text-ink">
                      {group.merchantRaw}
                    </p>
                    <p className="text-small tabular-nums text-muted">
                      {formatNumber(group.count)}건 · {formatWon(group.totalAmount)}
                    </p>
                  </div>
                  <p className="mt-1 text-small text-muted">
                    카드사에 찍힌 표기 그대로입니다. 이것만으로는 업종을 읽지 못했습니다
                  </p>

                  <p className="mt-5 text-body font-semibold text-ink">
                    어떤 지출인가요?
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {group.suggestedCategories.map((category, index) =>
                <Button
                  key={category}
                  variant={index === 0 ? 'soft' : 'secondary'}
                  size="sm"
                  onClick={() =>
                  void resolve(group.groupKey, group.reviewIds, category)
                  }>

                        {index === 0 &&
                  <SparklesIcon
                    className="h-3.5 w-3.5"
                    aria-hidden="true" />
                  }
                        {category}
                      </Button>
                )}

                    <div className="w-44">
                      <Select
                    aria-label={`${group.merchantRaw} 카테고리 직접 선택`}
                    defaultValue=""
                    onChange={(event) => {
                      if (!event.target.value) return;
                      void resolve(
                        group.groupKey,
                        group.reviewIds,
                        event.target.value
                      );
                    }}>

                        <option value="">다른 카테고리…</option>
                        {MERCHANT_CATEGORIES.map((category) =>
                    <option key={category} value={category}>
                            {category}
                          </option>
                    )}
                      </Select>
                    </div>
                  </div>
                </Card>
            )}
            </ul>
          }
        </section>

        {/* 다음 단계 */}
        {!done &&
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
            <p className="max-w-md text-small leading-6 text-muted">
              지금 넘어가면 확인하지 않은{' '}
              <strong className="font-semibold text-ink">
                {formatNumber(pendingCount)}건
              </strong>
              은 판정에서 빠집니다. 나중에 이 화면에서 다시 확인할 수 있습니다.
            </p>
            <div className="flex items-center gap-3">
              <Button
              variant="ghost"
              size="inline"
              onClick={() => navigate('/interview')}>

                건너뛰고 문진으로
              </Button>
              <Button variant="secondary" size="md" to="/upload">
                업로드 다시
              </Button>
            </div>
          </div>
        }
      </div>
    </AppShell>);

}
