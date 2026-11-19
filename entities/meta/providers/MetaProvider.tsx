'use client'

import { createContext, use, useMemo } from 'react'
import type { MetaBundle, StrategyTypeMeta, TickerMeta, EnumMeta, BrokerMeta } from '@entities/meta'

interface MetaContextValue {
  meta: MetaBundle
  findStrategyType: (code: string) => StrategyTypeMeta | undefined
  findTicker: (code: string) => TickerMeta | undefined
  findBroker: (code: string) => BrokerMeta | undefined
  findStrategyStatus: (code: string) => EnumMeta | undefined
  labelOf: (category: keyof MetaBundle, code: string) => string
}

const MetaContext = createContext<MetaContextValue | null>(null)

export function MetaProvider({ children, meta }: { children: React.ReactNode; meta: MetaBundle }) {
  const value = useMemo<MetaContextValue>(() => ({
    meta,
    findStrategyType: (code) => meta.strategyTypes.find(t => t.code === code),
    findTicker: (code) => meta.tickers.find(t => t.code === code),
    findBroker: (code) => meta.brokers.find(b => b.code === code),
    findStrategyStatus: (code) => meta.strategyStatuses.find(s => s.code === code),
    labelOf: (category, code) => {
      // strategyTypes는 label 없이 description이 한글 이름이다 — label이 없으면 description으로 폴백
      const items = (meta[category] ?? []) as { code: string; label?: string; description?: string }[]
      const item = items.find(i => i.code === code)
      const label = item?.label ?? item?.description ?? code
      // 주문 유형은 앱 전역에서 코드형 짧은 이름만 쓴다 — 서버 라벨 "LIMIT VWAP(지정가 VWAP)"의 괄호 설명을 떼어 "LIMIT VWAP"
      // (좁은 표·모바일 카드에서 열이 넘치던 문제, 2026-11 사용자 결정). 서버 메타 라벨 자체는 알림 등 서버 문구에서 그대로 쓴다
      return category === 'orderTypes' ? label.replace(/\s*\(.*\)$/, '') : label
    },
  }), [meta])
  return <MetaContext.Provider value={value}>{children}</MetaContext.Provider>
}

export function useMeta(): MetaContextValue {
  const ctx = use(MetaContext)
  if (!ctx) throw new Error('useMeta must be used inside MetaProvider')
  return ctx
}
