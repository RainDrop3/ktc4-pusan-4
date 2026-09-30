import React, { useState } from 'react';
import { InboxIcon } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { api, ApiRequestError, useApi } from '../api';
import { useSession } from '../contexts/SessionContext';
import {
  Badge,
  Button,
  Empty,
  Modal,
  Pagination,
  Table,
  type Column } from
'../components/ui';
import type { UploadBatch } from '../types/domain';
import { formatFullDate, formatNumber, formatPeriod } from '../utils/format';

/**
 * 업로드 이력 (FR-24·25).
 * 배치를 지우면 거래·판정·질문·사용자 수정까지 함께 사라진다(api.md 3.3). 지우기 전에 그걸 말한다.
 */
export function Uploads() {
  const { batchId, setBatchId } = useSession();
  const [page, setPage] = useState(0);
  const [target, setTarget] = useState<UploadBatch | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listQ = useApi(() => api.uploads.list({ page, size: 20 }), [page]);
  const rows = listQ.data?.items ?? [];

  const remove = async () => {
    if (!target) return;
    setDeleting(true);
    setError(null);
    try {
      await api.uploads.remove(target.id);
      if (batchId === target.id) setBatchId(null);
      setTarget(null);
      listQ.reload();
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError ?
        caught.message :
        '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.'
      );
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<UploadBatch>[] = [
  {
    header: '올린 날',
    width: 'w-[7.5rem]',
    cell: (row) =>
    <span className="whitespace-nowrap tabular-nums text-ink2">
          {formatFullDate(row.createdAt.slice(0, 10))}
        </span>

  },
  {
    header: '카드사 · 기간',
    cell: (row) =>
    <span className="block min-w-0">
          <span className="block font-medium text-ink">
            {row.cardIssuer}카드 · {row.sourceType}
          </span>
          <span className="block truncate text-small tabular-nums text-muted">
            {formatPeriod(row.periodStart, row.periodEnd)}
          </span>
        </span>

  },
  {
    header: '거래',
    align: 'right',
    width: 'w-36',
    cell: (row) =>
    <span className="block">
          <span className="font-semibold tabular-nums text-ink">
            {formatNumber(row.transactionCount)}건
          </span>
          {row.skippedDuplicateCount > 0 &&
      <span className="block text-caption tabular-nums text-muted">
              중복 {formatNumber(row.skippedDuplicateCount)}건 제외
            </span>
      }
        </span>

  },
  {
    header: '분류',
    align: 'right',
    hideBelow: 'sm',
    width: 'w-32',
    cell: (row) =>
    row.classificationPendingCount > 0 ?
    <Badge tone="warn">확인 {formatNumber(row.classificationPendingCount)}건</Badge> :
    <span className="text-small text-muted">완료</span>

  },
  {
    header: '',
    align: 'right',
    width: 'w-24',
    cell: (row) =>
    <Button variant="ghost" size="sm" onClick={() => setTarget(row)}>
          삭제
        </Button>

  }];


  return (
    <AppShell>
      <header>
        <p className="text-small font-semibold text-accent">업로드 이력</p>
        <h1 className="mt-1.5 text-h2 font-bold tracking-tight text-ink">
          지금까지 올린 파일
        </h1>
        <p className="mt-2 max-w-2xl text-body leading-6 text-ink2">
          같은 파일을 다시 올리면 막히고, 기간이 겹쳐도 같은 거래는 한 번만
          들어갑니다.
        </p>
      </header>

      {error &&
      <p
        role="alert"
        className="mt-4 rounded-xl border border-deny-line bg-deny-bg px-4 py-3 text-body text-deny">

          {error}
        </p>
      }

      <div className="mt-6">
        <Table
          caption="업로드 이력"
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          selectedKey={batchId ?? undefined}
          loading={listQ.loading}
          empty={
          <Empty
            icon={<InboxIcon className="h-5 w-5" />}
            title="아직 올린 파일이 없습니다"
            description="국민·기업카드 이용내역을 올리면 여기에 쌓입니다."
            action={
            <Button to="/upload" size="sm">
                  카드내역 올리기
                </Button>
            } />

          } />


        {listQ.data && rows.length > 0 &&
        <Pagination page={listQ.data.page} onChange={setPage} />
        }
      </div>

      <Modal
        open={target !== null}
        onClose={() => setTarget(null)}
        tone="danger"
        title="이 업로드를 지울까요?"
        description="되돌릴 수 없습니다. 이 파일에서 나온 거래와 판정 결과, 되묻기 답변, 직접 수정한 판정까지 함께 사라집니다."
        footer={
        <>
            <Button
            variant="secondary"
            size="md"
            disabled={deleting}
            onClick={() => setTarget(null)}>
            
              취소
            </Button>
            <Button
            variant="danger"
            size="md"
            disabled={deleting}
            onClick={() => void remove()}>
            
              {deleting ? '지우는 중…' : '지우기'}
            </Button>
          </>
        }>

        {target &&
        <dl className="space-y-1.5 rounded-xl bg-canvas p-4 text-small">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">파일</dt>
              <dd className="text-ink">
                {target.cardIssuer}카드 · {target.sourceType}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">기간</dt>
              <dd className="tabular-nums text-ink">
                {formatPeriod(target.periodStart, target.periodEnd)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">거래</dt>
              <dd className="tabular-nums text-ink">
                {formatNumber(target.transactionCount)}건
              </dd>
            </div>
          </dl>
        }
      </Modal>
    </AppShell>);

}
