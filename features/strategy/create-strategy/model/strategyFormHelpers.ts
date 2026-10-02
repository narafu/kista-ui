import type { UseFormReturn } from 'react-hook-form'
import type { CycleSeedType, Strategy, StrategySeedPreview } from '@entities/strategy'
import type { MarginItem } from '@entities/account'
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
    // 시작예정일도 등록 전용 — 수정 모드에서는 항상 빈 값
    scheduledStartDate: null,
  }
}

// VR 필드 watch (avgPrice·quantity는 중간부터 시작 공통 필드)
export function watchVrFields(form: UseFormReturn<StrategyFormValues>): VrFields {
  return Object.fromEntries(VR_FIELD_KEYS.map((key) => [key, form.watch(key) ?? null])) as unknown as VrFields
}

// capability 파생 — isInfinite 휴리스틱 대신 백엔드 SSOT 사용
export function deriveRuntimeFields(initial: Strategy | undefined, runtimeStrategy: RuntimeStrategySettings | undefined) {
  const divisionCountSettings = runtimeStrategy?.fields.divisionCount
  return {
    availableTickers: initial ? [initial.ticker] : runtimeStrategy?.fields.ticker.allowedValues ?? [],
    divisionCountSettings,
    usesDivisionCount: initial ? initial.divisionCount !== undefined : !!divisionCountSettings,
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
  if (isVr) return { basePrice: null, minSeed: null, seedUnavailableReason: null }
  return {
    basePrice: data?.basePrice ?? null,
    minSeed: data?.minSeed ?? null,
    seedUnavailableReason: data?.skipReason ?? null,
  }
}

export function findUsdDeposit(marginItems: MarginItem[]): number | null {
  return marginItems.find((m) => m.currency === 'USD')?.purchasableAmount ?? null
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
