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
      findTicker: (code: string) => (code === 'BTC' ? { code: 'BTC', market: 'CRYPTO_KRW' } : { code, market: 'US_STOCK' }),
    }),
  }
})


const rule = (patch: Record<string, unknown>) => ({
  ruleKey: 'a', direction: 'BUY', frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: null, orderType: 'MOC', executionHour: null,
  sizing: { type: 'AMOUNT', amount: 300, percent: null }, shortfall: 'PARTIAL', conditions: [],
  nextExecution: { usSessionDate: '2026-10-30', kstTradeDate: '2026-10-31' }, lastExecution: null, ...patch,
})

const strategy = {
  id: 'd1', accountId: 'a1', type: 'DCA', status: 'ACTIVE', ticker: 'UPRO', cycleSeedType: 'NONE', isReverseMode: false,
  dca: { rules: [rule({})], currentHoldings: null, avgPrice: null },
} as unknown as Strategy

function withRules(...rules: Array<Record<string, unknown>>): Strategy {
  return { ...strategy, dca: { ...strategy.dca!, rules } } as unknown as Strategy
}

const threeRules = (ticker = 'UPRO') => ({
  ...withRules(
    rule({ ruleKey: 'a', frequency: 'DAILY', executionHour: 9, nextExecution: { usSessionDate: '2026-10-22', kstTradeDate: '2026-10-22' }, lastExecution: { kstTradeDate: '2026-10-20', status: 'ORDERED', skipReason: null } }),
    rule({ ruleKey: 'b', executionHour: 21, nextExecution: { usSessionDate: '2026-10-21', kstTradeDate: '2026-10-21' }, lastExecution: { kstTradeDate: '2026-10-21', status: 'SKIPPED', skipReason: 'CONDITION_NOT_MET' } }),
    rule({ ruleKey: 'c', direction: 'SELL', nextExecution: { usSessionDate: '2026-10-30', kstTradeDate: '2026-10-31' } }),
  ),
  ticker,
})

describe('DcaStrategyCard', () => {
  it('규칙 수와 방향별 개수를 요약하고 방향·주문 방식 배지·회차당 금액은 보이지 않는다', () => {
    render(<DcaStrategyCard accountId="a1" broker="KIS" strategy={threeRules()} />)
    expect(screen.getAllByText('규칙 3개 · 매수 2 · 매도 1')).toHaveLength(2) // 모바일·PC
    expect(screen.queryByText('회차당 금액')).not.toBeInTheDocument()
    expect(screen.queryByText('장 마감 시장가')).not.toBeInTheDocument()
    expect(screen.queryByText('매수')).not.toBeInTheDocument()
  })
  it('주식은 가장 이른 규칙의 다음 판정일을 보여준다', () => {
    render(<DcaStrategyCard accountId="a1" broker="KIS" strategy={threeRules()} />)
    expect(screen.getByText('다음 판정일')).toBeInTheDocument()
    expect(screen.getByText(fmtDate('2026-10-21'))).toBeInTheDocument()
  })
  it('코인은 가장 이른 규칙의 KST 날짜와 그 규칙의 실행 시각을 보여준다', () => {
    render(<DcaStrategyCard accountId="a1" broker="UPBIT" strategy={threeRules('BTC')} />)
    expect(screen.getByText('다음 실행')).toBeInTheDocument()
    expect(screen.getByText('10/21 21시')).toBeInTheDocument()
    expect(screen.getByText('다음 실행 10/21 21시')).toBeInTheDocument() // 모바일 배지
    expect(screen.queryByText(/다음 판정일/)).not.toBeInTheDocument()
  })
  it('바이낸스 계좌의 BTC 전략은 코인 문구로 보여준다', () => {
    render(<DcaStrategyCard accountId="a1" broker="BINANCE" strategy={threeRules('BTC')} />)
    expect(screen.getByText('다음 실행')).toBeInTheDocument()
  })
  it('티커가 코인이어도 계좌가 주식 broker면 계좌 기준으로 판정한다', () => {
    render(<DcaStrategyCard accountId="a1" broker="KIS" strategy={threeRules('BTC')} />)
    expect(screen.getByText('다음 판정일')).toBeInTheDocument()
  })
  it('최근 결과는 가장 최근 lastExecution 기준이다', () => {
    render(<DcaStrategyCard accountId="a1" broker="KIS" strategy={threeRules()} />)
    expect(screen.getAllByText('최근 건너뜀 · 조건 미충족')).toHaveLength(2) // 모바일·PC 배지 행
  })
  it('모든 규칙의 nextExecution이 null이면 다음 판정일을 미정으로 표시한다', () => {
    render(<DcaStrategyCard accountId="a1" broker="KIS" strategy={withRules(rule({ nextExecution: null }))} />)
    expect(screen.getByText('미정')).toBeInTheDocument()
    expect(screen.getByText('다음 판정일 미정')).toBeInTheDocument() // 모바일 배지
  })
  it('lastExecution이 모두 null이면 최근 실행 문구를 표시하지 않는다', () => {
    render(<DcaStrategyCard accountId="a1" broker="KIS" strategy={strategy} />)
    expect(screen.queryByText(/최근/)).not.toBeInTheDocument()
  })
  it('dca가 없어도 카드 셸과 티커를 렌더한다', () => {
    render(<DcaStrategyCard accountId="a1" broker="KIS" strategy={{ ...strategy, dca: undefined }} />)
    expect(screen.getAllByText('UPRO').length).toBeGreaterThan(0)
  })
})
