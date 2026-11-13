'use client'

import { FormDialog } from '@shared/ui/FormDialog'
import { FormActions } from '@shared/ui/FormActions'
import { useAppForm } from '@shared/ui/form/useAppForm'
import { useAddAdminPrivacyOrderMutation, useUpdateAdminPrivacyOrderMutation } from '@entities/privacy'
import type { AdminPrivacyOrder } from '@entities/privacy'
import { useMeta } from '@entities/meta'
import { PrivacyOrderFields } from './PrivacyOrderFields'
import { newOrderDraft, privacyOrderSchema, toOrderRequest } from './privacyOrderSchema'
import type { Control, FieldValues } from 'react-hook-form'

interface Props {
  baseId: string
  // 있으면 수정(가격·수량만), 없으면 추가
  order?: AdminPrivacyOrder
  open: boolean
  onClose: () => void
}

export function PrivacyOrderFormDialog({ baseId, order, open, onClose }: Props) {
  const { labelOf } = useMeta()
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={order ? `${labelOf('orderDirections', order.direction)} ${labelOf('orderTypes', order.orderType)} 주문 수정` : '주문 추가'}
      description={order ? '가격, 수량을 입력하세요.' : '방향, 유형, 가격, 수량을 입력하세요.'}
    >
      {(close) => <PrivacyOrderForm baseId={baseId} order={order} onDone={close} />}
    </FormDialog>
  )
}

function PrivacyOrderForm({ baseId, order, onDone }: { baseId: string; order?: AdminPrivacyOrder; onDone: () => void }) {
  const addMutation = useAddAdminPrivacyOrderMutation(baseId)
  const updateMutation = useUpdateAdminPrivacyOrderMutation(baseId, order?.id ?? '')
  const form = useAppForm({
    schema: privacyOrderSchema,
    defaultValues: order
      ? { direction: order.direction, orderType: order.orderType, price: String(order.price), quantity: order.quantity == null ? '' : String(order.quantity) }
      : newOrderDraft(),
    mutation: order ? updateMutation : addMutation,
    toPayload: (v) => {
      const { price, quantity, ...create } = toOrderRequest(v)
      return order ? { price, quantity } : { ...create, price, quantity }
    },
    successMessage: order ? '주문이 수정되었습니다' : '주문이 추가되었습니다',
    onDone,
  })
  return (
    <form onSubmit={form.submit} className="space-y-4 py-2">
      <PrivacyOrderFields control={form.control as unknown as Control<FieldValues>} showKind={!order} disabled={form.isPending} />
      <FormActions form={form} label={order ? '수정' : '추가'} onCancel={onDone} />
    </form>
  )
}
