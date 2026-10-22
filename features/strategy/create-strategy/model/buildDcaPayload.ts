import type { DcaCondition, DcaConfigRequest, DcaRuleRequest, StrategyRequest } from '@entities/strategy'
import { LAST_DAY, type DcaConditionFormValue, type DcaFormValues, type DcaRuleFormValues } from './dcaFormSchema'

function toCondition(c: DcaConditionFormValue): DcaCondition {
  return c.indicator === 'SMA'
    ? { indicator: c.indicator, operator: c.operator, smaPeriod: c.smaPeriod ?? undefined }
    : { indicator: c.indicator, operator: c.operator, threshold: c.threshold ?? undefined }
}

// 주기 전환 후 남은 요일/날짜, sizing 전환 후 남은 반대 값은 버린다. ruleKey는 호출부가 붙인다
function toRule(r: DcaRuleFormValues): DcaRuleRequest {
  // 스키마가 null을 거부하므로 도달 불가 — 0 폴백으로 조용히 0원 주문을 보내지 않도록 실패시킨다
  if (r.sizingType === 'AMOUNT' ? r.amount == null : r.percent == null) {
    throw new Error('sizing 값은 스키마 검증을 통과한 값이어야 합니다')
  }
  return {
    direction: r.direction,
    frequency: r.frequency,
    dayOfWeek: r.frequency === 'WEEKLY' ? r.dayOfWeek : null,
    dayOfMonth: r.frequency === 'MONTHLY' && r.dayOfMonth && r.dayOfMonth !== LAST_DAY ? Number(r.dayOfMonth) : null,
    orderType: r.orderType,
    // 크립토만 실행 시각을 보낸다 — 주식은 서버가 무시하지만 키 자체를 만들지 않는다
    ...(r.market === 'CRYPTO_KRW' && r.executionHour != null ? { executionHour: r.executionHour } : {}),
    sizing: r.sizingType === 'AMOUNT'
      ? { type: 'AMOUNT', amount: r.amount, percent: null }
      : { type: 'HOLDING_PERCENT', amount: null, percent: r.percent },
    shortfall: r.shortfall,
    conditions: r.conditions.map(toCondition),
  }
}

// 수정용 — 기존 규칙은 ruleKey 재전송, 신규는 null
export function buildDcaConfig(v: DcaFormValues): DcaConfigRequest {
  return { rules: v.rules.map((r) => ({ ruleKey: r.ruleKey ?? null, ...toRule(r) })) }
}

// 등록용 — 규칙에 ruleKey 키를 만들지 않는다(보내면 400)
export function buildDcaCreatePayload(v: DcaFormValues): StrategyRequest {
  return {
    type: 'DCA',
    ticker: v.ticker,
    cycleSeedType: 'NONE', // 필수 필드 충족용 — DCA는 서버가 무시
    ...(v.scheduledStartDate ? { scheduledStartDate: v.scheduledStartDate } : {}),
    ...(v.initialHoldings != null && v.initialHoldings > 0
      ? { initialHoldings: v.initialHoldings, initialAvgPrice: v.initialAvgPrice ?? undefined }
      : {}),
    dca: { rules: v.rules.map(toRule) },
  }
}
