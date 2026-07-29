import { queryOptions } from '@tanstack/react-query'
import type { QueryKey } from '@tanstack/react-query'

export function detailFromListQueryOptions<T extends { id: string }>(
  detailKey: QueryKey,
  fetchList: () => Promise<T[]>,
  id: string,
) {
  return queryOptions<T | null>({
    queryKey: detailKey,
    queryFn: async () => {
      const items = await fetchList()
      return items.find((item) => item.id === id) ?? null
    },
  })
}
