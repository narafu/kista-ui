import { render, screen, fireEvent } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { MetaProvider } from '@entities/meta'
import { DcaSettingsSection } from './DcaSettingsSection'
import { buildDcaFormDefaults, type DcaFormValues } from '../model/dcaFormSchema'
import { dcaTestMeta } from './__fixtures__/dcaTestMeta'

function Harness({ isEdit = false, broker = 'KIS', defaults }: { isEdit?: boolean; broker?: string; defaults?: Partial<DcaFormValues> }) {
  const form = useForm<DcaFormValues>({ defaultValues: { ...buildDcaFormDefaults(undefined, 'UPRO'), ...defaults } })
  return (
    <MetaProvider meta={dcaTestMeta}>
      <DcaSettingsSection form={form} isEdit={isEdit} broker={broker}
        orderTypes={['MOO', 'MOC']} directions={['BUY', 'SELL']} frequencies={['DAILY', 'WEEKLY', 'MONTHLY']} />
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
  it('매수면 +5% 상한 캡션, 매도면 없음', () => {
    const { unmount } = render(<Harness />)
    expect(screen.getByText('매수는 전일 종가와 현재가 중 높은 값의 +5% 상한 지정가로 접수되어 급등 시 미체결될 수 있음')).toBeInTheDocument()
    unmount()
    render(<Harness defaults={{ direction: 'SELL' }} />)
    expect(screen.queryByText(/상한 지정가/)).not.toBeInTheDocument()
  })
  it('TOSS + MOO면 개장 직후 지정가 캡션', () => {
    render(<Harness broker="TOSS" defaults={{ orderType: 'MOO' }} />)
    expect(screen.getByText('토스증권은 개장 직후 지정가로 접수되어 시가 체결이 보장되지 않음')).toBeInTheDocument()
  })
  it('수정 모드에서 방향은 읽기 전용', () => {
    render(<Harness isEdit />)
    expect(screen.queryByRole('button', { name: '매도' })).not.toBeInTheDocument()
    expect(screen.getByText('매수')).toBeInTheDocument()
  })
})
