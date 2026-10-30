import type { UseFormReturn } from 'react-hook-form'
import { todayKst } from '@shared/lib/format'
import type { CycleSeedType, Strategy, StrategySeedPreview } from '@entities/strategy'
import type { RuntimeConfig, RuntimeFieldSettings, RuntimeStrategyType } from '@entities/runtime-config'
import type { VrFields } from './useStrategyForm'
import type { VrRecurringMode } from './vrDerived'
import type { DivisionCount, StrategyFormValues } from './strategyFormSchema'

type RuntimeStrategySettings = RuntimeConfig['strategies'][RuntimeStrategyType]
type StrategyVr = NonNullable<Strategy['vr']>

const VR_FIELD_KEYS = [
  'avgPrice', 'quantity', 'intervalWeeks', 'bandWidth', 'recurringAmount', 'initialValue',
  'initialGradient', 'gGraceWeeks', 'gStepWeeks', 'gMax',
  'initialPoolLimitRate', 'pGraceWeeks', 'pStepWeeks', 'poolLimitFloor',
] as const satisfies readonly (keyof VrFields)[]

function toRecurringMode(recurringAmount?: number | null): VrRecurringMode {
  if (!recurringAmount) return 'HOLD'
  return recurringAmount < 0 ? 'WITHDRAW' : 'DEPOSIT'
}

function buildVrDefaults(vr?: StrategyVr) {
  return {
    intervalWeeks: vr?.intervalWeeks ?? 2,
    bandWidth: vr?.bandWidth ?? 15,
    recurringAmount: Math.abs(vr?.recurringAmount ?? 0),
    recurringMode: toRecurringMode(vr?.recurringAmount),
    initialValue: null,
    initialGradient: vr?.initialGradient ?? null,
    gGraceWeeks: vr?.gGraceWeeks ?? null,
    gStepWeeks: vr?.gStepWeeks ?? null,
    gMax: vr?.gMax ?? null,
    initialPoolLimitRate: vr?.initialPoolLimitRate ?? null,
    pGraceWeeks: vr?.pGraceWeeks ?? null,
    pStepWeeks: vr?.pStepWeeks ?? null,
    poolLimitFloor: vr?.poolLimitFloor ?? null,
  }
}

export function buildStrategyFormDefaults(initial: Strategy | undefined, defaultType: string | undefined): StrategyFormValues {
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
    ...buildVrDefaults(initial?.vr),
    // 시작예정일도 등록 전용 — 등록은 오늘 기본값(필수), 수정 모드에서는 항상 빈 값
    scheduledStartDate: initial ? null : todayKst(),
  }
}

// VR 필드 watch (avgPrice·quantity는 중간부터 시작 공통 필드)
export function watchVrFields(form: UseFormReturn<StrategyFormValues>): VrFields {
  return Object.fromEntries(VR_FIELD_KEYS.map((key) => [key, form.watch(key) ?? null])) as unknown as VrFields
}

// capability 파생 — isInfinite 휴리스틱 대신 백엔드 SSOT 사용
export function deriveRuntimeFields(
  initial: Strategy | undefined,
  runtimeStrategy: RuntimeStrategySettings | undefined,
  isTickerAllowed: (code: string) => boolean, // 계좌 시장(주식/코인)과 맞는 티커만
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
      recurringMode: runtimeStrategy?.fields.recurringMode as RuntimeFieldSettings<string> | undefined,
      bandWidth: runtimeStrategy?.fields.bandWidth,
      intervalWeeks: runtimeStrategy?.fields.intervalWeeks,
    },
  }
}

// basePrice/minSeed는 백엔드 계산 — VR 전략은 시드 미리보기 불필요
export function deriveSeedPreview(isVr: boolean, data: StrategySeedPreview | undefined) {
  if (isVr) return { basePrice: null, minSeed: null, seedUnavailableReason: null, availableCash: null }
  return {
    basePrice: data?.basePrice ?? null,
    minSeed: data?.minSeed ?? null,
    seedUnavailableReason: data?.skipReason ?? null,
    // 서버 값은 증권사 주문가능액 − 다른 전략 원장이라 음수일 수 있다 — 참고값이므로 0으로 표시한다
    availableCash: data?.availableCash == null ? null : Math.max(0, data.availableCash),
  }
}

// VR은 cycleSeedType 항상 NONE — 롤오버가 자체 사이클 교체 담당
export function toCycleSeedType(isVr: boolean, autoStart: boolean, seedMode: 'KEEP' | 'MAX'): CycleSeedType {
  if (isVr || !autoStart) return 'NONE'
  return seedMode === 'KEEP' ? 'MAINTAIN' : 'MAX'
}

export function createFormSetters(form: UseFormReturn<StrategyFormValues>) {
  return {
    handleTickerChange: (code: string) => { form.setValue('ticker', code) },
    setAutoStart: (v: boolean) => { form.setValue('autoStart', v) },
    setSeedMode: (m: 'KEEP' | 'MAX') => { form.setValue('seedMode', m) },
    setDivisionCount: (n: DivisionCount) => { form.setValue('divisionCount', n) },
    // VR 필드 개별 setter
    setVrField: (field: keyof VrFields, value: number | null) => {
      form.setValue(field, field === 'recurringAmount' && value !== null ? Math.abs(value) : value)
    },
    setRecurringMode: (mode: VrRecurringMode) => {
      form.setValue('recurringMode', mode)
      if (mode === 'HOLD') form.setValue('recurringAmount', 0)
    },
    setScheduledStartDate: (date: string | null) => { form.setValue('scheduledStartDate', date) },
  }
}
