import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { MetaProvider } from '@entities/meta'
import { DcaConditionsSection } from './DcaConditionsSection'
import { buildDcaFormDefaults, dcaFormSchema, type DcaFormValues } from '../model/dcaFormSchema'
import { dcaTestMeta } from './__fixtures__/dcaTestMeta'

function Harness({ direction = 'BUY', meta = dcaTestMeta, conditions = [] }: { direction?: 'BUY' | 'SELL'; meta?: typeof dcaTestMeta; conditions?: DcaFormValues['conditions'] }) {
  const form = useForm<DcaFormValues>({
    resolver: zodResolver(dcaFormSchema),
    defaultValues: { ...buildDcaFormDefaults(undefined, 'UPRO'), direction, conditions },
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
  it('평단가 조건은 입력값에 따라 풀이 문장을 보여준다', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: '조건 추가' }))
    expect(screen.getByText('0을 입력하면 평단가 그대로 비교')).toBeInTheDocument()
    const input = screen.getByLabelText(/조건 1 기준값/)
    fireEvent.change(input, { target: { value: '5' } })
    expect(screen.getByText('전일 종가가 평단가보다 5% 높은 가격 이하일 때 주문')).toBeInTheDocument()
    fireEvent.change(input, { target: { value: '-5' } })
    expect(screen.getByText('전일 종가가 평단가보다 5% 낮은 가격 이하일 때 주문')).toBeInTheDocument()
    fireEvent.change(input, { target: { value: '0' } })
    expect(screen.getByText('전일 종가가 평단가 이하일 때 주문')).toBeInTheDocument()
  })
  it('이동평균·RSI·공포탐욕지수 조건도 풀이 문장을 보여준다', () => {
    render(<Harness conditions={[
      { indicator: 'SMA', operator: 'GTE', threshold: null, smaPeriod: 200 },
      { indicator: 'RSI', operator: 'LT', threshold: 30, smaPeriod: null },
      { indicator: 'FEAR_GREED', operator: 'LTE', threshold: null, smaPeriod: null },
    ]} />)
    expect(screen.getByText('전일 종가가 200일 이동평균 이상일 때 주문')).toBeInTheDocument()
    expect(screen.getByText('직전 거래일 RSI(14)가 30 미만일 때 주문')).toBeInTheDocument()
    expect(screen.getByText('직전 거래일 공포탐욕지수와 비교, 0~100 입력')).toBeInTheDocument()
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
  it('오류 난 행의 지표를 SMA로 바꾸면 기존 기준값 오류가 사라진다', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: '조건 추가' }))
    await user.click(screen.getByRole('button', { name: '조건 추가' }))
    fireEvent.change(screen.getByLabelText(/조건 1 기준값/), { target: { value: '30' } })
    await user.click(screen.getByRole('button', { name: '검증' }))
    expect(await screen.findByText('기준값을 입력하세요.')).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: '조건 2 지표' }))
    await user.click(await screen.findByRole('option', { name: '이동평균선' }))

    await waitFor(() => expect(screen.queryByText('기준값을 입력하세요.')).not.toBeInTheDocument())
    expect(screen.queryByText('조건 입력값을 확인하세요.')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '조건 2 이동평균 기간' })).not.toHaveAttribute('aria-describedby')
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
