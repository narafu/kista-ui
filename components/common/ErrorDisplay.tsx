'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

type ErrCfg = { badge: string; title: string; desc: string; colorVar: string; bgVar: string }

const CFGS: Record<number, ErrCfg> = {
  404: {
    badge: 'SYMBOL NOT FOUND',
    title: '종목을 찾을 수 없음',
    desc: '상장 폐지된 종목이거나 존재하지 않는 경로입니다',
    colorVar: 'var(--neg)',
    bgVar: 'var(--neg-bg)',
  },
  403: {
    badge: 'ACCESS RESTRICTED',
    title: '접근이 제한되었습니다',
    desc: '해당 자산에 접근할 권한이 없습니다',
    colorVar: 'var(--pos)',
    bgVar: 'var(--pos-bg)',
  },
  401: {
    badge: 'SESSION EXPIRED',
    title: '세션이 만료되었습니다',
    desc: '보안을 위해 자동 로그아웃되었습니다',
    colorVar: 'var(--warn)',
    bgVar: 'var(--warn-bg)',
  },
  500: {
    badge: 'CIRCUIT BREAKER',
    title: '서버 장애 감지',
    desc: '예상치 못한 내부 오류가 발생했습니다',
    colorVar: 'var(--pos)',
    bgVar: 'var(--pos-bg)',
  },
}

const DEFAULT_CFG: ErrCfg = {
  badge: 'SYSTEM ERROR',
  title: '시스템 오류',
  desc: '잠시 후 다시 시도해주세요',
  colorVar: 'var(--pos)',
  bgVar: 'var(--pos-bg)',
}

interface ErrorDisplayProps {
  code?: number
  reset?: () => void
  standalone?: boolean
}

export function ErrorDisplay({ code, reset, standalone = true }: ErrorDisplayProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [timeStr, setTimeStr] = useState('')
  const cfg = (code !== undefined && CFGS[code]) || DEFAULT_CFG

  useEffect(() => {
    setTimeStr(new Date().toLocaleTimeString('ko-KR', { hour12: false }))
  }, [])

  const content = (
    <div style={{ textAlign: 'center', maxWidth: 440, width: '100%', padding: '0 24px' }}>
      {/* 상태 표시줄 */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 16,
        padding: '7px 18px', borderRadius: 999,
        background: 'var(--muted)', border: '1px solid var(--border)',
        marginBottom: 44, fontSize: 10.5,
        fontFamily: 'var(--font-mono)',
        color: 'var(--muted-foreground)', letterSpacing: '0.1em',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span className="error-pulse-dot" />
          거래 정지
        </span>
        <span style={{ opacity: 0.35 }}>·</span>
        <span>KISTA</span>
        {timeStr && (
          <>
            <span style={{ opacity: 0.35 }}>·</span>
            <span>{timeStr}</span>
          </>
        )}
      </div>

      {/* 에러 코드 */}
      <div className="error-code-num">{code ?? '—'}</div>

      {/* 에러 타입 배지 */}
      <div style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '4px 13px', borderRadius: 999,
        background: cfg.bgVar, color: cfg.colorVar,
        fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
        fontFamily: 'var(--font-mono)',
        border: '1px solid var(--border)',
        marginBottom: 16,
      }}>
        {cfg.badge}
      </div>

      <h1 style={{
        fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em',
        color: 'var(--foreground)', margin: '0 0 8px',
      }}>
        {cfg.title}
      </h1>
      <p style={{
        fontSize: 13.5, color: 'var(--muted-foreground)',
        lineHeight: 1.65, margin: '0 0 32px',
      }}>
        {cfg.desc}
      </p>

      {/* 액션 버튼 */}
      <div style={{
        display: 'flex', gap: 8, justifyContent: 'center',
        flexWrap: 'wrap', marginBottom: 36,
      }}>
        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '9px 22px', borderRadius: 'var(--radius)',
            background: 'var(--primary)', color: 'var(--primary-foreground)',
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
            boxShadow: 'var(--sh-rose)', letterSpacing: '-0.01em',
          }}
        >
          대시보드
        </Link>
        <button
          onClick={() => router.back()}
          style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '9px 22px', borderRadius: 'var(--radius)',
            background: 'var(--secondary)', color: 'var(--secondary-foreground)',
            fontSize: 13, fontWeight: 600,
            border: '1px solid var(--border)', cursor: 'pointer',
            letterSpacing: '-0.01em',
          }}
        >
          이전 페이지
        </button>
        {reset && (
          <button
            onClick={reset}
            style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '9px 22px', borderRadius: 'var(--radius)',
              background: 'transparent', color: 'var(--muted-foreground)',
              fontSize: 13, fontWeight: 600,
              border: '1px solid var(--border)', cursor: 'pointer',
              letterSpacing: '-0.01em',
            }}
          >
            다시 시도
          </button>
        )}
      </div>

      {/* 하단 경로 정보 */}
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10.5,
        color: 'var(--muted-foreground)', opacity: 0.5,
        letterSpacing: '0.08em',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        KISTA · {code ?? 'ERR'} · {pathname ?? '/'}
      </div>
    </div>
  )

  if (!standalone) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '62vh', padding: '40px 0',
      }}>
        {content}
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'grid', placeItems: 'center',
      position: 'relative', overflow: 'hidden',
      background: [
        'radial-gradient(700px 500px at 80% 15%, rgba(224,163,140,0.13), transparent 60%)',
        'radial-gradient(500px 400px at 15% 85%, rgba(182,105,81,0.08), transparent 55%)',
        'var(--background)',
      ].join(', '),
    }}>
      <div style={{
        position: 'absolute', top: 24, left: 32,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Image src="/logo.png" alt="KISTA" width={22} height={22} style={{ borderRadius: 5 }} />
        <span style={{
          fontSize: 12.5, fontWeight: 800,
          color: 'var(--rose-700)', letterSpacing: 2,
        }}>
          KISTA
        </span>
      </div>
      {content}
    </div>
  )
}
