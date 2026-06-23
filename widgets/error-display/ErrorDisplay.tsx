'use client'

import { useSyncExternalStore } from 'react'
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
  const cfg = (code !== undefined && CFGS[code]) || DEFAULT_CFG
  const timeStr = useSyncExternalStore(
    () => () => {},
    () => new Date().toLocaleTimeString('ko-KR', { hour12: false }),
    () => '',
  )

  const content = (
    <div className="text-center max-w-[440px] w-full px-6">
      {/* 상태 표시줄 */}
      <div
        className="inline-flex items-center gap-4 px-[18px] py-[7px] rounded-full bg-muted border border-border mb-11 text-[10.5px] text-muted-foreground tracking-[0.1em]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        <span className="flex items-center gap-[7px]">
          <span className="error-pulse-dot" />
          거래 정지
        </span>
        <span className="opacity-35">·</span>
        <span>KISTA</span>
        {timeStr && (
          <>
            <span className="opacity-35">·</span>
            <span>{timeStr}</span>
          </>
        )}
      </div>

      {/* 에러 코드 */}
      <div className="error-code-num">{code ?? '—'}</div>

      {/* 에러 타입 배지 */}
      <div
        className="inline-flex items-center px-[13px] py-1 rounded-full text-[10px] font-bold tracking-[0.14em] border border-border mb-4"
        style={{ background: cfg.bgVar, color: cfg.colorVar, fontFamily: 'var(--font-mono)' }}
      >
        {cfg.badge}
      </div>

      <h1 className="text-[19px] font-bold tracking-[-0.02em] text-foreground mb-2">
        {cfg.title}
      </h1>
      <p className="text-[13.5px] text-muted-foreground leading-[1.65] mb-8">
        {cfg.desc}
      </p>

      {/* 액션 버튼 */}
      <div className="flex gap-2 justify-center flex-wrap mb-9">
        <Link
          href="/dashboard"
          className="inline-flex items-center px-[22px] py-[9px] rounded-[var(--radius)] bg-primary text-primary-foreground text-[13px] font-semibold no-underline shadow-[var(--sh-rose)] tracking-[-0.01em]"
        >
          대시보드
        </Link>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center px-[22px] py-[9px] rounded-[var(--radius)] bg-secondary text-secondary-foreground text-[13px] font-semibold border border-border cursor-pointer tracking-[-0.01em]"
        >
          이전 페이지
        </button>
        {reset && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center px-[22px] py-[9px] rounded-[var(--radius)] bg-transparent text-muted-foreground text-[13px] font-semibold border border-border cursor-pointer tracking-[-0.01em]"
          >
            다시 시도
          </button>
        )}
      </div>

      {/* 하단 경로 정보 */}
      <div
        className="text-xs text-muted-foreground opacity-50 tracking-[0.08em] overflow-hidden text-ellipsis whitespace-nowrap"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        KISTA · {code ?? 'ERR'} · {pathname ?? '/'}
      </div>
    </div>
  )

  if (!standalone) {
    return (
      <div className="flex items-center justify-center min-h-[62vh] py-10">
        {content}
      </div>
    )
  }

  return (
    <div className="error-page-bg min-h-screen grid place-items-center relative overflow-hidden">
      <div className="absolute top-6 left-8 flex items-center gap-2">
        <Image src="/logo.png" alt="KISTA" width={22} height={22} style={{ borderRadius: 5, height: 22, width: 22 }} />
        <span
          className="text-[12.5px] font-extrabold text-[var(--rose-700)] tracking-[2px]"
        >
          KISTA
        </span>
      </div>
      {content}
    </div>
  )
}
