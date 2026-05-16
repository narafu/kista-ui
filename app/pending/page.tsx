import Image from 'next/image'
import { getAuthToken } from '@/lib/auth/token'
import { getMe } from '@/lib/api/auth'
import { TelegramConnect } from './TelegramConnect'
import { PendingStatusWatcher } from './PendingStatusWatcher'
import { ReapplyButton } from './ReapplyButton'
import { LogoutButton } from './LogoutButton'

export default async function PendingPage() {
  const token = await getAuthToken()

  let hasTelegram = false
  if (token) {
    hasTelegram = await getMe(token).then((u) => u.hasTelegram).catch(() => false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      background: 'radial-gradient(1200px 600px at 75% 20%, rgba(224,163,140,0.22), transparent 60%), radial-gradient(900px 500px at 10% 90%, rgba(247,220,205,0.55), transparent 60%), var(--background)',
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
            style={{ borderRadius: 14, objectFit: 'cover', boxShadow: '0 4px 12px rgba(143,68,48,.18)' }} />
          <span style={{
            position: 'absolute', bottom: -4, right: -4,
            width: 32, height: 32, borderRadius: 999,
            background: 'var(--warn)', color: '#fff',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 4px 10px rgba(176,122,31,.3)',
            border: '3px solid white',
            fontSize: 14,
          }}>⌛</span>
        </div>

        {/* PENDING 배지 */}
        <span style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '4px 12px', borderRadius: 999,
          fontSize: 12, fontWeight: 700,
          background: 'var(--warn-bg)', color: 'var(--warn)',
          marginBottom: 14,
        }}>● PENDING</span>

        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px', color: 'var(--foreground)' }}>
          승인 검토 중입니다
        </h1>
        <p style={{ margin: '0 0 22px', fontSize: 14, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
          가입 신청이 접수되었습니다.<br />
          관리자 승인 후 서비스 이용이 가능합니다.
        </p>

        {/* 단계 타임라인 */}
        <div style={{
          padding: 18, borderRadius: 12, background: 'var(--muted)',
          marginBottom: 22, textAlign: 'left',
        }}>
          {[
            { label: '카카오 로그인 완료', done: true,  active: false, note: '완료' },
            { label: '가입 신청 접수',     done: true,  active: false, note: '완료' },
            { label: '관리자 승인 대기',   done: false, active: true,  note: '진행 중' },
            { label: '서비스 이용 가능',   done: false, active: false, note: '대기 중' },
          ].map((s, i, arr) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingBottom: i < arr.length - 1 ? 12 : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{
                  width: 20, height: 20, borderRadius: 999, flexShrink: 0,
                  background: s.done ? 'var(--status-ok)' : s.active ? 'var(--warn)' : 'var(--border)',
                  color: '#fff', display: 'grid', placeItems: 'center',
                  fontSize: 11, fontWeight: 700,
                  boxShadow: s.active ? '0 0 0 4px rgba(176,122,31,.16)' : 'none',
                }}>{s.done ? '✓' : ''}</span>
                {i < arr.length - 1 && (
                  <div style={{ width: 1, flex: 1, minHeight: 16, background: 'var(--border)', marginTop: 2 }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 13, fontWeight: s.active ? 700 : 600,
                  color: s.done ? 'var(--foreground)' : s.active ? 'var(--warn)' : 'var(--muted-foreground)',
                }}>{s.label}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)', marginTop: 2 }}>{s.note}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 버튼 영역 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PendingStatusWatcher />
          <ReapplyButton />
          <TelegramConnect hasTelegram={hasTelegram} />
        </div>
      </div>
    </div>
  )
}
