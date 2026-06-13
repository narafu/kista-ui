import { AlertTriangle } from 'lucide-react'
import { getAuthToken } from '@shared/lib/auth/token'
import { DeleteAccountButton } from '@features/settings/delete-user-account'
import { getCachedUser } from '@shared/lib/cache/cached-api'
import { TelegramSection } from '@features/settings/telegram-connect'
import { NotificationSettings } from '@features/settings/notification-channel'
import { ThemeCards } from '@features/settings/theme-select'
import { PageHeader } from '@widgets/page-header'
import { ThemeToggle } from '@widgets/theme-toggle'
import type { User } from '@entities/user'

export default async function SettingsPage() {
  const token = await getAuthToken()

  let user: User | null = null

  if (token) {
    user = await getCachedUser(token).catch(() => null)
  }

  return (
    <div>
      <PageHeader eyebrow="설정" title="계정 설정" />

      <div className="flex flex-col gap-[18px]">

          {/* 프로필 */}
          <section id="profile" className="rounded-[var(--r-lg)] bg-card border border-border shadow-[var(--sh-card)] p-6">
            <div className="text-sm font-bold mb-0.5">프로필</div>
            <div className="text-[12.5px] text-muted-foreground mb-[18px]">카카오 계정 정보</div>

            <div className="flex items-center gap-4 mb-[18px]">
              <span className="size-[60px] rounded-full bg-[#FEE500] grid place-items-center shrink-0">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#3C1E1E">
                  <path d="M12 3C6.5 3 2 6.4 2 10.6c0 2.7 1.9 5 4.7 6.4l-1 3.7c-.1.4.3.7.7.5l4.4-2.9c.4 0 .8.1 1.2.1 5.5 0 10-3.4 10-7.6C22 6.4 17.5 3 12 3z"/>
                </svg>
              </span>
              <div>
                <div className="text-base font-bold">{user?.nickname ?? '-'}</div>
                <div className="text-[12.5px] text-muted-foreground mt-0.5">
                  {user?.status === 'ACTIVE' && (
                    <span className="text-status-ok font-semibold">● ACTIVE</span>
                  )}
                  {user?.status === 'PENDING' && (
                    <span className="text-warn font-semibold">● PENDING</span>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="profile-meta-grid gap-4">
                <div>
                  <div className="text-[11.5px] text-muted-foreground mb-1">닉네임</div>
                  <div className="text-[13.5px] font-semibold">{user?.nickname ?? '-'}</div>
                </div>
                <div>
                  <div className="text-[11.5px] text-muted-foreground mb-1">상태</div>
                  <div
                    className="text-[13.5px] font-semibold"
                    style={{ color: user?.status === 'ACTIVE' ? 'var(--status-ok)' : 'var(--foreground)' }}
                  >
                    {user?.status ?? '-'}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 알림 */}
          <section id="notifications" className="rounded-[var(--r-lg)] bg-card border border-border shadow-[var(--sh-card)] p-6">
            <div className="text-sm font-bold mb-0.5">알림</div>
            <div className="text-[12.5px] text-muted-foreground mb-[18px]">알림 채널과 텔레그램 연동을 설정합니다.</div>
            <TelegramSection
              hasTelegram={user?.hasTelegram ?? false}
              telegramBotUsername={user?.telegramBotUsername}
              currentChannel={user?.notificationChannel ?? (user?.hasTelegram ? 'TELEGRAM' : 'NONE')}
            />
            <NotificationSettings
              currentChannel={user?.notificationChannel ?? (user?.hasTelegram ? 'TELEGRAM' : 'NONE')}
              hasTelegram={user?.hasTelegram ?? false}
            />

            <div className="text-[12.5px] font-semibold text-muted-foreground mt-5 mb-2">알림 종류</div>
            <div className="divide-y divide-border">
              {[
                { label: '매매 알림',       desc: '매매 체결 결과 알림' },
                { label: '시스템 점검 알림', desc: 'KIS API 점검 시간 안내' },
                { label: '주간 리포트',     desc: '매주 월요일 아침 9시 발송' },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center gap-[14px] py-3"
                >
                  <div className="flex-1">
                    <div className="text-[13px] font-bold">{row.label}</div>
                    <div className="text-[11.5px] text-muted-foreground mt-0.5">{row.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 환경설정 */}
          <section id="preferences" className="rounded-[var(--r-lg)] bg-card border border-border shadow-[var(--sh-card)] p-6">
            <div className="text-sm font-bold mb-0.5">환경설정</div>
            <div className="text-[12.5px] text-muted-foreground mb-[18px]">테마와 알림 환경을 조정합니다.</div>

            <div className="text-[12.5px] font-semibold text-muted-foreground mb-2">테마</div>
            <ThemeCards />

            <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
              <div>
                <div className="text-[13px] font-bold">다크 모드</div>
                <div className="text-[11.5px] text-muted-foreground mt-0.5">시스템 테마 대신 직접 전환</div>
              </div>
              <ThemeToggle />
            </div>

          </section>

          {/* 위험 구역 */}
          <section id="danger" className="rounded-[var(--r-lg)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-6">
            <div className="flex items-center gap-2.5 mb-3">
              <AlertTriangle className="size-4 text-[var(--status-error)]" />
              <h2 className="text-sm font-semibold text-[var(--status-error)]">위험 구역</h2>
            </div>
            <p className="text-[13px] text-muted-foreground mb-4">되돌릴 수 없는 작업입니다.</p>
            <DeleteAccountButton />
          </section>

      </div>
    </div>
  )
}
