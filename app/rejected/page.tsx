'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { XCircle } from 'lucide-react'
import { GlassCard } from '@/components/common/GlassCard'

const STORAGE_KEY = 'reapply_rejected_last_at'
const COOLDOWN_MS = 24 * 60 * 60 * 1000

function formatCooldown(minutes: number): string {
  if (minutes > 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}시간 ${m}분 후 재신청 가능` : `${h}시간 후 재신청 가능`
  }
  return `${minutes}분 후 재신청 가능`
}

function LogoutButton() {
  const router = useRouter()
  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }
  return (
    <button
      type="button"
      onClick={handleLogout}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', borderRadius: 8,
        fontSize: 13, fontWeight: 600,
        background: 'transparent',
        color: 'var(--muted-foreground)',
        border: '1px solid var(--border)',
        cursor: 'pointer',
      }}
    >
      로그아웃
    </button>
  )
}

export default function RejectedPage() {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [cooldownMinutes, setCooldownMinutes] = useState<number>(0)

  useEffect(() => {
    const last = localStorage.getItem(STORAGE_KEY)
    if (last) {
      const elapsed = Date.now() - Number(last)
      const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 60000)
      if (remaining > 0) setCooldownMinutes(remaining)
    }
  }, [])

  async function handleReapply() {
    if (cooldownMinutes > 0) return
    setErrorMessage(null)
    try {
      const res = await fetch('/api/auth/reapply-done', { method: 'POST' })
      if (res.ok) {
        localStorage.setItem(STORAGE_KEY, Date.now().toString())
        router.push('/pending')
      } else {
        setErrorMessage('재신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      }
    } catch {
      setErrorMessage('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  return (
    <div className="relative" style={{ minHeight: '100vh' }}>
      {/* 상단 헤더 */}
      <div style={{ position: 'absolute', top: 28, left: 36, display: 'flex', alignItems: 'center', gap: 8, zIndex: 10 }}>
        <Image src="/logo.png" alt="KISTA" width={26} height={26} style={{ borderRadius: 6 }} />
        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--rose-700)', letterSpacing: 1 }}>KISTA</span>
      </div>
      <div style={{ position: 'absolute', top: 28, right: 36, zIndex: 10 }}>
        <LogoutButton />
      </div>

      <GlassCard maxWidth="480px">
        {/* 헤더 섹션 */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <Image src="/logo.png" alt="KISTA" width={44} height={44} className="rounded-[10px] mb-2" style={{ opacity: 0.7 }} />
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-full"
            style={{ background: 'rgba(200,68,58,0.12)' }}
          >
            <XCircle className="size-3.5" style={{ color: '#C8443A' }} />
            <span className="text-xs font-semibold" style={{ color: '#C8443A' }}>신청 반려</span>
          </div>
          <h1 className="text-xl font-bold text-foreground mt-1">신청이 반려되었습니다</h1>
          <p className="text-sm text-muted-foreground text-center">
            관리자가 신청을 검토한 결과<br />현재 서비스 이용이 어렵습니다.
          </p>
        </div>

        {/* 반려 사유 카드 */}
        <div
          className="rounded-[10px] p-4 mb-6"
          style={{
            background: 'rgba(200,68,58,0.06)',
            border: '1px solid rgba(200,68,58,0.16)',
          }}
        >
          <div className="flex items-start gap-2">
            <span style={{ color: '#C8443A', marginTop: 2, fontSize: 15 }}>⚠</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#C8443A', marginBottom: 4 }}>반려 사유</div>
              <div style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.6 }}>
                관리자가 가입 신청을 거절했습니다. 재신청하거나 관리자에게 문의해 주세요.
              </div>
            </div>
          </div>
        </div>

        {errorMessage && (
          <p className="text-[13px] text-destructive text-center mb-3">
            {errorMessage}
          </p>
        )}

        <button
          type="button"
          onClick={handleReapply}
          disabled={cooldownMinutes > 0}
          style={{
            width: '100%', height: 52,
            background: cooldownMinutes > 0 ? 'var(--muted)' : 'var(--primary)',
            color: cooldownMinutes > 0 ? 'var(--muted-foreground)' : 'white',
            border: 'none', borderRadius: 12,
            fontSize: 15, fontWeight: 700,
            cursor: cooldownMinutes > 0 ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {cooldownMinutes > 0 ? formatCooldown(cooldownMinutes) : '승인 재신청'}
        </button>
        <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)', marginTop: 10, textAlign: 'center' }}>
          재신청은 24시간에 한 번만 가능합니다.
        </div>
      </GlassCard>
    </div>
  )
}
