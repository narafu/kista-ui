'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { SelectionCard } from '@shared/ui/selection-card'

const THEMES = [
  {
    key: 'light',
    label: '라이트',
    desc: '밝은 환경',
    bg: '#FBF6F1',
    card: '#fff',
    accent: '#B66951',
  },
  {
    key: 'dark',
    label: '다크',
    desc: '저조도 환경',
    bg: '#131416',
    card: '#1B1C1F',
    accent: '#C99780',
  },
  {
    key: 'system',
    label: '시스템 자동',
    desc: 'OS 설정 따름',
    bg: 'linear-gradient(90deg, #FBF6F1 0% 50%, #131416 50% 100%)',
    card: 'linear-gradient(90deg, #fff 0% 50%, #1B1C1F 50% 100%)',
    accent: '#B66951',
  },
]

export function ThemeCards() {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)

  return (
    <div className="grid grid-cols-3 gap-3">
      {THEMES.map((o) => {
        const on = mounted && (theme ?? 'system') === o.key
        return (
          <SelectionCard
            key={o.key}
            selected={on}
            onClick={() => setTheme(o.key)}
            className="w-full rounded-[var(--r-md)] p-3"
          >
            <div
              className="h-16 rounded-lg p-2 flex flex-col gap-1 mb-2.5 border border-border"
              style={{ background: o.bg }}
            >
              <div className="h-[5px] rounded-sm w-[60%]" style={{ background: o.card }} />
              <div className="h-4 rounded" style={{ background: o.card }} />
              <div className="h-1 rounded-sm w-[40%] mt-auto" style={{ background: o.accent }} />
            </div>
            <div>
              <div className="text-sm font-bold">{o.label}</div>
              <div className="text-sm text-muted-foreground">{o.desc}</div>
            </div>
          </SelectionCard>
        )
      })}
    </div>
  )
}
