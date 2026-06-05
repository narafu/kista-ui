'use client'

import { cn } from '@lib/utils'
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
          <div className="text-[13px] font-bold text-foreground">
            다음 사이클 자동 시작
          </div>
          <div className="text-[10.5px] text-muted-foreground mt-0.5">
            익절 종료 후 새 사이클을 자동 개시합니다.
          </div>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => setAutoStart(!autoStart)}
          className={cn(
            'relative shrink-0 w-[38px] h-[22px] rounded-full border-none transition-[background] duration-200 shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)]',
            loading ? 'cursor-not-allowed' : 'cursor-pointer',
          )}
          style={{ background: autoStart ? 'var(--rose-500)' : 'var(--muted)' }}
          aria-pressed={autoStart}
          aria-label="다음 사이클 자동 시작"
        >
          <div
            className="absolute top-[3px] size-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.18)] transition-[left] duration-200"
            style={{ left: autoStart ? 18 : 4 }}
          />
        </button>
      </div>

      {/* 시드 모드 세그먼트 */}
      {autoStart && (
        <>
          <div className="text-[11px] font-bold text-muted-foreground mb-1.5 tracking-[0.04em]">
            시드 모드
          </div>
          <div className="flex gap-1 p-[3px] bg-muted rounded-[10px]">
            {SEED_MODES.map((m) => {
              const active = seedMode === m.code
              return (
                <button
                  key={m.code}
                  type="button"
                  disabled={loading}
                  onClick={() => setSeedMode(m.code)}
                  className={cn(
                    'flex-1 px-3 py-2.5 border-none rounded-[7px] text-center transition-[background,box-shadow] duration-150',
                    loading ? 'cursor-not-allowed' : 'cursor-pointer',
                  )}
                  style={{
                    background: active ? 'var(--card)' : 'transparent',
                    boxShadow: active ? 'var(--sh-card)' : 'none',
                  }}
                >
                  <div
                    className="text-[12.5px] font-bold"
                    style={{ color: active ? 'var(--rose-600)' : 'var(--muted-foreground)' }}
                  >
                    {m.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {m.sub}
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
