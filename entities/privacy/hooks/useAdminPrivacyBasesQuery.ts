'use client'

import { useQuery } from '@tanstack/react-query'

import { adminPrivacyBasesQueryOptions } from '../model/queryOptions'

export function useAdminPrivacyBasesQuery() {
  return useQuery(adminPrivacyBasesQueryOptions())
}
