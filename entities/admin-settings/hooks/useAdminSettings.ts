'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiMsg } from '@shared/lib/api-client'
import { updateAdminSettings } from '../api'
import { adminSettingsKeys } from '../model/queryKeys'
import { adminSettingsQueryOptions } from '../model/queryOptions'
import type { AdminSettings } from '../model/types'

interface UpdateAdminSettingsMutationOptions {
  onSuccess?: (settings: AdminSettings) => Promise<void> | void
}

export function useAdminSettingsQuery() {
  return useQuery(adminSettingsQueryOptions())
}

export function useUpdateAdminSettingsMutation(options: UpdateAdminSettingsMutationOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateAdminSettings,
    onSuccess: async (settings) => {
      queryClient.setQueryData(adminSettingsKeys.all, settings)
      await options.onSuccess?.(settings)
    },
    onError: (error) => toast.error(apiMsg(error, '운영 설정을 저장하지 못했습니다.')),
  })
}
