'use client'

import { useSyncExternalStore } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { fmtTime } from '@shared/lib/format'
import { useReportClientError } from '@entities/error-log'

type ErrCfg = { badge: string; title: string; desc: string; colorVar: string; bgVar: string }
// 호출부(app/**/error.tsx, not-found.tsx) 4곳이 실제로 전달하는 코드는 404·500뿐이다.
type ErrorCode = 404 | 500

const CFGS: Record<ErrorCode, ErrCfg> = {
  404: {
    badge: 'SYMBOL NOT FOUND',
    title: '종목을 찾을 수 없음',
    desc: '상장 폐지된 종목이거나 존재하지 않는 경로입니다',
    colorVar: 'var(--neg)',
    bgVar: 'var(--neg-bg)',
  },
  500: {
    badge: 'CIRCUIT BREAKER',
    title: '서버 장애 감지',
    desc: '예상치 못한 내부 오류가 발생했습니다',
    colorVar: 'var(--pos)',
    bgVar: 'var(--pos-bg)',
  },
}

interface ErrorDisplayProps {
  code: ErrorCode
  error?: Error & { digest?: string }
  reset?: () => void
  standalone: boolean
}

export function ErrorDisplay({ code, error, reset, standalone }: ErrorDisplayProps) {
  const router = useRouter()
  const pathname = usePathname()
  const cfg = CFGS[code]
  const timeStr = useSyncExternalStore(
    () => () => {},
    () => fmtTime(new Date()),
    () => '',
  )

  useReportClientError(error, pathname)

  const content = (
    <div className="text-center max-w-[440px] w-full px-6">
      {/* 에러 코드 */}
      <div className="error-code-num">{code}</div>

      {/* 에러 상태 + 감지 시각 */}
      <div
        className="error-status-line"
        style={{ background: cfg.bgVar, borderColor: cfg.colorVar }}
      >
        <span className="error-pulse-dot" style={{ background: cfg.colorVar }} />
        <span style={{ color: cfg.colorVar }}>{cfg.badge}</span>
        {timeStr && (
          <>
            <span className="error-status-line-sep" />
            <span className="error-status-line-time">{timeStr}</span>
          </>
        )}
      </div>

      <h1 className="text-xl font-bold tracking-[-0.02em] text-foreground mb-2">
        {cfg.title}
      </h1>
      <p className="text-sm text-muted-foreground leading-[1.65] mb-8">
        {cfg.desc}
      </p>

      {/* 액션 버튼 */}
      <div className="flex gap-2 justify-center flex-wrap mb-9">
        <Link
          href="/dashboard"
          className="inline-flex items-center px-[22px] py-[9px] rounded-[var(--radius)] bg-primary text-primary-foreground text-sm font-semibold no-underline shadow-[var(--sh-rose)] tracking-[-0.01em]"
        >
          대시보드
        </Link>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center px-[22px] py-[9px] rounded-[var(--radius)] bg-secondary text-secondary-foreground text-sm font-semibold border border-border cursor-pointer tracking-[-0.01em]"
        >
          이전 페이지
        </button>
        {reset && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center px-[22px] py-[9px] rounded-[var(--radius)] bg-transparent text-muted-foreground text-sm font-semibold border border-border cursor-pointer tracking-[-0.01em]"
          >
            다시 시도
          </button>
        )}
      </div>

      {/* 하단 경로 정보 */}
      <div className="error-path-trace">
        {pathname ?? '/'}
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
        <Image src="/logo.png" alt="KISTA" width={22} height={22} className="size-[22px] rounded-[5px]" />
        <span
          className="text-sm font-extrabold text-[var(--rose-700)] tracking-[2px]"
        >
          KISTA
        </span>
      </div>
      {content}
    </div>
  )
}
