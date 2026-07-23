'use client'

import { useEffect } from 'react'
import { reportClientError } from '../api'

// error.tsx/global-error.tsx 공용 — 렌더링 오류를 감지하면 1회 리포트 전송
export function useReportClientError(error: (Error & { digest?: string }) | undefined, pathname: string | null) {
  useEffect(() => {
    if (!error) return
    reportClientError({
      errorType: error.name || 'Error',
      message: error.message,
      stackTrace: error.stack,
      context: { pathname: pathname ?? '', ...(error.digest ? { digest: error.digest } : {}) },
    })
  }, [error, pathname])
}
