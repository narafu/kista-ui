import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { MetaProvider } from '@entities/meta'
import { DcaConditionsSection } from './DcaConditionsSection'
import { buildDcaFormDefaults, dcaFormSchema, type DcaFormValues } from '../model/dcaFormSchema'
import { dcaTestMeta } from './__fixtures__/dcaTestMeta'

function Harness({ direction = 'BUY', meta = dcaTestMeta }: { direction?: 'BUY' | 'SELL'; meta?: typeof dcaTestMeta }) {
  const form = useForm<DcaFormValues>({
    resolver: zodResolver(dcaFormSchema),
    defaultValues: { ...buildDcaFormDefaults(undefined, 'UPRO'), direction },
  })
  return (
    <MetaProvider meta={meta}>
      <button type="button" onClick={() => void form.trigger()}>검증</button>
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
  it('오류는 해당 행 아래에 표시하고 입력에 aria-invalid·aria-describedby 연결', async () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: '조건 추가' }))
    fireEvent.click(screen.getByRole('button', { name: '조건 추가' }))
    fireEvent.change(screen.getByLabelText(/조건 1 기준값/), { target: { value: '30' } })
    fireEvent.click(screen.getByRole('button', { name: '검증' }))

    const second = screen.getByLabelText(/조건 2 기준값/)
    await waitFor(() => expect(second).toHaveAttribute('aria-invalid', 'true'))
    expect(screen.getByLabelText(/조건 1 기준값/)).toHaveAttribute('aria-invalid', 'false')
    expect(document.getElementById(second.getAttribute('aria-describedby')!)).toHaveTextContent('기준값을 입력하세요.')
    expect(screen.getAllByText('기준값을 입력하세요.')).toHaveLength(1)
  })
  it('새 조건 기본값은 메타 첫 지표·첫 비교 연산자', () => {
    render(<Harness meta={{ ...dcaTestMeta, dcaOperators: [{ code: 'GT', label: '초과' }] }} />)
    fireEvent.click(screen.getByRole('button', { name: '조건 추가' }))
    expect(screen.getByRole('combobox', { name: '조건 1 지표' })).toHaveTextContent('평단가')
    expect(screen.getByRole('combobox', { name: '조건 1 비교' })).toHaveTextContent('초과')
  })
  it('비교 연산자 메타가 비면 조건 추가 버튼을 숨긴다', () => {
    render(<Harness meta={{ ...dcaTestMeta, dcaOperators: [] }} />)
    expect(screen.queryByRole('button', { name: '조건 추가' })).not.toBeInTheDocument()
  })
})
