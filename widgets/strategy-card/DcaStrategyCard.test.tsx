import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Strategy } from '@entities/strategy'
import { fmtDate } from '@shared/lib/format'
import { DcaStrategyCard } from './DcaStrategyCard'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => <a href={href} {...props}>{children}</a>,
}))

vi.mock('@entities/meta', async () => {
  const { dcaTestMeta } = await import('@features/strategy/create-strategy/sections/__fixtures__/dcaTestMeta')
  const groups: Record<string, Array<{ code: string; label: string }>> = {
    ...dcaTestMeta,
    dcaSkipReasons: [{ code: 'CONDITION_NOT_MET', label: '조건 미충족' }],
  }
  return {
    useMeta: () => ({
      labelOf: (group: string, value: string) => groups[group]?.find(i => i.code === value)?.label ?? value,
    }),
  }
})

const strategy = {
  id: 'd1', accountId: 'a1', type: 'DCA', status: 'ACTIVE', ticker: 'UPRO', cycleSeedType: 'NONE', isReverseMode: false,
  dca: {
    direction: 'BUY', amountUsd: 300, orderType: 'MOC', frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: null, conditions: [],
    nextExecution: { usSessionDate: '2026-10-30', kstTradeDate: '2026-10-31' }, lastExecution: null,
  },
} as Strategy

function withDca(patch: Partial<NonNullable<Strategy['dca']>>): Strategy {
  return { ...strategy, dca: { ...strategy.dca!, ...patch } }
}

describe('DcaStrategyCard', () => {
  it('nextExecution이 null이면 다음 판정일을 미정으로 표시한다', () => {
    render(<DcaStrategyCard accountId="a1" strategy={withDca({ nextExecution: null })} />)
    expect(screen.getByText(/다음 판정일 미정/)).toBeInTheDocument()
  })
  it('nextExecution이 있으면 다음 판정일 날짜를 표시한다', () => {
    render(<DcaStrategyCard accountId="a1" strategy={strategy} />)
    expect(screen.getByText(`다음 판정일 ${fmtDate('2026-10-31')}`, { exact: false })).toBeInTheDocument()
  })
  it('lastExecution이 null이면 최근 실행 문구를 표시하지 않는다', () => {
    render(<DcaStrategyCard accountId="a1" strategy={strategy} />)
    expect(screen.queryByText(/최근/)).not.toBeInTheDocument()
  })
  it('lastExecution이 건너뜀이면 사유 라벨과 함께 표시한다', () => {
    const s = withDca({ lastExecution: { status: 'SKIPPED', skipReason: 'CONDITION_NOT_MET' } as never })
    render(<DcaStrategyCard accountId="a1" strategy={s} />)
    expect(screen.getByText(/최근 건너뜀 · 조건 미충족/)).toBeInTheDocument()
  })
})
