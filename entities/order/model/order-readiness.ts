import type { AccountCashCheck, AccountHoldingsCheck, LedgerCheck, NextOrderPreview } from './types'

export interface DirectionReadiness {
  hasOrders: boolean
  unplaced: boolean    // 계획엔 있는데 오늘 실제 미접수 (오늘 시도 자체가 없으면 false)
}

export interface OrderReadiness {
  buy: DirectionReadiness
  sell: DirectionReadiness
  ledgerShortfall: LedgerCheck | null // 전략 원장 예수금 부족으로 신규 BUY 전체 거절 (BUY 계획이 있고 sufficient=false일 때만)
  ledgerTrimmed: boolean              // 원장에 맞춰 BUY를 줄여 접수 (부족 아님, 정보성)
  accountCashShortfall: AccountCashCheck | null // 계좌 주문가능 USD 부족 — 증권사가 BUY를 거절할 수 있음 (원장 거절이면 BUY가 안 나가므로 null)
  accountCashPartial: boolean // 부족이지만 보정 주문을 빼면 충분 — 일부 BUY만 거절될 수 있음 (전략 간 접수 순서가 정해지지 않아 어느 주문인지는 단정하지 않는다)
  correctionExcludedBuyUsd: number | null // 계좌 부족 시 보정 주문 제외 필요 금액 — 보정 지정가는 접수 시 묶이지만 실제 체결은 단위금액 안에서 끝난다 (보정 없으면 null)
  holdingsShortfall: AccountHoldingsCheck | null // 계좌 종목 판매 가능 수량 부족 — 증권사가 SELL을 거절할 수 있음
}

// 카드/상세 두 위젯이 공유하는 순수 판정 로직 — BUY/SELL 각 방향에 대해 "오늘 계획된 주문 중
// 실제 미접수 방향인가"를 plannedDirections(orders) vs placedDirections(todayOrders)로 판정하고,
// 서버가 내려준 전략 원장 점검(ledgerCheck) 결과를 BUY 계획과 함께 해석한다
export function computeOrderReadiness(preview: NextOrderPreview | undefined): OrderReadiness {
  const orders = preview?.orders ?? []
  const todayOrders = preview?.todayOrders ?? []
  const ledgerCheck = preview?.ledgerCheck ?? null
  const accountCashCheck = preview?.accountCashCheck ?? null
  const accountHoldingsCheck = preview?.accountHoldingsCheck ?? null
  const hasTodayOrders = todayOrders.length > 0

  const plannedDirections = new Set(orders.map((o) => o.direction))
  const placedDirections = new Set(todayOrders.map((o) => o.direction))

  const hasBuyOrders = plannedDirections.has('BUY')
  const hasSellOrders = plannedDirections.has('SELL')
  const ledgerRejected = hasBuyOrders && ledgerCheck?.sufficient === false
  // 계좌 단위 값이라 이 전략에 BUY 계획이 있을 때만 이 전략의 경고로 본다
  const accountCashShortfall = hasBuyOrders && !ledgerRejected && accountCashCheck?.sufficient === false ? accountCashCheck : null
  // 부동소수 뺄셈 오차로 경계값이 뒤집히지 않도록 센트 정수로 비교한다
  const toCents = (usd: number) => Math.round(usd * 100)
  const correctionExcludedCents = accountCashShortfall && accountCashShortfall.correctionBuyUsd > 0
    ? toCents(accountCashShortfall.requiredBuyUsd) - toCents(accountCashShortfall.correctionBuyUsd)
    : null

  return {
    buy: {
      hasOrders: hasBuyOrders,
      unplaced: hasTodayOrders && hasBuyOrders && !placedDirections.has('BUY'),
    },
    sell: {
      hasOrders: hasSellOrders,
      unplaced: hasTodayOrders && hasSellOrders && !placedDirections.has('SELL'),
    },
    ledgerShortfall: ledgerRejected ? ledgerCheck : null,
    ledgerTrimmed: hasBuyOrders && ledgerCheck?.sufficient === true && ledgerCheck.trimmed,
    accountCashShortfall,
    accountCashPartial: accountCashShortfall != null && correctionExcludedCents != null && toCents(accountCashShortfall.availableUsd) >= correctionExcludedCents,
    correctionExcludedBuyUsd: correctionExcludedCents == null ? null : correctionExcludedCents / 100,
    holdingsShortfall: hasSellOrders && accountHoldingsCheck?.sufficient === false ? accountHoldingsCheck : null,
  }
}
