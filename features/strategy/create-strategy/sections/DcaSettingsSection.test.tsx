import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { TradingMarket } from '@shared/lib/api-schema'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { MetaProvider } from '@entities/meta'
import { DcaSettingsSection, DcaSizingSection } from './DcaSettingsSection'
import { buildDcaRuleDefaults, type DcaRuleFormValues } from '../model/dcaFormSchema'
import { dcaTestMeta, testOrderAmount } from './__fixtures__/dcaTestMeta'

function Harness({ market = 'US_STOCK', defaults }: { market?: TradingMarket; defaults?: Partial<DcaRuleFormValues> }) {
  const form = useForm<DcaRuleFormValues>({ defaultValues: { ...buildDcaRuleDefaults('BUY', market, testOrderAmount(market)), ...defaults } })
  return (
    <MetaProvider meta={dcaTestMeta}>
      <DcaSettingsSection form={form} market={market} orderTypes={['MOO', 'MOC']} frequencies={['DAILY', 'WEEKLY', 'MONTHLY']} />
      <DcaSizingSection form={form} market={market} />
    </MetaProvider>
  )
}

describe('DcaSettingsSection', () => {
  it('MONTHLY 기본값이면 날짜 셀렉트, WEEKLY로 바꾸면 요일 셀렉트', () => {
    render(<Harness />)
    expect(screen.getByRole('combobox', { name: '실행 날짜' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '매주' }))
    expect(screen.getByRole('combobox', { name: '실행 요일' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: '실행 날짜' })).not.toBeInTheDocument()
  })
  it('29~31일 선택 시 말일 보정 캡션', () => {
    render(<Harness defaults={{ dayOfMonth: '31' }} />)
    expect(screen.getByText('해당 날짜가 없는 달은 말일에 실행')).toBeInTheDocument()
  })
  it('방향 선택 UI가 없다(방향은 편집 화면 제목이 보여 준다)', () => {
    render(<Harness />)
    expect(screen.queryByRole('button', { name: '매수' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '매도' })).not.toBeInTheDocument()
  })

  it('코인은 금액을 원 단위로 받고 주문 방식 대신 실행 시각을 보여준다', () => {
    render(<Harness market="CRYPTO_KRW" />)
    expect(screen.getByLabelText('회차당 금액 (원)')).toHaveAttribute('step', '1')
    expect(screen.getByLabelText('회차당 금액 (원)')).toHaveAttribute('inputmode', 'numeric')
    expect(screen.queryByText('주문 방식')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '실행 시각' })).toBeInTheDocument()
    expect(screen.queryByText(/휴장일이면/)).not.toBeInTheDocument()
  })

  it('코인 WEEKLY는 토·일을 포함한 7일을 보여준다', async () => {
    const user = userEvent.setup()
    render(<Harness market="CRYPTO_KRW" />)
    await user.click(screen.getByRole('button', { name: '매주' }))
    await user.click(screen.getByRole('combobox', { name: '실행 요일' }))
    expect(await screen.findByRole('option', { name: '일요일' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '토요일' })).toBeInTheDocument()
  })

  it('주식 WEEKLY는 평일만 보여주고 금액은 USD다', async () => {
    const user = userEvent.setup()
    render(<Harness market="US_STOCK" />)
    await user.click(screen.getByRole('button', { name: '매주' }))
    await user.click(screen.getByRole('combobox', { name: '실행 요일' }))
    expect(await screen.findByRole('option', { name: '금요일' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: '토요일' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: '일요일' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('회차당 금액 (USD)')).toHaveAttribute('step', '0.01')
    expect(screen.getByLabelText('회차당 금액 (USD)')).toHaveAttribute('inputmode', 'decimal')
    expect(screen.getByText('주문 방식')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: '실행 시각' })).not.toBeInTheDocument()
  })
})
