import { getAuthToken } from '@/lib/auth/token'
import { getMe } from '@/lib/api/auth'
import { listAccounts } from '@/lib/api/accounts'
import { TelegramSection } from '@/components/settings/TelegramSection'
import { AccountTelegramSection } from '@/components/settings/AccountTelegramSection'
import { ThemeCards } from '@/components/settings/ThemeCards'
import { SettingsNav } from '@/components/settings/SettingsNav'
import type { User } from '@/types/user'
import type { Account } from '@/types/account'

export default async function SettingsPage() {
  const token = await getAuthToken()

  let user: User | null = null
  let accounts: Account[] = []

  if (token) {
    ;[user, accounts] = await Promise.all([
      getMe(token).catch(() => null),
      listAccounts(token).catch(() => []),
    ])
  }

  return (
    <div>
      {/* 페이지 헤더 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--rose-500)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Settings</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>설정</h1>
      </div>

      <div style={{ gap: 36, alignItems: 'flex-start' }} className="lg:settings-grid">
        {/* 좌측 스크롤스파이 네비 (데스크탑) */}
        <div className="hidden lg:block">
          <SettingsNav />
        </div>

        {/* 콘텐츠 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* 프로필 */}
          <section id="profile">
            <div style={{ background: 'var(--card)', borderRadius: 14, padding: 24, boxShadow: 'var(--sh-card)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>프로필</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)', marginBottom: 18 }}>카카오 계정 정보</div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
                <span style={{
                  width: 60, height: 60, borderRadius: 999, background: '#FEE500',
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="#3C1E1E">
                    <path d="M12 3C6.5 3 2 6.4 2 10.6c0 2.7 1.9 5 4.7 6.4l-1 3.7c-.1.4.3.7.7.5l4.4-2.9c.4 0 .8.1 1.2.1 5.5 0 10-3.4 10-7.6C22 6.4 17.5 3 12 3z"/>
                  </svg>
                </span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{user?.nickname ?? '-'}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)', marginTop: 2 }}>
                    {user?.status === 'ACTIVE' && (
                      <span style={{ color: 'var(--status-ok)', fontWeight: 600 }}>● ACTIVE</span>
                    )}
                    {user?.status === 'PENDING' && (
                      <span style={{ color: 'var(--warn)', fontWeight: 600 }}>● PENDING</span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)', marginBottom: 4 }}>닉네임</div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{user?.nickname ?? '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)', marginBottom: 4 }}>상태</div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: user?.status === 'ACTIVE' ? 'var(--status-ok)' : 'var(--foreground)' }}>
                      {user?.status ?? '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 환경 설정 */}
          <section id="prefs">
            <div style={{ background: 'var(--card)', borderRadius: 14, padding: 24, boxShadow: 'var(--sh-card)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>환경 설정</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)', marginBottom: 18 }}>테마와 알림 환경을 조정합니다.</div>

              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 8 }}>테마</div>
              <ThemeCards />

              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted-foreground)', marginTop: 20, marginBottom: 8 }}>알림</div>
              {[
                { label: '매매 알림',       desc: '체결 및 예약주문 상태 변경 시' },
                { label: '시스템 점검 알림', desc: 'KIS API 점검 시간 안내' },
                { label: '주간 리포트',     desc: '매주 월요일 아침 9시 발송' },
              ].map((row, i, arr) => (
                <div key={row.label} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 0',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{row.label}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)', marginTop: 2 }}>{row.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 텔레그램 알림 */}
          <section id="telegram">
            <div style={{ background: 'var(--card)', borderRadius: 14, padding: 24, boxShadow: 'var(--sh-card)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>텔레그램 알림</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)', marginBottom: 18 }}>봇과 연동해 매매 알림을 받으세요.</div>
              <TelegramSection hasTelegram={user?.hasTelegram ?? false} />
            </div>
          </section>

          {/* 계좌별 알림 */}
          <section id="accounts">
            <div style={{ background: 'var(--card)', borderRadius: 14, padding: 24, boxShadow: 'var(--sh-card)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>계좌별 알림</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)', marginBottom: 18 }}>계좌별로 텔레그램 알림 수신을 설정합니다.</div>
              <AccountTelegramSection accounts={accounts} />
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
