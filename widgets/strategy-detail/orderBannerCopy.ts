import type { SkipReason, OrderWarning, OrderWarningCode } from '@entities/order'
import { fmtUsd } from '@shared/lib/format'
import { ApiError, apiMsg } from '@shared/lib/api-client'

export const SKIP_REASON_LABELS: Record<SkipReason, string> = {
  NO_CYCLE_HISTORY: '첫 매매 전입니다.\n사이클 정보가 아직 없습니다.',
  NO_PRIVACY_BASE: 'P 매매표가 없습니다.',
  SCHEDULED_START_NOT_REACHED: '시작예정일 전입니다.\n시작예정일 밤 미국장부터 매매합니다.',
  CYCLE_ENDED: '사이클이 종료되었습니다.\n전략을 일시중지 후 재개하면 새 사이클이 시작됩니다.',
  PRIVACY_BASE_BLOCKED: 'P 매매표 점검 이슈로 오늘은 주문하지 않습니다.',
  MARKET_CLOSED: '다음 거래일이 미국 증시 휴장일입니다.\n개장일에 주문이 생성됩니다.',
}

// 휴장 중 개장일 매매표는 그 거래일 전날 발행분만 쓴다(kista-api PrivacyDates.releaseDateFor)
export const CLOSED_NO_PRIVACY_BASE_MESSAGE = '거래일 P 매매표가 아직 없습니다.\n거래일 전날 발행되면 예상 주문이 보입니다.'

// 휴장 중에는 SKIP_REASON_LABELS의 "오늘은"이 어긋난다
export const CLOSED_PRIVACY_BASE_BLOCKED_MESSAGE = 'P 매매표 점검 이슈로 해당 거래일은 주문하지 않습니다.'

// 휴장 중 다음 주문 카드 부제 — tradeDate('yyyy-MM-dd')는 UTC 자정으로 파싱되므로 요일도 UTC로 읽는다
export function estimateSubtitle(tradeDate: string): string {
  const date = new Date(tradeDate)
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}(${'일월화수목금토'[date.getUTCDay()]}) 거래일 예상 주문`
}

// 일시중지 중에는 "일시중지 후 재개" 안내가 어긋나므로 사이클 종료 문구만 바꾼다
export function pausedSkipReasonLabel(reason: SkipReason): string {
  if (reason === 'CYCLE_ENDED') return '사이클이 종료되었습니다.\n재개하면 새 사이클이 시작됩니다.'
  return SKIP_REASON_LABELS[reason]
}

// "미접수" 목록 문구 — 사유는 서버 경고 코드로 분기한다. BUY는 원장 부족이면 재시도 없이 거절되고, 계좌 예수금 부족(조회 시점 추정)이면 증권사가 거절할 수 있어 사유를 안내한다.
// 금액이 담긴 서버 문장(detail)은 상단 배너가 이미 보여주므로 여기선 방향별 짧은 상태만 둔다. 그 외 미접수는 장 마감 시 재시도된다
export function directionUnplacedMessage(direction: 'BUY' | 'SELL', warnings: OrderWarning[]): string {
  const has = (code: OrderWarningCode) => warnings.some((w) => w.code === code)
  if (direction === 'SELL') return has('HOLDINGS_SHORTFALL') ? '보유 수량 부족으로 매도 거절 가능' : '장 마감 시 매도 재시도 예정'
  if (has('LEDGER_SHORTFALL')) return '전략 원장 예수금 부족으로 매수 미접수'
  if (has('ACCOUNT_CASH_PARTIAL')) return '계좌 예수금 부족으로 보정 주문 거절 가능'
  if (has('ACCOUNT_CASH_SHORTFALL')) return '계좌 예수금 부족으로 매수 거절 가능'
  return '장 마감 시 매수 예정'
}

// 방향별 미접수 경고는 배너가 아니라 "미접수" 목록이 보여준다
const UNPLACED_CODES: readonly OrderWarningCode[] = ['BUY_UNPLACED', 'SELL_UNPLACED']

// 카드 상단 배너 문구 — 서버가 marketClosedToday를 주면 휴장 표시는 카드 배지가 맡는다.
// 필드가 없는 구서버 응답만 클라 판정 휴장일이면 휴장 안내, 아니면 서버 경고(원장·계좌 예수금·보유 수량 부족)의 detail을 그대로 이어 붙인다.
// 원장 거절은 재시도가 없어 preview·executed 모두 "장 마감 시 매수 예정" 같은 약속 문구를 붙이지 않는다
export function nextOrderBannerText(canExecute: boolean, mode: 'preview' | 'executed', isHoliday: boolean, marketStatusMessage: string | null, warnings: OrderWarning[], marketClosedToday?: boolean): string | null {
  if (!canExecute) return null
  if (mode === 'preview' && marketClosedToday === undefined) {
    if (marketStatusMessage) return marketStatusMessage
    if (isHoliday) return '오늘은 휴장일입니다'
  }

  return warnings.filter((w) => !UNPLACED_CODES.includes(w.code)).map((w) => w.detail).filter(Boolean).join('\n') || null
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
