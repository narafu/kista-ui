'use client'

import { useEffect, useRef } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { RuntimeConfig, RuntimeStrategyType } from '@entities/runtime-config'
import type { Strategy } from '@entities/strategy'
import type { StrategyFormValues } from './strategyFormSchema'

type RuntimeStrategySettings = RuntimeConfig['strategies'][RuntimeStrategyType]

interface UseTypeDefaultsOptions {
  form: UseFormReturn<StrategyFormValues>
  initial?: Strategy
  runtimeConfig?: RuntimeConfig
  enabledStrategyTypes: string[]
  availableTickers: string[]
}

// type 변경 effect와 setType의 중복 기본값 세팅 — settings 기반 공용 기본값(분할수·밴드폭·주기·정기입출금)만 묶는다.
// ticker 기본값 로직은 두 경로(조건부 vs 무조건)가 달라 각 경로에 남긴다.
function applyTypeDefaults(form: UseFormReturn<StrategyFormValues>, settings?: RuntimeStrategySettings) {
  if (settings?.fields.divisionCount) form.setValue('divisionCount', settings.fields.divisionCount.defaultValue)
  if (settings?.fields.bandWidth) form.setValue('bandWidth', settings.fields.bandWidth.defaultValue)
  if (settings?.fields.intervalWeeks) form.setValue('intervalWeeks', settings.fields.intervalWeeks.defaultValue)
  if (settings?.fields.recurringMode) {
    form.setValue('recurringMode', settings.fields.recurringMode.defaultValue)
    form.setValue('recurringAmount', 0)
  }
}

export function useTypeDefaults({
  form,
  initial,
  runtimeConfig,
  enabledStrategyTypes,
  availableTickers,
}: UseTypeDefaultsOptions): { setType: (t: string) => void } {
  const defaultsAppliedForTypeRef = useRef<string | null>(null)
  const type = form.watch('type')
  const ticker = form.watch('ticker')
  const runtimeStrategy = runtimeConfig?.strategies[type as RuntimeStrategyType]

  // type 변경 시 ticker 기본값 설정 — 시드는 minSeed effect에서 처리
  useEffect(() => {
    if (initial) return
    if (!runtimeConfig) return
    if (!enabledStrategyTypes.includes(type)) {
      form.setValue('type', enabledStrategyTypes[0] ?? '')
      return
    }
    if (defaultsAppliedForTypeRef.current === type) return
    defaultsAppliedForTypeRef.current = type
    if (!ticker || !availableTickers.includes(ticker)) {
      form.setValue('ticker', runtimeStrategy?.fields.ticker.defaultValue ?? '')
    }
    applyTypeDefaults(form, runtimeStrategy)
  }, [type, runtimeConfig]) // eslint-disable-line react-doctor/exhaustive-deps

  function setType(t: string) {
    form.setValue('type', t)
    const settings = runtimeConfig?.strategies[t as RuntimeStrategyType]
    if (!settings) return
    defaultsAppliedForTypeRef.current = t
    form.setValue('ticker', settings.fields.ticker.defaultValue)
    applyTypeDefaults(form, settings)
  }

  return { setType }
}
