import type { SkipReason, OrderReadiness, DirectionReadiness } from '@entities/order'
import { fmtUsd } from '@shared/lib/format'
import { ApiError } from '@shared/lib/api-client'

export const SKIP_REASON_LABELS: Record<SkipReason, string> = {
  NO_CYCLE_HISTORY: '첫 매매 전입니다. 사이클 정보가 아직 없습니다.',
  NO_PRIVACY_BASE: 'P 매매표가 없습니다.',
  SCHEDULED_START_NOT_REACHED: '시작예정일 전입니다. 예정일 이후 첫 거래일부터 매매가 시작됩니다.',
}

// 방향별 문구 재료 — 라벨/부족 서식은 BUY·SELL 각각 다르므로 방향마다 한 벌씩 정의하고,
// 우선순위 판정(확인 실패 > 부족 > 충족)은 아래 두 함수가 공유한다
interface DirectionCopy {
  uncertainMessage: string
  formatDeficitMessage: (deficitAmount: number) => string
  sufficientMessage: string
}

export const BUY_COPY: DirectionCopy = {
  uncertainMessage: '예수금 확인 실패로 매수 미접수 — 잠시 후 다시 확인해주세요',
  formatDeficitMessage: () => '예수금 부족으로 매수 미접수',
  sufficientMessage: '예수금 충족됨 — 마감 시 매수 예정',
}

export const SELL_COPY: DirectionCopy = {
  uncertainMessage: '판매가능수량 확인 실패로 매도 미접수 — 잠시 후 다시 확인해주세요',
  formatDeficitMessage: (qty) => `판매가능수량 ${qty}주 부족으로 매도 미접수`,
  sufficientMessage: '판매가능수량 충족됨 — 마감 시 매도 재시도 예정',
}

// "미접수" 목록 문구 — 확인 실패 > 부족 > 충족 우선순위로 선택
export function directionUnplacedMessage(direction: DirectionReadiness, copy: DirectionCopy): string {
  if (direction.uncertain) return copy.uncertainMessage
  if (direction.hasDeficit) return copy.formatDeficitMessage(direction.deficitAmount)
  return copy.sufficientMessage
}

// 카드 상단 배너 문구(방향 1개분) — 확인 실패 > 부족 우선순위. 확인 실패 문구는 preview 모드에서만
// 노출한다 — executed 모드에서는 아래 "미접수" 목록이 방향별로 확인 실패 사유까지 이미 안내하므로,
// 배너에서 또 보여주면 중복이다
export function directionBannerText(mode: 'preview' | 'executed', direction: DirectionReadiness, uncertainBannerMessage: string, formatDeficitBanner: (deficitAmount: number) => string): string | null {
  if (mode === 'preview' && direction.uncertain) return uncertainBannerMessage
  if (!direction.hasDeficit) return null
  return formatDeficitBanner(direction.deficitAmount)
}

// 카드 상단 배너 문구 — 휴장일/예수금·판매가능수량 부족을 "바로 주문" 가능 여부와 함께 안내한다.
// BUY/SELL 부족이 동시에 발생할 수 있어(같은 전략에 두 방향 모두 계획된 경우) 한쪽만 보여주고 끝내지
// 않도록 둘 다 문구를 만든 뒤 합친다
export function nextOrderBannerText(canExecute: boolean, mode: 'preview' | 'executed', isHoliday: boolean, marketStatusMessage: string | null, readiness: OrderReadiness): string | null {
  if (!canExecute) return null
  if (mode === 'preview' && marketStatusMessage) return marketStatusMessage
  if (mode === 'preview' && isHoliday) return '오늘은 휴장일입니다'

  const parts = [
    directionBannerText(mode, readiness.buy, '예수금 확인 실패 — 잠시 후 다시 확인해주세요', (amount) =>
      mode === 'preview' ? `예수금 $${fmtUsd(amount)} 부족(장 마감 시 재시도)` : `예수금 $${fmtUsd(amount)} 부족`),
    directionBannerText(mode, readiness.sell, '판매가능수량 확인 실패 — 잠시 후 다시 확인해주세요', (amount) =>
      mode === 'preview' ? `판매가능수량 ${amount}주 부족(장 마감 시 재시도)` : `판매가능수량 ${amount}주 부족`),
  ].filter((part): part is string => part != null)
  return parts.length > 0 ? parts.join(' · ') : null
}

export function previewErrorMsg(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return '전략 사이클 정보를 찾을 수 없습니다.'
    if (error.status === 503) return '증권사 API에 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
  }
  return '주문 미리보기를 불러오는 중 오류가 발생했습니다.'
}

// VR 정기 입출금 부호별 라벨 — 카드 자체가 "운용 방식"을 겸하므로 별도 recurringMode 필드 없이 amount 부호로만 판정한다
export function recurringModeLabel(recurringAmount: number): string {
  if (recurringAmount > 0) return `적립식($${fmtUsd(recurringAmount)})`
  if (recurringAmount === 0) return '거치식'
  return `인출식($${fmtUsd(Math.abs(recurringAmount))})`
}
