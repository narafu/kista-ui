'use client'

import { useEffect } from 'react'
import { reportClientError } from '../api'

// error.tsx/global-error.tsx 공용 — 렌더링 오류를 감지하면 1회 리포트 전송
export function useReportClientError(error: (Error & { digest?: string }) | undefined, pathname: string | null) {
  useEffect(() => {
    if (!error) return
    reportClientError({
      // kista-api ClientErrorLogRequest @Size 한도(255/2000/8000) 초과 시 400으로 로그 자체가 유실되므로 잘라서 보낸다
      errorType: (error.name || 'Error').slice(0, 255),
      message: error.message?.slice(0, 2000),
      stackTrace: error.stack?.slice(0, 8000),
      context: { pathname: pathname ?? '', ...(error.digest ? { digest: error.digest } : {}) },
    })
  }, [error, pathname])
}
