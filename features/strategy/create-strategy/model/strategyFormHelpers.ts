import type { UseFormReturn } from 'react-hook-form'
import { todayKst } from '@shared/lib/format'
import type { CycleSeedType, Strategy, StrategyValidation, VrRecurringMode } from '@entities/strategy'
import type { StrategyFieldSettings, StrategyTypeMeta } from '@entities/meta'
import type { VrFields } from './useStrategyForm'
import type { DivisionCount, StrategyFormValues } from './strategyFormSchema'

type RuntimeStrategySettings = Pick<StrategyTypeMeta, 'enabled' | 'fields'>

const VR_FIELD_KEYS = [
  'avgPrice', 'quantity', 'intervalWeeks', 'bandWidth', 'recurringAmount', 'initialValue',
  'initialGradient', 'gGraceWeeks', 'gStepWeeks', 'gMax',
  'initialPoolLimitRate', 'pGraceWeeks', 'pStepWeeks', 'poolLimitFloor',
] as const satisfies readonly (keyof VrFields)[]

// VR 입력의 고정 기본값 — 관리자 운영 설정이 있으면 typeDefaultValues가 덮는다. VR은 이 폼에 수정 화면이 없다(VR 재설정)
const VR_ADVANCED_DEFAULTS = {
  initialValue: null,
  initialGradient: null,
  gGraceWeeks: null,
  gStepWeeks: null,
  gMax: null,
  initialPoolLimitRate: null,
  pGraceWeeks: null,
  pStepWeeks: null,
  poolLimitFloor: null,
}

const VR_DEFAULTS = {
  intervalWeeks: 2,
  bandWidth: 15,
  recurringAmount: 0,
  recurringMode: 'HOLD' as VrRecurringMode,
  ...VR_ADVANCED_DEFAULTS,
}

// 유형별 등록 기본값(관리자 운영 설정) — 첫 화면과 유형 변경이 같은 값을 쓴다. 시드는 유형과 무관하게 0에서 시작한다(useSeedModel)
export function typeDefaultValues(settings: RuntimeStrategySettings | undefined): Partial<StrategyFormValues> {
  if (!settings) return {}
  const { ticker, divisionCount, bandWidth, intervalWeeks, recurringMode } = settings.fields
  return {
    ticker: ticker.defaultValue,
    ...(divisionCount ? { divisionCount: divisionCount.defaultValue as DivisionCount } : {}),
    ...(bandWidth ? { bandWidth: bandWidth.defaultValue } : {}),
    ...(intervalWeeks ? { intervalWeeks: intervalWeeks.defaultValue } : {}),
    ...(recurringMode ? { recurringMode: recurringMode.defaultValue as VrRecurringMode, recurringAmount: 0 } : {}),
  }
}

// 등록은 defaultType 유형의 기본값을 채운다 — 수정은 저장값만
export function buildStrategyFormDefaults(initial: Strategy | undefined, defaultType: string, settings?: RuntimeStrategySettings): StrategyFormValues {
  const divisionCount: DivisionCount = initial?.divisionCount ?? 1
  return {
    type: initial?.type ?? defaultType ?? '',
    ticker: initial?.ticker ?? '',
    autoStart: initial ? initial.cycleSeedType !== 'NONE' : true,
    seedMode: initial?.cycleSeedType === 'MAINTAIN' ? 'KEEP' : 'MAX',
    divisionCount,
    // 중간부터 시작(평단가·수량)은 등록 전용 — 수정 모드에서는 역산 불가하므로 항상 빈 값
    avgPrice: null,
    quantity: null,
    ...VR_DEFAULTS,
    // 시작예정일도 등록 전용 — 등록은 오늘 기본값(필수), 수정 모드에서는 항상 빈 값
    scheduledStartDate: initial ? null : todayKst(),
    ...(initial ? {} : typeDefaultValues(settings)),
  }
}

// 적립 금액은 절댓값으로 입력받고 부호는 적립 방향이 정한다 — 거치는 0
export function signedRecurringAmount(mode: VrRecurringMode, amount: number | null): number {
  const magnitude = Math.abs(amount ?? 0)
  return mode === 'HOLD' ? 0 : mode === 'WITHDRAW' ? -magnitude : magnitude
}

// VR 필드 watch (avgPrice·quantity는 중간부터 시작 공통 필드)
export function watchVrFields(form: UseFormReturn<StrategyFormValues>): VrFields {
  return Object.fromEntries(VR_FIELD_KEYS.map((key) => [key, form.watch(key) ?? null])) as unknown as VrFields
}

