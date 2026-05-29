import Image from 'next/image'
import Link from 'next/link'
import { Plus, TrendingUp } from 'lucide-react'
import { toNum } from '@/lib/utils'
import { getAuthToken } from '@/lib/auth/token'
import { listAccounts } from '@/lib/api/accounts'
import { getAccountPortfolio } from '@/lib/api/trades'
import { listStrategies } from '@/lib/api/strategies'
import { PageHeader } from '@/components/common/PageHeader'
import { KpiCard } from '@/components/common/KpiCard'
import { AccountCard } from '@/components/common/AccountCard'
import { ProfitDisplay } from '@/components/common/ProfitDisplay'
import type { Account } from '@/types/account'
import type { PortfolioSnapshot } from '@/types/trade'
import type { Strategy } from '@/types/strategy'

// kista-api PortfolioSummaryResponse 실제 형식 (CLAUDE.md "StatisticsController 응답" 참고)
interface PortfolioSummaryRaw {
  positions?: Array<{ evalAmountUsd?: number | string | null }>
  summary?: {
    totalAssetUsd?: number | string | null
    totalEvalProfit?: number | string | null
    totalReturnRate?: number | string | null
  }
}

function aggregatePortfolios(raws: (PortfolioSnapshot | null)[]): {
  totalAssetUsd: number
  marketValueUsd: number
  usdDeposit: number
  totalEvalProfit: number
  weightedReturnRate: number
} {
  let totalAssetUsd = 0
  let marketValueUsd = 0
  let totalEvalProfit = 0
  let weightedSum = 0  // Σ(posEval × returnRate) for weighted avg

  for (const raw of raws) {
    if (!raw) continue
    const r = raw as unknown as PortfolioSummaryRaw
    const assetUsd = toNum(r.summary?.totalAssetUsd)
    const evalProfit = toNum(r.summary?.totalEvalProfit)
    const returnRate = toNum(r.summary?.totalReturnRate)
    const posEval = (r.positions ?? []).reduce((s, p) => s + toNum(p.evalAmountUsd), 0)

    totalAssetUsd += assetUsd
    totalEvalProfit += evalProfit
    marketValueUsd += posEval
    weightedSum += posEval * returnRate
  }

  return {
    totalAssetUsd,
    marketValueUsd,
    usdDeposit: totalAssetUsd - marketValueUsd,
    totalEvalProfit,
    weightedReturnRate: marketValueUsd > 0 ? weightedSum / marketValueUsd : 0,
  }
}

