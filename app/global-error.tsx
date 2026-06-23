'use client'

import './globals.css'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
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
          {/* 상태 표시줄 */}
          <div
            className="inline-flex items-center gap-[14px] px-[18px] py-[7px] rounded-full border border-border mb-11 text-sm text-muted-foreground tracking-[0.1em]"
            style={{ background: 'rgba(255,255,255,0.06)', fontFamily: 'monospace' }}
          >
            <span className="flex items-center gap-[7px]">
              <span className="error-pulse-dot" />
              거래 정지
            </span>
            <span className="opacity-35">·</span>
            <span>KISTA</span>
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

          {/* 배지 */}
          <div
            className="inline-flex items-center px-[13px] py-1 rounded-full text-sm font-bold tracking-[0.14em] border border-border mb-4"
            style={{ background: 'var(--pos-bg)', color: 'var(--pos)', fontFamily: 'monospace' }}
          >
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
