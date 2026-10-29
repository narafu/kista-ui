import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EquityLineChart } from './EquityLineChart'

const rows = [
  { date: '2026-01-02', asset: 100, principal: 100 },
  { date: '2026-01-05', asset: 110, principal: 100 },
]

describe('EquityLineChart', () => {
  it('경계 날짜가 있으면 범례에 경계 항목을 보여 준다', () => {
    render(<EquityLineChart rows={rows} markerDates={['2026-01-05']} markerLabel="사이클 시작" />)
    expect(screen.getByText('사이클 시작')).toBeInTheDocument()
  })
  it('경계 날짜가 없으면 범례 항목을 숨긴다', () => {
    render(<EquityLineChart rows={rows} markerDates={[]} markerLabel="사이클 시작" />)
    expect(screen.queryByText('사이클 시작')).not.toBeInTheDocument()
  })
})
