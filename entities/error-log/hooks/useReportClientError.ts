'use client'

import { useEffect } from 'react'
import { reportClientError } from '../api'

// 서로게이트 쌍 중간에서 잘리면 lone surrogate가 남아 서버 JSON 파싱·저장이 깨질 수 있어 끝의 high surrogate를 버린다
function truncate<T extends string | undefined>(value: T, max: number): T {
  return value?.slice(0, max).replace(/[\ud800-\udbff]$/, '') as T
}

// error.tsx/global-error.tsx 공용 — 렌더링 오류를 감지하면 1회 리포트 전송
export function useReportClientError(error: (Error & { digest?: string }) | undefined, pathname: string | null) {
  useEffect(() => {
    if (!error) return
    reportClientError({
      // kista-api ClientErrorLogRequest @Size 한도(255/2000/8000) 초과 시 400으로 로그 자체가 유실되므로 잘라서 보낸다
      // context는 서버 한도가 없지만 비정상적으로 긴 값이 쌓이지 않도록 500자로 제한
      errorType: truncate(error.name || 'Error', 255),
      message: truncate(error.message, 2000),
      stackTrace: truncate(error.stack, 8000),
      context: { pathname: truncate(pathname ?? '', 500), ...(error.digest ? { digest: truncate(error.digest, 500) } : {}) },
    })
  }, [error, pathname])
}
