'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { ApiError } from '@shared/lib/api-client'
import {
  listAccounts,
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

export function useAccountsQuery(token?: string) {
  return useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: () => listAccounts(token!),
    enabled: !!token,
  })
}

export function useAccountMarginQuery(accountId: string) {
  const { data: items = [], isLoading } = useQuery<MarginItem[]>({
    queryKey: ['accountMargin', accountId],
    queryFn: () => getMargin(accountId).catch((): MarginItem[] => []),
  })
  return { items, isLoading }
}

export function useAccountPricesQuery(accountId: string, tickers: string[]) {
  return useQuery<PriceMap>({
    queryKey: ['accountPrices', accountId, tickers],
    queryFn: () => getPrices(accountId, tickers),
    enabled: !!accountId && tickers.length > 0,
  })
}

export function useUpdateAccountMutation(accountId: string) {
  const router = useRouter()
  const queryClient = useQueryClient()
  return useMutation<Account, Error, AccountRequest>({
    mutationFn: (data) => updateAccount(accountId, data),
    onSuccess: () => {
      toast.success('계좌가 수정되었습니다')
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      router.push(`/accounts/${accountId}`)
      router.refresh()
    },
    onError: () => toast.error('수정에 실패했습니다'),
  })
}

export function useDeleteAccountMutation(accountId: string) {
  const router = useRouter()
  const queryClient = useQueryClient()
  return useMutation<void, Error>({
    mutationFn: () => deleteAccount(accountId),
    onSuccess: () => {
      toast.success('계좌가 삭제되었습니다')
      queryClient.removeQueries({ queryKey: ['accounts'] })
      router.push('/dashboard')
    },
    onError: () => toast.error('삭제에 실패했습니다'),
  })
}

export function useCreateAccountMutation() {
  const router = useRouter()
  const queryClient = useQueryClient()
  return useMutation<Account, Error, AccountRequest>({
    mutationFn: (data) => createAccount(data),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      router.push(`/accounts/${saved.id}`)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 422) {
        toast.error('계좌번호가 KIS 자격증명과 일치하지 않습니다')
      } else {
        toast.error('계좌 연결에 실패했습니다')
      }
    },
  })
}

// side effect 없음 — UI에서 isSuccess/isError로 인라인 표시
export function useTestKisConnectionMutation() {
  return useMutation<void, Error, { appKey: string; appSecret: string }>({
    mutationFn: ({ appKey, appSecret }) => testKisConnection(appKey, appSecret),
  })
}
