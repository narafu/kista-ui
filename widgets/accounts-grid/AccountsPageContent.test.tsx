import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Account } from '@entities/account'
import { accountKeys } from '@entities/account'
import { createQueryClient } from '@shared/lib/query'
import { AccountsPageContent } from './AccountsPageContent'

let searchParamsValue = ''

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(searchParamsValue),
}))

vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    findBroker: (code: string) => ({ label: code === 'TOSS' ? '토스' : code }),
  }),
}))

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

const toss: Account = { ...account, id: 'k1', nickname: '토스계좌 1', broker: 'TOSS' }
const upbit: Account = { ...account, id: 'u1', nickname: '업비트 1', broker: 'UPBIT' }
const toss2: Account = { ...account, id: 'k2', nickname: '토스계좌 2', broker: 'TOSS' }

describe('AccountsPageContent', () => {
  beforeEach(() => {
    searchParamsValue = ''
  })

  function renderAccounts(accounts: Account[]) {
    const client = createQueryClient()
    client.setQueryData(accountKeys.list(), accounts)
    renderWithClient(client)
  }

  it('hides the broker filter when accounts share one broker', () => {
    renderAccounts([toss, toss2])
    expect(screen.queryByRole('group', { name: '증권사·거래소 필터' })).not.toBeInTheDocument()
  })

  it('shows counts per broker and updates the url on selection', async () => {
    renderAccounts([toss, upbit, toss2])
    expect(screen.getByRole('button', { name: '전체 3' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '토스 2' })).toBeInTheDocument()

    const replaceState = vi.spyOn(window.history, 'replaceState')
    await userEvent.click(screen.getByRole('button', { name: 'UPBIT 1' }))
    expect(replaceState).toHaveBeenCalledWith(null, '', '?broker=UPBIT')
    replaceState.mockRestore()
  })

  it('filters by the broker param', () => {
    searchParamsValue = 'broker=UPBIT'
    renderAccounts([toss, upbit, toss2])
    expect(screen.getByText('업비트 1')).toBeInTheDocument()
    expect(screen.queryByText('토스계좌 1')).not.toBeInTheDocument()
  })

  it('treats an unknown broker param as all', () => {
    searchParamsValue = 'broker=NOPE'
    renderAccounts([toss, upbit, toss2])
    expect(screen.getByText('토스계좌 1')).toBeInTheDocument()
    expect(screen.getByText('업비트 1')).toBeInTheDocument()
  })

  it('renders the account empty state from query data rather than a server-only branch', () => {
    const client = createQueryClient()
    client.setQueryData(accountKeys.list(), [])

    renderWithClient(client)

    expect(screen.getByText('등록된 계좌가 없습니다')).toBeInTheDocument()
  })

  it('resets "더 보기" to the first page when the broker filter changes', async () => {
    const many = Array.from({ length: 13 }, (_, i) => ({ ...toss, id: `k${i}`, nickname: `토스계좌 ${i}` }))
    const client = createQueryClient()
    client.setQueryData(accountKeys.list(), [...many, upbit])
    const { rerender } = renderWithClient(client)

    await userEvent.click(screen.getByRole('button', { name: /더 보기/ }))
    expect(screen.getByText('토스계좌 12')).toBeInTheDocument()

    searchParamsValue = 'broker=TOSS'
    rerender(
      <QueryClientProvider client={client}>
        <AccountsPageContent />
      </QueryClientProvider>,
    )
    expect(screen.queryByText('토스계좌 12')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '더 보기 (1개 남음)' })).toBeInTheDocument()
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

  it('puts mock accounts and the mock filter option last', () => {
    const mock2: Account = { ...account, id: 'm2', nickname: '모의 2' }
    renderAccounts([account, toss, mock2, upbit])

    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['전체 4', '토스 1', 'UPBIT 1', 'MOCK 2'])
    const names = ['토스계좌 1', '업비트 1', '캐시 계좌', '모의 2'].map((name) => screen.getByText(name))
    names.slice(1).forEach((node, i) => {
      expect(names[i].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })
  })
})
