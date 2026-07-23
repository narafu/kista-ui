'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { reportClientError } from '@entities/error-log'
import './globals.css'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const pathname = usePathname()

  useEffect(() => {
    reportClientError({
      errorType: error.name || 'Error',
      message: error.message,
      stackTrace: error.stack,
      context: { pathname: pathname ?? '', ...(error.digest ? { digest: error.digest } : {}) },
    })
  }, [error, pathname])

  return (
    <html lang="ko" className="dark">
      <body style={{
        margin: 0,
        fontFamily: 'var(--font-sans)',
        background: 'var(--background)',
        color: 'var(--foreground)',
        display: 'grid',
        placeItems: 'center',
        minHeight: '100vh',
      }}>
        <div style={{ textAlign: 'center', padding: '0 24px', maxWidth: 440, width: '100%' }}>
          {/* 브랜드 */}
          <div className="text-sm font-extrabold tracking-[2px] mb-6" style={{ color: 'var(--primary)' }}>
            KISTA
          </div>

          {/* 에러 코드 */}
          <div style={{
            fontSize: 'clamp(82px, 16vw, 136px)',
            fontStyle: 'italic', fontWeight: 700,
            lineHeight: 0.88, marginBottom: 28,
            letterSpacing: '-0.02em', color: 'var(--primary)',
          }}>
            500
          </div>

          {/* 상태 + 감지 시각 */}
          <div
            className="inline-flex items-center gap-[9px] px-[16px] py-[7px] rounded-full border mb-4 text-sm font-bold tracking-[0.12em]"
            style={{ background: 'var(--pos-bg)', color: 'var(--pos)', borderColor: 'var(--pos)', fontFamily: 'monospace' }}
          >
            <span className="error-pulse-dot" />
            CIRCUIT BREAKER
          </div>

          <h1 className="text-xl font-bold tracking-tight text-foreground mb-2">
            서버 장애 감지
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            예상치 못한 내부 오류가 발생했습니다
          </p>

          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center px-[22px] py-[9px] rounded-[10px] bg-primary text-primary-foreground text-sm font-bold tracking-[-0.01em] border-none"
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  )
}