function fmtUsd(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtKrw(n: number): string {
  return n.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
}

// ─── Empty 상태 ───────────────────────────────────────────────

function EmptyDesktop() {
  return (
    <div className="hidden lg:block">
      <PageHeader eyebrow="Dashboard" title="대시보드" />

      {/* Welcome hero */}
      <div
        className="rounded-[var(--r-lg)] border border-rose-200 p-9 flex items-center gap-7 mb-5 overflow-hidden relative"
        style={{ background: 'var(--brand-soft-bg)' }}
      >
        <div className="size-24 rounded-[22px] bg-card flex items-center justify-center flex-shrink-0 shadow-[0_8px_24px_rgba(143,68,48,0.18)]">
          <Image src="/logo.png" alt="KISTA" width={78} height={78} className="rounded-2xl" />
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

      {/* Onboarding steps */}
      <div className="grid grid-cols-3 gap-3.5">
        {[
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
        ].map(s => (
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
  )
}

function EmptyMobile() {
  return (
    <div className="lg:hidden">
      <div
        className="rounded-[var(--r-lg)] border border-rose-200 p-5 mb-4 text-center"
        style={{ background: 'var(--brand-soft-bg)' }}
      >
        <div className="size-16 rounded-2xl bg-card flex items-center justify-center mx-auto mb-3 shadow-[0_4px_12px_rgba(143,68,48,0.18)]">
          <Image src="/logo.png" alt="KISTA" width={52} height={52} className="rounded-xl" />
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

      <div className="flex flex-col gap-2">
        {[
          { n: 1, title: 'KIS API 키 발급', desc: '한국투자증권 Open API에서 실전 계좌용 키 발급' },
          { n: 2, title: '계좌 등록', desc: '키와 계좌번호 입력 + 전략 선택' },
          { n: 3, title: '텔레그램 연동', desc: '봇과 대화 시작하면 실시간 알림' },
        ].map(s => (
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
  )
}

// ─── 계좌 있는 상태 ────────────────────────────────────────────

interface DashboardProps {
  accounts: Account[]
  strategiesByAccount: Strategy[][]
  totalAssetUsd: number
  marketValueUsd: number
  usdDeposit: number
  totalEvalProfit: number
  weightedReturnRate: number
}

function DashboardDesktop({
  accounts,
  strategiesByAccount,
  totalAssetUsd,
  marketValueUsd,
  usdDeposit,
  totalEvalProfit,
  weightedReturnRate,
}: DashboardProps) {
  return (
    <div className="hidden lg:block">
      <PageHeader
        eyebrow="Dashboard"
        title="대시보드"
        actions={
          <Link
            href="/accounts/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--r-md)] bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors"
          >
            <Plus className="size-4" />
            계좌 등록
          </Link>
        }
      />

      <div className="sm:kpi-grid gap-4 mb-6">
        <KpiCard
          label="운용 계좌"
          value={`${accounts.length}개`}
          sub="등록된 계좌"
        />
        <KpiCard
          label="총 평가손익"
          value={
            totalEvalProfit === 0 && weightedReturnRate === 0
              ? <span className="text-muted-foreground text-base font-medium">데이터 없음</span>
              : <ProfitDisplay amount={totalEvalProfit} rate={weightedReturnRate} size="lg" full currency="KRW" />
          }
          sub="현재 보유 포지션 기준"
        />
        <KpiCard
          variant="soft"
          label="총 자산 (KRW)"
          value={`₩${fmtKrw(totalAssetUsd)}`}
          sub={`평가금액 $${fmtUsd(marketValueUsd)} (USD)`}
        />
      </div>

      <div className="flex items-end justify-between mb-3">
        <h2 className="text-[17px] font-bold">계좌 목록</h2>
        <Link href="/accounts" className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors">
          전체 보기 →
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {accounts.map((account, i) => (
          <AccountCard key={account.id} account={account} strategies={strategiesByAccount[i]} />
        ))}
      </div>
    </div>
  )
}

function DashboardMobile({
  accounts,
  strategiesByAccount,
  totalAssetUsd,
  totalEvalProfit,
  weightedReturnRate,
}: DashboardProps) {
  return (
    <div className="lg:hidden">
      {/* 총 자산 hero */}
      <div
        className="rounded-[var(--r-lg)] border border-rose-200 p-5 mb-4"
        style={{ background: 'var(--brand-soft-bg)' }}
      >
        <p className="text-[11.5px] font-bold tracking-[0.12em] uppercase text-[var(--brand-fg-soft)] mb-1.5">
          총 자산
        </p>
        <div className="text-[30px] font-extrabold text-[var(--brand-fg)] leading-tight">
          ₩{fmtKrw(totalAssetUsd)}
        </div>
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">총 평가손익</span>
          {totalEvalProfit === 0 && weightedReturnRate === 0 ? (
            <span className="text-xs text-muted-foreground">데이터 없음</span>
          ) : (
            <ProfitDisplay amount={totalEvalProfit} rate={weightedReturnRate} size="md" full currency="KRW" />
          )}
        </div>
      </div>

      <div className="flex items-end justify-between mb-3">
        <h2 className="text-base font-bold">계좌 목록</h2>
        <Link href="/accounts" className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors">
          전체 보기 →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {accounts.map((account, i) => (
          <AccountCard key={account.id} account={account} strategies={strategiesByAccount[i]} />
        ))}
      </div>
    </div>
  )
}

// ─── 페이지 엔트리 ─────────────────────────────────────────────

export default async function DashboardPage() {
  const token = await getAuthToken()
  const accounts: Account[] = token ? await listAccounts(token).catch(() => []) : []

  if (accounts.length === 0) {
    return (
      <>
        <EmptyDesktop />
        <EmptyMobile />
      </>
    )
  }

  const [portfolioRaws, strategiesByAccount] = token
    ? await Promise.all([
        Promise.all(accounts.map(a => getAccountPortfolio(a.id, token).catch(() => null))),
        Promise.all(accounts.map(a => listStrategies(a.id, token).catch((): Strategy[] => []))),
      ])
    : [[], accounts.map((): Strategy[] => [])]

  const { totalAssetUsd, marketValueUsd, usdDeposit, totalEvalProfit, weightedReturnRate } =
    aggregatePortfolios(portfolioRaws)

  const props: DashboardProps = {
    accounts,
    strategiesByAccount,
    totalAssetUsd,
    marketValueUsd,
    usdDeposit,
    totalEvalProfit,
    weightedReturnRate,
  }

  return (
    <>
      <DashboardDesktop {...props} />
      <DashboardMobile {...props} />
    </>
  )
}
