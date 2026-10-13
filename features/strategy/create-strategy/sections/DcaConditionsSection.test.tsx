import { render, screen, fireEvent } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { MetaProvider } from '@entities/meta'
import { DcaConditionsSection } from './DcaConditionsSection'
import { buildDcaFormDefaults, type DcaFormValues } from '../model/dcaFormSchema'
import { dcaTestMeta } from './__fixtures__/dcaTestMeta'

function Harness({ direction = 'BUY' }: { direction?: 'BUY' | 'SELL' }) {
  const form = useForm<DcaFormValues>({ defaultValues: { ...buildDcaFormDefaults(undefined, 'UPRO'), direction } })
  return (
    <MetaProvider meta={dcaTestMeta}>
      <DcaConditionsSection form={form} direction={direction} indicators={['AVG_PRICE', 'SMA', 'RSI', 'FEAR_GREED']} />
    </MetaProvider>
  )
}

describe('DcaConditionsSection', () => {
  it('조건 0개면 안내 문구', () => {
    render(<Harness />)
    expect(screen.getByText('조건 없이 매 회차 주문')).toBeInTheDocument()
  })
  it('조건 추가 → 행 생성, 삭제 → 제거', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: '조건 추가' }))
    expect(screen.getByRole('combobox', { name: '조건 1 지표' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '조건 1 삭제' }))
    expect(screen.queryByRole('combobox', { name: '조건 1 지표' })).not.toBeInTheDocument()
  })
  it('계좌 전체 보유 기준 캡션', () => {
    render(<Harness />)
    expect(screen.getByText('평단가·보유 수량은 계좌 전체 보유 기준')).toBeInTheDocument()
  })
  it('매수만 첫 매수 평단 조건 무시 캡션', () => {
    const { unmount } = render(<Harness />)
    expect(screen.getByText('보유 0주일 때는 평단가 조건 없이 매수')).toBeInTheDocument()
    unmount()
    render(<Harness direction="SELL" />)
    expect(screen.queryByText('보유 0주일 때는 평단가 조건 없이 매수')).not.toBeInTheDocument()
  })
})
