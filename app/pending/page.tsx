import type { Metadata } from 'next'
import Image from 'next/image'
import { Clock } from 'lucide-react'
import { getAuthToken } from '@/lib/auth/token'
import { getMe } from '@/lib/api/auth'
import { GlassCard } from '@/components/common/GlassCard'
import { Timeline } from '@/components/common/Timeline'
import { TelegramConnect } from './TelegramConnect'
import { PendingStatusWatcher } from './PendingStatusWatcher'
import { ReapplyButton } from './ReapplyButton'
import { LogoutButton } from './LogoutButton'

const STEPS = [
  { label: '신청 완료', description: '카카오 로그인 및 회원가입 완료', done: true },
  { label: '관리자 검토', description: '영업일 기준 1-2일 소요', done: false },
  { label: '계좌 연동', description: 'KIS API 자격증명 입력', done: false },
  { label: '운영 시작', description: '자동 매매 활성화', done: false },
]

export const metadata: Metadata = {
  title: '승인 대기 | KISTA',
  description: '관리자 승인을 기다리고 있습니다',
}

export default async function PendingPage() {
  const token = await getAuthToken()

  let hasTelegram = false
  if (token) {
    hasTelegram = await getMe(token).then((u) => u.hasTelegram).catch(() => false)
  }

  return (
    <div className="relative min-h-screen">
      {/* 상단 헤더 */}
      <div className="absolute top-7 left-9 flex items-center gap-2">
        <Image src="/logo.png" alt="KISTA" width={26} height={26} className="rounded h-[26px]" />
        <span
          className="text-[15px] font-extrabold tracking-wide"
          style={{ color: 'var(--rose-700)' }}
        >
          KISTA
        </span>
      </div>
      <div className="absolute top-7 right-9">
        <LogoutButton />
      </div>

      <GlassCard maxWidth="480px">
        {/* 헤더 섹션 */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <Image src="/logo.png" alt="KISTA" width={44} height={44} className="rounded-[10px] mb-2 h-[44px]" />
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-full"
            style={{ background: 'var(--warn-bg)' }}
          >
            <Clock className="size-3.5" style={{ color: 'var(--warn)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--warn)' }}>검토 대기중</span>
          </div>
          <h1 className="text-xl font-bold text-foreground mt-1">승인 대기 중입니다</h1>
          <p className="text-sm text-muted-foreground text-center">
            관리자가 신청을 검토하고 있습니다.<br />승인 후 자동으로 이동됩니다.
          </p>
        </div>

        {/* 타임라인 */}
        <Timeline steps={STEPS} />

        {/* 버튼 영역 */}
        <div className="mt-6 pt-6 border-t border-border flex flex-col gap-2.5">
          <PendingStatusWatcher />
          <ReapplyButton />
          <TelegramConnect hasTelegram={hasTelegram} />
        </div>
      </GlassCard>
    </div>
  )
}
