import type { QueryClient, QueryKey } from '@tanstack/react-query'

export function upsertById<T extends { id: string }>(items: T[], saved: T): T[] {
  const exists = items.some((item) => item.id === saved.id)

  if (!exists) return [...items, saved]

  return items.map((item) => (item.id === saved.id ? saved : item))
}

interface ListSyncTarget<T> {
  queryKey: QueryKey
  fetchCompleteList: () => Promise<T[]>
}

async function synchronizeOneListQuery<T>(
  queryClient: QueryClient,
  target: ListSyncTarget<T>,
  update: (items: T[]) => T[],
): Promise<void> {
  const items = queryClient.getQueryData<T[]>(target.queryKey)
  if (items !== undefined) {
    queryClient.setQueryData<T[]>(target.queryKey, update(items))
    return
  }

  await target.fetchCompleteList()
}

export async function synchronizeListQueries<T>(
  queryClient: QueryClient,
  targets: ListSyncTarget<T>[],
  update: (items: T[]) => T[],
): Promise<void> {
  const results = await Promise.allSettled(
    targets.map((target) => synchronizeOneListQuery(queryClient, target, update)),
  )

  for (const result of results) {
    if (result.status === 'rejected') throw result.reason
  }
}
