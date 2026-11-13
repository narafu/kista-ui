import { z } from 'zod'
import { orderRequiresQuantity } from '@entities/privacy'
import type { AdminPrivacyOrderRequest } from '@entities/privacy'

// 주문 한 행의 폼 값(숫자도 입력 문자열 그대로). BUY는 quantity 필수 — 서버가 400으로 거부하므로 선제 차단.
export const privacyOrderSchema = z.object({
  direction: z.enum(['BUY', 'SELL']),
  orderType: z.enum(['LOC', 'MOC', 'LIMIT']),
  price: z.string(),
  quantity: z.string(),
}).superRefine((o, ctx) => {
  if (o.price === '' || Number(o.price) <= 0) ctx.addIssue({ code: 'custom', path: ['price'], message: '가격은 0보다 커야 합니다.' })
  if (orderRequiresQuantity(o.direction) && o.quantity === '') ctx.addIssue({ code: 'custom', path: ['quantity'], message: '매수 주문은 수량이 필요합니다.' })
})

export type PrivacyOrderDraft = z.input<typeof privacyOrderSchema>

export const newOrderDraft = (): PrivacyOrderDraft => ({ direction: 'BUY', orderType: 'LOC', price: '', quantity: '' })

export const toOrderRequest = (o: PrivacyOrderDraft): AdminPrivacyOrderRequest => ({
  direction: o.direction,
  orderType: o.orderType,
  price: Number(o.price),
  quantity: o.quantity === '' ? null : Number(o.quantity),
})
