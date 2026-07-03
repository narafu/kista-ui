import type { OrderDirection } from './types'

/** 매수/매도 한국어 라벨 */
export const DIRECTION_LABEL: Record<string, string> = {
  BUY: '매수',
  SELL: '매도',
}

/** 매수/매도 방향에 따른 텍스트 색 클래스를 반환한다. (BUY=pos 빨강, SELL=neg 파랑) */
export function directionTextClass(direction: OrderDirection | string): string {
  return direction === 'BUY' ? 'text-pos' : 'text-neg'
}
