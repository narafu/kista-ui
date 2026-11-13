'use client'

import { useFieldArray, type Control, type FieldValues } from 'react-hook-form'
import { Plus, X } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@shared/ui/FormDialog'
import { FormActions } from '@shared/ui/FormActions'
import { IconButton } from '@shared/ui/IconButton'
import { useAppForm } from '@shared/ui/form/useAppForm'
import { FormField } from '@shared/ui/form/FormField'
import { todayKst } from '@shared/lib/format'
import { useCreateAdminPrivacyBaseMutation, useUpdateAdminPrivacyBaseMutation } from '@entities/privacy'
import type { AdminPrivacyBase } from '@entities/privacy'
import { PrivacyOrderFields } from './PrivacyOrderFields'
import { newOrderDraft, privacyOrderSchema, toOrderRequest } from './privacyOrderSchema'

const REQUIRED = '값을 입력하세요.'
const schema = z.object({
  releaseDate: z.string().min(1, REQUIRED),
  ticker: z.string().trim().min(1, REQUIRED),
  currentCycleStart: z.string().min(1, REQUIRED),
  currentCycleRealizedPnl: z.string().min(1, REQUIRED),
  avgPrice: z.string().refine((v) => v === '' || Number(v) >= 0, '평단가는 0 이상이어야 합니다.'),
  holdings: z.string().min(1, REQUIRED),
  orders: z.array(privacyOrderSchema),
})

interface Props {
  // 있으면 수정(주문 행 없이 4필드만), 없으면 등록
  base?: AdminPrivacyBase
  open: boolean
  onClose: () => void
}

export function PrivacyBaseFormDialog({ base, open, onClose }: Props) {
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={base ? `${base.releaseDate} ${base.ticker} 수정` : 'P 매매표 등록'}
      description={base ? '사이클 시작금액, 평단가, 보유, 실현손익을 입력하세요.' : '날짜, 종목, 사이클 시작금액, 주문을 입력하세요.'}
    >
      {(close) => <PrivacyBaseForm base={base} onDone={close} />}
    </FormDialog>
  )
}

function PrivacyBaseForm({ base, onDone }: { base?: AdminPrivacyBase; onDone: () => void }) {
  const createMutation = useCreateAdminPrivacyBaseMutation()
  const updateMutation = useUpdateAdminPrivacyBaseMutation(base?.id ?? '')
  const form = useAppForm({
    schema,
    defaultValues: base
      ? {
          releaseDate: base.releaseDate,
          ticker: base.ticker,
          currentCycleStart: String(base.currentCycleStart),
          currentCycleRealizedPnl: String(base.currentCycleRealizedPnl),
          avgPrice: base.avgPrice == null ? '' : String(base.avgPrice),
          holdings: String(base.holdings),
          orders: [],
        }
      : { releaseDate: todayKst(), ticker: 'SOXL', currentCycleStart: '', currentCycleRealizedPnl: '0', avgPrice: '', holdings: '0', orders: [newOrderDraft()] },
    mutation: base ? updateMutation : createMutation,
    toPayload: (v) => {
      const fields = {
        currentCycleStart: Number(v.currentCycleStart),
        currentCycleRealizedPnl: Number(v.currentCycleRealizedPnl),
        avgPrice: v.avgPrice === '' ? null : Number(v.avgPrice),
        holdings: Number(v.holdings),
      }
      return base ? fields : { releaseDate: v.releaseDate, ticker: v.ticker, ...fields, orders: v.orders.map(toOrderRequest) }
    },
    successMessage: base ? 'P 매매표가 수정되었습니다' : 'P 매매표가 등록되었습니다',
    onDone,
  })
  const { fields: orderRows, append, remove } = useFieldArray({ control: form.control, name: 'orders' })
  const { control, isPending } = form

  return (
    <form onSubmit={form.submit} className="space-y-4 py-2">
      {!base && (
        // iOS 사파리의 date 입력은 고유 최소 폭이 있어 2열에서 옆 칸을 침범한다 — 모바일은 한 줄씩 둔다
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField control={control} name="releaseDate" label="날짜" required>
            {(f) => <Input {...f} type="date" disabled={isPending} className="h-11" />}
          </FormField>
          <FormField control={control} name="ticker" label="종목" required>
            {(f) => <Input {...f} maxLength={20} disabled={isPending} className="h-11" />}
          </FormField>
        </div>
      )}

      <div className={base ? 'space-y-4' : 'grid grid-cols-2 gap-x-3 gap-y-4'}>
        <FormField control={control} name="currentCycleStart" label="사이클 시작금액" required>
          {(f) => <Input {...f} type="number" step="0.01" disabled={isPending} className="h-11" />}
        </FormField>
        <FormField control={control} name="avgPrice" label="평단가 (없으면 비움)">
          {(f) => <Input {...f} type="number" step="0.01" min="0" disabled={isPending} className="h-11" />}
        </FormField>
        <FormField control={control} name="holdings" label="보유" required>
          {(f) => <Input {...f} type="number" step="1" min="0" disabled={isPending} className="h-11" />}
        </FormField>
        <FormField control={control} name="currentCycleRealizedPnl" label="실현손익" required>
          {(f) => <Input {...f} type="number" step="0.01" disabled={isPending} className="h-11" />}
        </FormField>
      </div>

      {!base && (
        <div role="group" aria-labelledby="createOrdersLabel" className="space-y-2">
          <div className="flex items-center justify-between">
            <span id="createOrdersLabel" className="text-sm font-medium">주문</span>
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => append(newOrderDraft())} disabled={isPending}>
              <Plus className="size-3.5" />주문 추가
            </Button>
          </div>

          {/* 2열(방향·유형 / 가격·수량) — 다이얼로그 폭이 좁아 PC에서도 한 줄에 넷을 넣으면 가격·수량 칸이 찌그러진다 */}
          {orderRows.map((row, i) => (
            <div key={row.id} className="grid grid-cols-2 items-end gap-2 rounded-[var(--r-sm)] border border-border p-3">
              <PrivacyOrderFields control={control as unknown as Control<FieldValues>} prefix={`orders.${i}.`} compact disabled={isPending} />
              {orderRows.length > 1 && (
                <IconButton aria-label={`주문 ${i + 1} 삭제`} className="col-span-2 justify-self-end" onClick={() => remove(i)} disabled={isPending}>
                  <X className="size-4" />
                </IconButton>
              )}
            </div>
          ))}
        </div>
      )}

      <FormActions form={form} label={base ? '수정' : '등록'} onCancel={onDone} />
    </form>
  )
}
