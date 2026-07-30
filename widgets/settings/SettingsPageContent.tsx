'use client'

import { AlertTriangle } from 'lucide-react'

import { useMeQuery } from '@entities/user'
import { DeleteAccountButton } from '@features/settings/delete-user-account'
import { TelegramSection } from '@features/settings/telegram-connect'
import { NotificationSettings } from '@features/settings/notification-channel'
import { ThemeCards } from '@features/settings/theme-select'
import { BalanceCheckSetting } from '@features/settings/balance-check-setting'
import { TradingAlertToggle } from '@features/settings/notification-prefs'
import { NicknameEditor } from '@features/settings/edit-nickname'
import { Surface } from '@shared/ui/Surface'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: '활성', color: 'var(--status-ok)' },
  PENDING: { label: '대기', color: 'var(--warn)' },
  REJECTED: { label: '반려', color: 'var(--status-error)' },
}

export function SettingsPageContent() {
  const { data: user } = useMeQuery()
  const statusCfg = user?.status ? STATUS_CONFIG[user.status] : null
  const notificationChannel = user?.notificationChannel ?? (user?.hasTelegram ? 'TELEGRAM' : 'NONE')

  return (
    <div className="flex flex-col gap-[18px] reveal-stagger">
      <Surface as="section" id="profile" className="p-6">
        <div className="text-sm font-bold mb-0.5">프로필</div>
        <div className="text-sm text-muted-foreground mb-[18px]">카카오 계정 정보</div>
        <div className="flex items-center gap-4 mb-[18px]">
          <span className="size-[60px] rounded-full bg-[#FEE500] grid place-items-center shrink-0">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="#3C1E1E" aria-hidden="true">
              <path d="M12 3C6.5 3 2 6.4 2 10.6c0 2.7 1.9 5 4.7 6.4l-1 3.7c-.1.4.3.7.7.5l4.4-2.9c.4 0 .8.1 1.2.1 5.5 0 10-3.4 10-7.6C22 6.4 17.5 3 12 3z" />
            </svg>
          </span>
          <div>
            <div className="text-base font-bold">{user?.nickname ?? '-'}</div>
            {statusCfg && <div className="text-sm font-semibold mt-0.5" style={{ color: statusCfg.color }}>{statusCfg.label}</div>}
          </div>
        </div>
        <div className="border-t border-border pt-4">
          <div className="text-sm text-muted-foreground mb-1">닉네임</div>
          <NicknameEditor initialNickname={user?.nickname ?? ''} />
        </div>
      </Surface>

      <Surface as="section" id="notifications" className="p-6">
        <div className="text-sm font-bold mb-0.5">알림</div>
        <div className="text-sm text-muted-foreground mb-[18px]">알림 채널과 텔레그램 연동을 설정합니다.</div>
        <TelegramSection hasTelegram={user?.hasTelegram ?? false} telegramBotUsername={user?.telegramBotUsername} currentChannel={notificationChannel} />
        <NotificationSettings currentChannel={notificationChannel} hasTelegram={user?.hasTelegram ?? false} />
        <div className="flex items-center gap-[14px] py-3">
          <div className="flex-1"><div className="text-sm font-bold">매매 알림</div><div className="text-sm text-muted-foreground mt-0.5">매매 체결 결과 알림</div></div>
          <TradingAlertToggle type="TRADING_ALERT" initialEnabled={user?.notificationPrefs?.['TRADING_ALERT'] ?? true} channel={notificationChannel} />
        </div>
        <div className="flex items-center gap-[14px] py-3 border-t border-border">
          <div className="flex-1"><div className="text-sm font-bold">장 시작/마감 알림</div><div className="text-sm text-muted-foreground mt-0.5">미국 장 개시 및 마감 시 알림</div></div>
          <TradingAlertToggle type="MARKET_ALERT" initialEnabled={user?.notificationPrefs?.['MARKET_ALERT'] ?? true} channel={notificationChannel} />
        </div>
      </Surface>

      <Surface as="section" id="preferences" className="p-6">
        <div className="text-sm font-bold mb-0.5">환경설정</div>
        <div className="text-sm text-muted-foreground mb-[18px]">테마와 알림 환경을 조정합니다.</div>
        <div className="text-sm font-semibold text-muted-foreground mb-2">테마</div>
        <ThemeCards />
        <div className="mt-5 pt-4 border-t border-border"><BalanceCheckSetting initialEnabled={user?.balanceCheckEnabled ?? true} /></div>
      </Surface>

      <section id="danger" className="rounded-[var(--r-lg)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-6">
        <div className="flex items-center gap-2.5 mb-3"><AlertTriangle className="size-4 text-[var(--status-error)]" /><h2 className="text-sm font-semibold text-[var(--status-error)]">위험 구역</h2></div>
        <p className="text-sm text-muted-foreground mb-4">되돌릴 수 없는 작업입니다.</p>
        <DeleteAccountButton />
      </section>
    </div>
  )
}
