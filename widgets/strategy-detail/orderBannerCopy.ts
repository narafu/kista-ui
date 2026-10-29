import type { SkipReason, OrderReadiness } from '@entities/order'
import { fmtUsd } from '@shared/lib/format'
import { ApiError, apiMsg } from '@shared/lib/api-client'

export const SKIP_REASON_LABELS: Record<SkipReason, string> = {
  NO_CYCLE_HISTORY: '첫 매매 전입니다.\n사이클 정보가 아직 없습니다.',
  NO_PRIVACY_BASE: 'P 매매표가 없습니다.',
  SCHEDULED_START_NOT_REACHED: '시작예정일 전입니다.\n시작예정일 밤 미국장부터 매매합니다.',
  CYCLE_ENDED: '사이클이 종료되었습니다.\n전략을 일시중지 후 재개하면 새 사이클이 시작됩니다.',
  PRIVACY_BASE_BLOCKED: 'P 매매표 점검 이슈로 오늘은 주문하지 않습니다.',
}

// 일시중지 중에는 "일시중지 후 재개" 안내가 어긋나므로 사이클 종료 문구만 바꾼다
export function pausedSkipReasonLabel(reason: SkipReason): string {
  if (reason === 'CYCLE_ENDED') return '사이클이 종료되었습니다.\n재개하면 새 사이클이 시작됩니다.'
  return SKIP_REASON_LABELS[reason]
}

// "미접수" 목록 문구 — BUY는 원장 부족이면 재시도 없이 거절되고, 계좌 예수금 부족(조회 시점 추정)이면 증권사가 거절할 수 있어 사유를 안내한다. 그 외 미접수는 장 마감 시 재시도된다
export function directionUnplacedMessage(direction: 'BUY' | 'SELL', readiness: OrderReadiness): string {
  if (direction === 'SELL') return '장 마감 시 매도 재시도 예정'
  if (readiness.ledgerShortfall) return '전략 원장 예수금 부족으로 매수 미접수'
  if (readiness.accountCashShortfall) return '계좌 예수금 부족으로 매수 거절 가능'
  return '장 마감 시 매수 예정'
}

// 카드 상단 배너 문구 — 휴장일/전략 원장·계좌 예수금 부족을 "바로 주문" 가능 여부와 함께 안내한다.
// 원장 거절은 재시도가 없어 preview·executed 모두 "장 마감 시 매수 예정" 같은 약속 문구를 붙이지 않는다
export function nextOrderBannerText(canExecute: boolean, mode: 'preview' | 'executed', isHoliday: boolean, marketStatusMessage: string | null, readiness: OrderReadiness): string | null {
  if (!canExecute) return null
  if (mode === 'preview' && marketStatusMessage) return marketStatusMessage
  if (mode === 'preview' && isHoliday) return '오늘은 휴장일입니다'

  const shortfall = readiness.ledgerShortfall
  if (shortfall) return `전략 원장 예수금 부족(원장 $${fmtUsd(shortfall.remainingLedger)} / 필요 $${fmtUsd(shortfall.requiredBuyUsd)})`
  // 계좌 단위 값이라 필요 금액은 이 전략이 아니라 계좌 전체 BUY 합계다
  const cash = readiness.accountCashShortfall
  if (!cash) return null
  return `계좌 예수금 부족(주문가능 $${fmtUsd(cash.availableUsd)} / 계좌 전체 필요 $${fmtUsd(cash.requiredBuyUsd)})`
}

// 404만 화면 고유 문구, 나머지는 서버 detail을 그대로 노출한다 — 증권사 장애 503·API 키 오류 422·호출 한도 429는
// kista-api가 사용자용 문구를 내려주고, 프록시는 그 외 5xx를 숨겨 detail이 없으므로 기본 문구로 떨어진다
export function previewErrorMsg(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) return '전략 사이클 정보를 찾을 수 없습니다.'
  return apiMsg(error, '주문 미리보기를 불러오는 중 오류가 발생했습니다.')
}

// VR 정기 입출금 부호별 라벨 — 카드 자체가 "운용 방식"을 겸하므로 별도 recurringMode 필드 없이 amount 부호로만 판정한다
export function recurringModeLabel(recurringAmount: number): string {
  if (recurringAmount > 0) return `적립식($${fmtUsd(recurringAmount)})`
  if (recurringAmount === 0) return '거치식'
  return `인출식($${fmtUsd(Math.abs(recurringAmount))})`
}
