'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  listAccounts,
  updateAccount,
  deleteAccount,
  getMargin,
  getPrices,
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
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      router.push('/dashboard')
    },
    onError: () => toast.error('삭제에 실패했습니다'),
  })
}
