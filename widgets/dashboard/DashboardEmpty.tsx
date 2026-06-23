import Image from 'next/image'
import Link from 'next/link'
import { PageHeader } from '@widgets/page-header'
import { NewAccountButton } from '@features/account/create-account'
import { WeeklyMarketCalendar } from '@widgets/market-holiday-calendar'
import { MarketChartCard } from '@widgets/dashboard/MarketChartCard'
import { MARKET_CHART_CATEGORIES } from '@widgets/dashboard/marketChartCategories'
import { FearGreedSection } from '@widgets/fear-greed-card'

interface Props {
  holidays: string[]
  initialWeekStartDate: string
}

const NOTIFICATION_CARD = {
  title: '매매 알림 받기',
  desc: '계좌 등록 후 알림을 설정하면 매매 체결 내역을 바로 받을 수 있어요. 브라우저 푸시(FCM)가 가장 간편하며, 텔레그램 봇 연동도 지원합니다.',
  cta: '알림 설정하기 →',
  href: '/settings',
}

export function DashboardEmpty({ holidays, initialWeekStartDate }: Props) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block">
        <PageHeader eyebrow="Dashboard" title="대시보드" />
        {/* Row 1: 안내 카드 2개 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div
            className="rounded-[var(--r-lg)] border border-rose-200 p-5 flex flex-col"
            style={{ background: 'var(--brand-soft-bg)' }}
          >
            <p className="text-sm font-bold tracking-[0.12em] uppercase text-[var(--brand-fg-soft)] mb-2">시작하기</p>
            <p className="text-sm font-bold mb-1.5">첫 계좌 등록</p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
              KIS API 키와 계좌번호를 입력하면 분할매매 자동화가 시작됩니다.
            </p>
            <NewAccountButton className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--r-md)] bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors self-start disabled:opacity-60">
              계좌 등록하기
            </NewAccountButton>
          </div>
          <div className="rounded-[var(--r-lg)] border border-border bg-card p-5 shadow-[var(--sh-card)] flex flex-col">
            <p className="text-sm font-bold tracking-[0.12em] uppercase text-muted-foreground mb-2">다음 단계</p>
            <p className="text-sm font-bold mb-1.5">{NOTIFICATION_CARD.title}</p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">{NOTIFICATION_CARD.desc}</p>
            <Link
              href={NOTIFICATION_CARD.href}
              className="text-sm font-bold text-[var(--brand-fg-soft)] hover:opacity-75 transition-opacity"
            >
              {NOTIFICATION_CARD.cta}
            </Link>
          </div>
        </div>
        {/* Row 2: 달력 + 공포탐욕 2개 (3칸) */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <WeeklyMarketCalendar
            holidays={holidays}
            initialWeekStartDate={initialWeekStartDate}
            accountIds={[]}
          />
          <FearGreedSection />
        </div>
        {/* Row 3: 트레이딩뷰 차트 3개 */}
        <div className="grid grid-cols-3 gap-4">
          {MARKET_CHART_CATEGORIES.map((category) => (
            <MarketChartCard key={category.title} category={category} />
          ))}
        </div>
      </div>

      {/* Mobile */}
      <div className="lg:hidden">
        <div
          className="rounded-[var(--r-lg)] border border-rose-200 p-5 mb-4 text-center"
          style={{ background: 'var(--brand-soft-bg)' }}
        >
          <div className="size-16 rounded-2xl bg-card flex items-center justify-center mx-auto mb-3 shadow-[0_4px_12px_rgba(143,68,48,0.18)]">
            <Image src="/logo.png" alt="KISTA" width={52} height={52} className="rounded-xl" style={{ height: 52, width: 52 }} />
          </div>
          <p className="text-sm font-bold tracking-[0.15em] uppercase text-[var(--brand-fg-soft)] mb-1.5">Welcome to KISTA</p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            한국투자증권 KIS API 키만 입력하면<br />분할매매 자동화가 시작됩니다.
          </p>
          <NewAccountButton className="flex items-center justify-center gap-2 w-full py-3 rounded-[var(--r-md)] bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 transition-colors disabled:opacity-60">
            첫 계좌 등록하기
          </NewAccountButton>
        </div>
        <div className="rounded-[var(--r-lg)] border border-border bg-card p-3.5 mb-4">
          <p className="text-sm font-bold mb-0.5">{NOTIFICATION_CARD.title}</p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">{NOTIFICATION_CARD.desc}</p>
          <Link href={NOTIFICATION_CARD.href} className="text-sm font-bold text-[var(--brand-fg-soft)] hover:opacity-75 transition-opacity">
            {NOTIFICATION_CARD.cta}
          </Link>
        </div>
        <WeeklyMarketCalendar
          holidays={holidays}
          initialWeekStartDate={initialWeekStartDate}
          accountIds={[]}
        />
        <div className="flex flex-col gap-4 mt-4">
          <FearGreedSection />
        </div>
        <div className="flex flex-col gap-4 mt-4">
          {MARKET_CHART_CATEGORIES.map((category) => (
            <MarketChartCard key={category.title} category={category} />
          ))}
        </div>
      </div>
    </>
  )
}
