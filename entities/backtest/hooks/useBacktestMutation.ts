'use client'

import { useMutation } from '@tanstack/react-query'
import { getBacktest } from '../api'
import type { BacktestParams, BacktestResult } from '../model/types'

export function useBacktestMutation() {
  return useMutation<BacktestResult, unknown, BacktestParams>({
    mutationFn: (params) => getBacktest(params),
  })
}
