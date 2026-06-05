import Image from 'next/image'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { PageHeader } from '@components/common/PageHeader'
import { MarketHolidayCalendar } from '@components/common/MarketHolidayCalendar'

interface Props {
  holidays: string[]
  calendarYear: number
  calendarMonth: number
}

const STEPS = [
  {
    n: 1,
    title: 'KIS API 키 발급',
    desc: '한국투자증권 Open API에서 실전 계좌용 APP KEY / SECRET을 발급받으세요.',
    cta: '발급 페이지 열기 ↗',
    href: 'https://securities.koreainvestment.com/main/customer/systemdown/RestAPIService.jsp',
    external: true,
  },
  {
    n: 2,
    title: '계좌 등록',
    desc: '발급받은 키와 계좌번호를 입력하고 전략을 선택합니다.',
    cta: '계좌 등록 →',
    href: '/accounts/new',
    external: false,
  },
  {
    n: 3,
    title: '텔레그램 연동',
    desc: '봇과 대화를 시작하면 매매 알림을 실시간으로 받을 수 있어요.',
    cta: '봇 연결하기 →',
    href: '/settings',
    external: false,
  },
]

export function DashboardEmpty({ holidays, calendarYear, calendarMonth }: Props) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block">
        <PageHeader eyebrow="Dashboard" title="대시보드" />
        <div className="flex gap-4 mb-5 items-stretch">
          <div
            className="flex-1 rounded-[var(--r-lg)] border border-rose-200 p-9 flex items-center gap-7 overflow-hidden relative"
            style={{ background: 'var(--brand-soft-bg)' }}
          >
            <div className="size-24 rounded-[22px] bg-card flex items-center justify-center flex-shrink-0 shadow-[0_8px_24px_rgba(143,68,48,0.18)]">
              <Image src="/logo.png" alt="KISTA" width={78} height={78} className="rounded-2xl" style={{ height: 78, width: 78 }} />
            </div>
            <div className="flex-1">
              <p className="text-[11.5px] font-bold tracking-[0.12em] uppercase text-rose-500 mb-1.5">Welcome to KISTA</p>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
                한국투자증권 KIS API 키만 입력하면 분할매매 자동화가 시작됩니다.<br />
                계좌 한 개당 INFINITE 또는 PRIVACY 전략을 선택할 수 있어요.
              </p>
            </div>
            <Link
              href="/accounts/new"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-[var(--r-md)] bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 transition-colors flex-shrink-0"
            >
              <Plus className="size-4" />
              첫 계좌 등록하기
            </Link>
          </div>
          <div className="flex-shrink-0">
            <MarketHolidayCalendar holidays={holidays} year={calendarYear} month={calendarMonth} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3.5">
          {STEPS.map(s => (
            <div key={s.n} className="rounded-[var(--r-lg)] border border-border bg-card p-5 shadow-[var(--sh-card)]">
              <div className="size-9 rounded-[10px] bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center font-extrabold text-base mb-3.5">
                {s.n}
              </div>
              <p className="text-[14.5px] font-bold mb-1.5">{s.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">{s.desc}</p>
              <Link
                href={s.href}
                target={s.external ? '_blank' : undefined}
                rel={s.external ? 'noopener noreferrer' : undefined}
                className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors"
              >
                {s.cta}
              </Link>
            </div>
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
          <p className="text-[11px] font-bold tracking-[0.15em] uppercase text-rose-500 mb-1.5">Welcome to KISTA</p>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            한국투자증권 KIS API 키만 입력하면<br />분할매매 자동화가 시작됩니다.
          </p>
          <Link
            href="/accounts/new"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-[var(--r-md)] bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 transition-colors"
          >
            <Plus className="size-4" />
            첫 계좌 등록하기
          </Link>
        </div>
        <div className="mb-4">
          <MarketHolidayCalendar holidays={holidays} year={calendarYear} month={calendarMonth} />
        </div>
        <div className="flex flex-col gap-2">
          {STEPS.map(s => (
            <div key={s.n} className="rounded-[var(--r-lg)] border border-border bg-card p-3.5 flex items-start gap-3">
              <span className="size-7 rounded-lg bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center font-extrabold text-sm flex-shrink-0">
                {s.n}
              </span>
              <div>
                <p className="text-sm font-bold">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
