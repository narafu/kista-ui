'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, apiMsg } from '@shared/lib/api-client'
import {
  createAccount,
  updateAccount,
  deleteAccount,
  getMargin,
  getPrices,
  testKisConnection,
  type MarginItem,
  type PriceMap,
} from '../api'
import type { Account, AccountRequest } from '../model/types'
import { accountKeys } from '../model/queryKeys'
import { accountListQueryOptions } from '../model/queryOptions'

function upsertAccount(accounts: Account[], saved: Account) {
  const exists = accounts.some((account) => account.id === saved.id)

  if (!exists) {
    return [...accounts, saved]
  }

  return accounts.map((account) => account.id === saved.id ? saved : account)
}

async function synchronizeAccountList(
  queryClient: QueryClient,
  update: (accounts: Account[]) => Account[],
) {
  const accounts = queryClient.getQueryData<Account[]>(accountKeys.list())
  if (accounts !== undefined) {
    queryClient.setQueryData<Account[]>(accountKeys.list(), update(accounts))
    return
  }

  await queryClient.fetchQuery(accountListQueryOptions())
}

export function useAccountMarginQuery(accountId: string, options?: { enabled?: boolean }) {
  const { data: items = [], isLoading, isError } = useQuery<MarginItem[]>({
    queryKey: accountKeys.margin(accountId),
    queryFn: () => getMargin(accountId),
    enabled: options?.enabled !== false,
    staleTime: 0,
  })
  return { items, isLoading, isError }
}

export function useAccountPricesQuery(accountId: string, tickers: string[]) {
  return useQuery<PriceMap>({
    queryKey: accountKeys.prices(accountId, tickers),
    queryFn: () => getPrices(accountId, tickers),
    enabled: !!accountId && tickers.length > 0,
    staleTime: 0,
  })
}

export function useUpdateAccountMutation(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation<Account, Error, AccountRequest>({
    mutationFn: (data) => updateAccount(accountId, data),
    onSuccess: async (saved) => {
      queryClient.setQueryData(accountKeys.detail(accountId), saved)
      await synchronizeAccountList(queryClient, (accounts) => upsertAccount(accounts, saved))
    },
    onError: (err) => toast.error(apiMsg(err, '수정에 실패했습니다')),
  })
}

export function useDeleteAccountMutation(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation<void, Error>({
    mutationFn: () => deleteAccount(accountId),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: accountKeys.detail(accountId) })
      queryClient.removeQueries({ queryKey: accountKeys.margin(accountId) })
      queryClient.removeQueries({ queryKey: accountKeys.pricesRoot(accountId) })
      await synchronizeAccountList(queryClient, (accounts) =>
        accounts.filter((account) => account.id !== accountId))
    },
    onError: (err) => toast.error(apiMsg(err, '삭제에 실패했습니다')),
  })
}

export function useCreateAccountMutation() {
  const queryClient = useQueryClient()
  return useMutation<Account, Error, AccountRequest>({
    mutationFn: (data) => createAccount(data),
    onSuccess: async (saved) => {
      queryClient.setQueryData(accountKeys.detail(saved.id), saved)
      await synchronizeAccountList(queryClient, (accounts) => upsertAccount(accounts, saved))
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 422) {
        toast.error('자격증명 인증에 실패했습니다')
      } else {
        toast.error('계좌 연결에 실패했습니다')
      }
    },
  })
}

// side effect 없음 — UI에서 isSuccess/isError로 인라인 표시
export function useTestKisConnectionMutation() {
  return useMutation<void, Error, { appKey: string; appSecret: string; broker?: string }>({ // eslint-disable-line react-doctor/query-mutation-missing-invalidation
    mutationFn: ({ appKey, appSecret, broker }) => testKisConnection(appKey, appSecret, broker),
  })
}
