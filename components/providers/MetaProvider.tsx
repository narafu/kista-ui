'use client'

import { createContext, useContext } from 'react'
import type { MetaBundle, StrategyTypeMeta, TickerMeta, EnumMeta } from '@/types/meta'

interface MetaContextValue {
  meta: MetaBundle
  findStrategyType: (code: string) => StrategyTypeMeta | undefined
  findTicker: (code: string) => TickerMeta | undefined
  findBroker: (code: string) => EnumMeta | undefined
  findStrategyStatus: (code: string) => EnumMeta | undefined
  labelOf: (category: keyof MetaBundle, code: string) => string
}

const MetaContext = createContext<MetaContextValue | null>(null)

export function MetaProvider({ children, meta }: { children: React.ReactNode; meta: MetaBundle }) {
  const value: MetaContextValue = {
    meta,
    findStrategyType: (code) => meta.strategyTypes.find(t => t.code === code),
    findTicker: (code) => meta.tickers.find(t => t.code === code),
    findBroker: (code) => meta.brokers.find(b => b.code === code),
    findStrategyStatus: (code) => meta.strategyStatuses.find(s => s.code === code),
    labelOf: (category, code) => {
      const items = meta[category] as { code: string; label: string }[]
      return items.find(i => i.code === code)?.label ?? code
    },
  }
  return <MetaContext.Provider value={value}>{children}</MetaContext.Provider>
}

export function useMeta(): MetaContextValue {
  const ctx = useContext(MetaContext)
  if (!ctx) throw new Error('useMeta must be used inside MetaProvider')
  return ctx
}