// capability 파생 — isInfinite 휴리스틱 대신 백엔드 SSOT 사용
export function deriveRuntimeFields(
  initial: Strategy | undefined,
  runtimeStrategy: RuntimeStrategySettings | undefined,
  isTickerAllowed: (code: string) => boolean, // 메타에 있는 티커만
  typeUsesDivisionCount: boolean, // meta divisionCounts 비어 있지 않음 — 카드·상세와 같은 기준
) {
  const divisionCountSettings = runtimeStrategy?.fields.divisionCount
  const availableTickers = initial
    ? [initial.ticker]
    : (runtimeStrategy?.fields.ticker.allowedValues ?? []).filter(isTickerAllowed)
  const configDefault = runtimeStrategy?.fields.ticker.defaultValue
  return {
    availableTickers,
    // 설정 기본값이 허용 목록 밖이면(설정 드리프트) 첫 허용값으로 대체한다
    defaultTicker: configDefault && availableTickers.includes(configDefault) ? configDefault : availableTickers[0] ?? '',
    divisionCountSettings,
    // 수정은 응답의 divisionCount 유무가 아니라 유형 meta로 판정 — 등록 응답이 PRIVACY에도 값을 싣던 적이 있다
    usesDivisionCount: initial ? typeUsesDivisionCount : !!divisionCountSettings,
    tickerCustomizable: initial ? false : runtimeStrategy?.fields.ticker.customizable ?? false,
    vrSettings: {
      recurringMode: runtimeStrategy?.fields.recurringMode as StrategyFieldSettings<string> | undefined,
      bandWidth: runtimeStrategy?.fields.bandWidth,
      intervalWeeks: runtimeStrategy?.fields.intervalWeeks,
    },
  }
}

// basePrice/minSeed는 서버 검증의 파생값 — VR 전략은 기준가·최소 시드를 쓰지 않고 가용 예수금만 쓴다
export function deriveSeedPreview(isVr: boolean, data: StrategyValidation['derived'] | undefined) {
  // 서버 값은 증권사 주문가능액 − 다른 전략 원장이라 음수일 수 있다 — 참고값이므로 0으로 표시한다
  const availableCash = data?.availableCash == null ? null : Math.max(0, data.availableCash)
  if (isVr) return { basePrice: null, minSeed: null, seedUnavailableReason: null, availableCash }
  return {
    basePrice: data?.basePrice ?? null,
    minSeed: data?.minSeed ?? null,
    seedUnavailableReason: data?.skipReason ?? null,
    availableCash,
  }
}

// VR은 cycleSeedType 항상 NONE — 롤오버가 자체 사이클 교체 담당
export function toCycleSeedType(isVr: boolean, autoStart: boolean, seedMode: 'KEEP' | 'MAX'): CycleSeedType {
  if (isVr || !autoStart) return 'NONE'
  return seedMode === 'KEEP' ? 'MAINTAIN' : 'MAX'
}

export function createFormSetters(form: UseFormReturn<StrategyFormValues>, settingsOf: (type: string) => RuntimeStrategySettings | undefined) {
  return {
    // 유형을 바꾸면 그 유형의 기본값으로 다시 채운다(사용자가 고른 종목·분할 수·VR 값은 버린다)
    setType: (t: string) => {
      const changed = t !== form.getValues('type')
      form.setValue('type', t)
      // 유형이 바뀌면 VR 고급 설정도 비운다 — 스키마가 유형과 무관하게 검사해, 남으면 보이지 않는 칸 때문에 제출이 막힌다
      for (const [key, value] of Object.entries({ ...(changed ? VR_ADVANCED_DEFAULTS : {}), ...typeDefaultValues(settingsOf(t)) })) {
        form.setValue(key as keyof StrategyFormValues, value)
      }
      // 보유(avgPrice·quantity)는 전환 뒤에도 남으므로 그 오류는 두고, VR 전용 칸의 오류만 비운다
      if (changed) form.clearErrors(Object.keys(VR_DEFAULTS) as (keyof StrategyFormValues)[])
    },
    handleTickerChange: (code: string) => { form.setValue('ticker', code) },
    setAutoStart: (v: boolean) => { form.setValue('autoStart', v) },
    setSeedMode: (m: 'KEEP' | 'MAX') => { form.setValue('seedMode', m) },
    setDivisionCount: (n: DivisionCount) => { form.setValue('divisionCount', n) },
    // VR 필드 개별 setter
    setVrField: (field: keyof VrFields, value: number | null) => {
      form.setValue(field, field === 'recurringAmount' && value !== null ? Math.abs(value) : value)
      // 이미 뜬 칸 오류만 다시 검사한다(제출 전에 새로 띄우지 않는다)
      if (form.getFieldState(field).error) void form.trigger(field)
    },
    setRecurringMode: (mode: VrRecurringMode) => {
      form.setValue('recurringMode', mode)
      if (mode === 'HOLD') form.setValue('recurringAmount', 0)
    },
    setScheduledStartDate: (date: string | null) => { form.setValue('scheduledStartDate', date) },
  }
}
