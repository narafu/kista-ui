import type { OrderDirection } from './types'

/** 매수/매도 방향 배지 클래스를 반환한다. (BUY=pos 빨강, SELL=neg 파랑) */
export function directionBadgeClass(direction: OrderDirection | string): string {
  return direction === 'BUY' ? 'bg-pos-bg text-pos' : 'bg-neg-bg text-neg'
}
