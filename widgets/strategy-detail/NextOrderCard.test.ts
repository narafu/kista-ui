import { describe, expect, it } from 'vitest'
import type { PlacedOrder } from '@shared/model/placed-order'
import { executedHeaderLabel } from './NextOrderCard'

const order = (status: PlacedOrder['status']) => ({ status }) as PlacedOrder

describe('executedHeaderLabel', () => {
  it.each([
    [[], '접수됨'],
    [[order('PLACED'), order('PLANNED')], '2건 접수됨'],
    [[order('PLACED'), order('SUBMITTING')], '1건 접수됨 · 1건 접수 중'],
    [[order('SUBMITTING')], '1건 접수 중'],
  ])('%j → %s', (orders, label) => {
    expect(executedHeaderLabel(orders)).toBe(label)
  })
})
