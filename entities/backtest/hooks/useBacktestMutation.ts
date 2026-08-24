'use client'

import { useMutation } from '@tanstack/react-query'
import { getBacktest } from '../api'
import type { BacktestParams, BacktestResult } from '../model/types'

export function useBacktestMutation() {
  // 의도적으로 onError toast 없음: useBacktestForm의 errorMessage가 폼 안에 고정 텍스트로
  // 에러를 노출한다(widgets.md의 "현재 상태 경고는 고정 텍스트" 컨벤션) — 여기서 toast까지
  // 띄우면 같은 실패를 두 번 보고하게 된다.
  return useMutation<BacktestResult, unknown, BacktestParams>({
    mutationFn: (params) => getBacktest(params),
  })
}
