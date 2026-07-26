'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiMsg } from '@shared/lib/api-client'
import type { AdminSettings } from '../model/types'
import { getAdminSettings, updateAdminSettings } from '../api'
import { adminSettingsKeys } from '../model/queryKeys'

export function useAdminSettingsQuery(initialData?: AdminSettings) {
  return useQuery({
    queryKey: adminSettingsKeys.all,
    queryFn: () => getAdminSettings(),
    initialData,
    initialDataUpdatedAt: initialData ? 0 : undefined,
    staleTime: 0,
  })
}

export function useUpdateAdminSettingsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateAdminSettings,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminSettingsKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['runtime-config'], refetchType: 'all' }),
      ])
      toast.success('운영 설정을 저장했습니다.')
    },
    onError: (error) => toast.error(apiMsg(error, '운영 설정을 저장하지 못했습니다.')),
  })
}
