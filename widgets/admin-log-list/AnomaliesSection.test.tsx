import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AdminAnomalies, AdminAnomalyAccount } from '@entities/admin'
import { AnomaliesSection } from './AnomaliesSection'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/admin/logs',
  useSearchParams: () => new URLSearchParams(),
}))

const pausedAccount: AdminAnomalyAccount = {
  id: 'account-1',
  userId: 'user-1',
  ownerNickname: '홍길동',
  accountNoMasked: '123-45****',
  accountNo: '123-4567890',
}

const inactiveAccount: AdminAnomalyAccount = {
  id: 'account-2',
  userId: 'user-2',
  ownerNickname: '김영희',
  accountNoMasked: '987-65****',
  accountNo: '987-6543210',
}

describe('AnomaliesSection', () => {
  it('shows both empty states and no count badge when there are no anomalies', () => {
    const anomalies: AdminAnomalies = { pausedAccounts: [], inactiveAccounts: [] }
    render(<AnomaliesSection anomalies={anomalies} range="7d" />)

    expect(screen.getByText('일시정지된 계좌가 없습니다')).toBeInTheDocument()
    expect(screen.getByText('비활성 계좌가 없습니다')).toBeInTheDocument()
  })

  it('renders the paused accounts table and the total count badge when paused accounts exist', () => {
    const anomalies: AdminAnomalies = { pausedAccounts: [pausedAccount], inactiveAccounts: [] }
    render(<AnomaliesSection anomalies={anomalies} range="7d" />)

    expect(screen.getByText('홍길동')).toBeInTheDocument()
    expect(screen.queryByText('일시정지된 계좌가 없습니다')).not.toBeInTheDocument()
    // 이상징후(7일) 헤딩 옆에 총 개수(1) 배지가 표시된다
    const heading = screen.getByRole('heading', { name: /이상징후/ })
    expect(heading).toHaveTextContent('1')
  })

  it('renders the inactive accounts table independently from the paused accounts section', () => {
    const anomalies: AdminAnomalies = { pausedAccounts: [], inactiveAccounts: [inactiveAccount] }
    render(<AnomaliesSection anomalies={anomalies} range="7d" />)

    expect(screen.getByText('김영희')).toBeInTheDocument()
    expect(screen.getByText('일시정지된 계좌가 없습니다')).toBeInTheDocument()
    expect(screen.queryByText('비활성 계좌가 없습니다')).not.toBeInTheDocument()
  })
})
