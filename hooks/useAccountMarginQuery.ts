'use client'

import { useQuery } from '@tanstack/react-query'
import { getAccountMargin } from '@/lib/api/trades'
import type { MarginItem } from '@/types/trade'

export function useAccountMarginQuery(accountId: string) {
  const { data: items = [], isLoading } = useQuery<MarginItem[]>({
    queryKey: ['accountMargin', accountId],
    queryFn: () => getAccountMargin(accountId).catch((): MarginItem[] => []),
  })
  return { items, isLoading }
}
