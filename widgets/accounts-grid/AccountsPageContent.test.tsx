import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { Account } from '@entities/account'
import { accountKeys } from '@entities/account'
import { createQueryClient } from '@shared/lib/query'
import { AccountsPageContent } from './AccountsPageContent'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => <a href={href} {...props}>{children}</a>,
}))

vi.mock('@widgets/account-card', () => ({
  AccountCard: ({ account }: { account: Account }) => <div>{account.nickname}</div>,
}))

vi.mock('@features/account/create-account', () => ({
  NewAccountButton: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
}))

const account: Account = {
  id: 'account-1',
  nickname: '캐시 계좌',
  accountNoMasked: '123-***',
  broker: 'MOCK',
}

function renderWithClient(client: QueryClient) {
  return render(
    <QueryClientProvider client={client}>
      <AccountsPageContent />
    </QueryClientProvider>,
  )
}

describe('AccountsPageContent', () => {
  it('renders the account empty state from query data rather than a server-only branch', () => {
    const client = createQueryClient()
    client.setQueryData(accountKeys.list(), [])

    renderWithClient(client)

    expect(screen.getByText('등록된 계좌가 없습니다')).toBeInTheDocument()
  })

  it('removes a deleted account without remounting the page', async () => {
    const client = createQueryClient()
    client.setQueryData(accountKeys.list(), [account])

    renderWithClient(client)
    expect(screen.getByText('캐시 계좌')).toBeInTheDocument()

    client.setQueryData(accountKeys.list(), [])

    await waitFor(() => {
      expect(screen.queryByText('캐시 계좌')).not.toBeInTheDocument()
    })
    expect(screen.getByText('등록된 계좌가 없습니다')).toBeInTheDocument()
  })
})
