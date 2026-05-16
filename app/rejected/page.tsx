'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

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
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      background: 'radial-gradient(1200px 600px at 75% 20%, rgba(224,163,140,0.16), transparent 60%), radial-gradient(900px 500px at 10% 90%, rgba(247,220,205,0.4), transparent 60%), var(--background)',
      display: 'grid',
      placeItems: 'center',
      overflow: 'hidden',
    }}>
      {/* 상단 헤더 */}
      <div style={{ position: 'absolute', top: 28, left: 36, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Image src="/logo.png" alt="KISTA" width={26} height={26} style={{ borderRadius: 6 }} />
        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--rose-700)', letterSpacing: 1 }}>KISTA</span>
      </div>
      <div style={{ position: 'absolute', top: 28, right: 36 }}>
        <LogoutButton />
      </div>

      <div style={{
        width: '100%',
        maxWidth: 540,
        padding: 40,
        borderRadius: 18,
        background: 'rgba(255,255,255,0.86)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(199,123,102,0.22)',
        boxShadow: '0 24px 60px rgba(74,38,22,0.12)',
        textAlign: 'center',
        margin: '80px 16px',
      }}>
        {/* 로고 박스 */}
        <div style={{
          width: 88, height: 88, margin: '0 auto 20px',
          borderRadius: 20, background: 'var(--rose-50)',
          border: '1px solid var(--rose-100)',
          display: 'grid', placeItems: 'center', position: 'relative',
        }}>
          <Image src="/logo.png" alt="KISTA" width={66} height={66}
            style={{ borderRadius: 14, objectFit: 'cover', opacity: 0.55, filter: 'grayscale(0.3)' }} />
          <span style={{
            position: 'absolute', bottom: -4, right: -4,
            width: 32, height: 32, borderRadius: 999,
            background: '#C8443A', color: '#fff',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 4px 10px rgba(200,68,58,.3)',
            border: '3px solid white',
            fontSize: 16,
          }}>✕</span>
        </div>

        {/* REJECTED 배지 */}
        <span style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '4px 12px', borderRadius: 999,
          fontSize: 12, fontWeight: 700,
          background: 'rgba(200,68,58,0.12)', color: '#C8443A',
          marginBottom: 14,
        }}>● REJECTED</span>

        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px', color: 'var(--foreground)' }}>
          가입이 거절되었습니다
        </h1>
        <p style={{ margin: '0 0 22px', fontSize: 14, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
          가입 신청이 반려되었습니다.<br />
          아래 사유를 확인하시고 필요 시 재신청해주세요.
        </p>

        {/* 반려 사유 카드 */}
        <div style={{
          padding: 16, borderRadius: 12,
          background: 'rgba(200,68,58,0.06)',
          border: '1px solid rgba(200,68,58,0.16)',
          textAlign: 'left', marginBottom: 22,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
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
          <p style={{ fontSize: 13, color: 'var(--destructive)', textAlign: 'center', margin: '0 0 12px' }}>
            {errorMessage}
          </p>
        )}

        <button
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
        <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)', marginTop: 10 }}>
          재신청은 24시간에 한 번만 가능합니다.
        </div>
      </div>
    </div>
  )
}
