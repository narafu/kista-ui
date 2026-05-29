'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ko">
      <body style={{
        margin: 0,
        fontFamily: "'Pretendard Variable', system-ui, sans-serif",
        background: '#131416',
        color: '#E8E6E3',
        display: 'grid',
        placeItems: 'center',
        minHeight: '100vh',
      }}>
        <div style={{ textAlign: 'center', padding: '0 24px', maxWidth: 440, width: '100%' }}>
          {/* 상태 표시줄 */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 14,
            padding: '7px 18px', borderRadius: 999,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(232,230,227,0.1)',
            marginBottom: 44, fontSize: 10.5,
            color: '#9B9892', letterSpacing: '0.1em',
            fontFamily: 'monospace',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{
                display: 'inline-block', width: 6, height: 6,
                borderRadius: '50%', background: '#FF6A5C',
                animation: 'blink 1.3s ease-in-out infinite',
              }} />
              거래 정지
            </span>
            <span style={{ opacity: 0.35 }}>·</span>
            <span>KISTA</span>
          </div>

          {/* 에러 코드 */}
          <div style={{
            fontSize: 'clamp(82px, 16vw, 136px)',
            fontStyle: 'italic', fontWeight: 700,
            lineHeight: 0.88, marginBottom: 28,
            letterSpacing: '-0.02em', color: '#C99780',
          }}>
            500
          </div>

          {/* 배지 */}
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '4px 13px', borderRadius: 999,
            background: 'rgba(255,106,92,0.13)', color: '#FF6A5C',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
            border: '1px solid rgba(232,230,227,0.1)',
            marginBottom: 16, fontFamily: 'monospace',
          }}>
            CIRCUIT BREAKER
          </div>

          <h1 style={{
            fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em',
            color: '#E8E6E3', margin: '0 0 8px',
          }}>
            서버 장애 감지
          </h1>
          <p style={{
            fontSize: 13.5, color: '#9B9892',
            lineHeight: 1.65, margin: '0 0 32px',
          }}>
            예상치 못한 내부 오류가 발생했습니다
          </p>

          <button
            type="button"
            onClick={reset}
            style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '9px 22px', borderRadius: 10,
              background: '#C99780', color: '#1A1108',
              fontSize: 13, fontWeight: 700, border: 'none',
              cursor: 'pointer', letterSpacing: '-0.01em',
            }}
          >
            다시 시도
          </button>

          <style>{`
            @keyframes blink {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.2; }
            }
          `}</style>
        </div>
      </body>
    </html>
  )
}
