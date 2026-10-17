import type { DcaCondition, DcaConfigRequest, StrategyRequest } from '@entities/strategy'
import { LAST_DAY, type DcaConditionFormValue, type DcaFormValues } from './dcaFormSchema'

function toCondition(c: DcaConditionFormValue): DcaCondition {
  return c.indicator === 'SMA'
    ? { indicator: c.indicator, operator: c.operator, smaPeriod: c.smaPeriod ?? undefined }
    : { indicator: c.indicator, operator: c.operator, threshold: c.threshold ?? undefined }
}

// 주기 전환 후 남은 요일/날짜 값은 해당 주기가 아니면 null로 버린다
export function buildDcaConfig(v: DcaFormValues): DcaConfigRequest {
  // 스키마가 null을 거부하므로 도달 불가 — 0 폴백으로 조용히 0원 주문을 보내지 않도록 실패시킨다
  if (v.amount == null) throw new Error('amount는 스키마 검증을 통과한 값이어야 합니다')
  return {
    direction: v.direction,
    amount: v.amount,
    orderType: v.orderType,
    frequency: v.frequency,
    dayOfWeek: v.frequency === 'WEEKLY' ? v.dayOfWeek : null,
    dayOfMonth: v.frequency === 'MONTHLY' && v.dayOfMonth && v.dayOfMonth !== LAST_DAY ? Number(v.dayOfMonth) : null,
    // 코인만 실행 시각을 보낸다 — 주식은 서버가 무시하지만 키 자체를 만들지 않는다
    ...(v.market === 'CRYPTO_KRW' && v.executionHour != null ? { executionHour: v.executionHour } : {}),
    conditions: v.conditions.map(toCondition),
  }
}

export function buildDcaCreatePayload(v: DcaFormValues): StrategyRequest {
  return {
    type: 'DCA',
    ticker: v.ticker,
    cycleSeedType: 'NONE', // 필수 필드 충족용 — DCA는 서버가 무시
    ...(v.scheduledStartDate ? { scheduledStartDate: v.scheduledStartDate } : {}),
    dca: buildDcaConfig(v),
  }
}
