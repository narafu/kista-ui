'use client'

import { SelectionCard } from '@shared/ui/selection-card'
import { Switch } from '@/components/ui/switch'
import { StrategyFieldLabel } from '../StrategyFieldLabel'

interface Props {
  autoStart: boolean
  setAutoStart: (v: boolean) => void
  seedMode: 'KEEP' | 'MAX'
  setSeedMode: (m: 'KEEP' | 'MAX') => void
  loading: boolean
}

const SEED_MODES = [
  { code: 'KEEP', label: '시드 유지', sub: '기존 시드만 사용' },
  { code: 'MAX', label: '시드 MAX', sub: '예수금까지 전체 활용' },
] as const

export function CycleSeedSection({ autoStart, setAutoStart, seedMode, setSeedMode, loading }: Props) {
  return (
    <div className="pt-[18px]">
      <StrategyFieldLabel hint="">사이클 연속여부</StrategyFieldLabel>

      {/* 자동 시작 토글 */}
      <div className="flex items-center justify-between px-[14px] py-3 rounded-[var(--r-sm)] border border-border bg-card mb-[14px]">
        <div>
          <div className="text-sm font-bold text-foreground">
            다음 사이클 자동 시작
          </div>
          <div className="text-sm text-muted-foreground mt-0.5">
            익절 종료 후 새 사이클을 자동 개시합니다.
          </div>
        </div>
        <Switch
          checked={autoStart}
          onCheckedChange={setAutoStart}
          disabled={loading}
          aria-label="다음 사이클 자동 시작"
        />
      </div>

      {/* 시드 모드 세그먼트 */}
      {autoStart && (
        <>
          <div className="text-sm font-bold text-muted-foreground mb-1.5 tracking-[0.04em]">
            시드 모드
          </div>
          <div className="flex gap-1 p-[3px] bg-muted rounded-[10px]">
            {SEED_MODES.map((m) => {
              const active = seedMode === m.code
              return (
                <SelectionCard
                  key={m.code}
                  selected={active}
                  disabled={loading}
                  onClick={() => setSeedMode(m.code)}
                  className="flex-1 rounded-[7px] px-3 py-2.5 text-center"
                >
                  <div className={active ? 'text-sm font-bold' : 'text-sm font-bold text-muted-foreground'}>
                    {m.label}
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    {m.sub}
                  </div>
                </SelectionCard>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
