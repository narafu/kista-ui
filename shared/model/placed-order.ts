import { num, str } from '@shared/lib/normalize'

export interface PlacedOrder {
  id: string
  ticker: string
  direction: 'BUY' | 'SELL'
  orderType: string
  quantity: number
  price: string
  status: 'PLANNED' | 'PLACED'
}

// 주문 항목 응답(unknown) → 공통 필드 정규화. entities/strategy·entities/order 양쪽이 소비하며
// entities 간 cross-import가 금지되어 있어 shared/model에 둔다. status는 원문 문자열 그대로 담고
// (기본값 적용·'PLANNED'|'PLACED' 캐스팅은 호출부 책임), 호출부별 추가 필드는 스프레드로 유지한다.
export function normalizePlacedOrderBase(raw: unknown): {
  id: string
  ticker: string
  direction: 'BUY' | 'SELL'
  orderType: string
  quantity: number
  price: string
  status: string
} {
  const o = raw as Record<string, unknown>
  return {
    id: str(o.id),
    ticker: str(o.ticker),
    direction: str(o.direction) as 'BUY' | 'SELL',
    orderType: str(o.orderType),
    quantity: num(o.quantity),
    price: str(o.price),
    status: str(o.status),
  }
}
