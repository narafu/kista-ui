'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { softDeleteAdminErrorLog } from '../api'
import type { AdminErrorLogsQueryParams } from '../model/queryKeys'
import { adminKeys } from '../model/queryKeys'
import { adminErrorLogsQueryOptions } from '../model/queryOptions'
import type { AppErrorLog } from '../model/types'

export function useAdminErrorLogsQuery(params?: AdminErrorLogsQueryParams) {
  return useQuery(adminErrorLogsQueryOptions(params))
}

export function useDeleteAdminErrorLogsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => Promise.allSettled(ids.map((id) => softDeleteAdminErrorLog(id))),
    onSuccess: (results, ids) => {
      const deletedIds = new Set(ids.filter((_, index) => results[index]?.status === 'fulfilled'))
      if (deletedIds.size === 0) return
      queryClient.setQueriesData<AppErrorLog[]>({ queryKey: adminKeys.errorLogsRoot() }, (logs) =>
        logs?.filter((log) => !deletedIds.has(log.id)),
      )
    },
  })
}
