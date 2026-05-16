import { PlusCircle } from 'lucide-react'
import Link from 'next/link'
import { AccountCard } from '@/components/common/AccountCard'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getAuthToken } from '@/lib/auth/token'
import { listAccounts } from '@/lib/api/accounts'
import type { Account } from '@/types/account'

export default async function DashboardPage() {
  const token = await getAuthToken()

  let accounts: Account[] = []
  if (token) {
    try {
      accounts = await listAccounts(token)
    } catch {
      // 조회 실패 시 빈 배열
    }
  }

  const activeCount = accounts.filter(a => a.strategyStatus === 'ACTIVE').length
  const pausedCount = accounts.filter(a => a.strategyStatus === 'PAUSED').length

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--rose-500)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Dashboard</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>대시보드</h1>
        </div>
        <Link href="/accounts/new" className={cn(buttonVariants())}>
          <PlusCircle className="h-4 w-4 mr-1.5" />계좌 등록
        </Link>
      </div>

      {/* KPI 3열 그리드 (1fr 1fr 1.4fr) */}
      <div style={{ gap: 16 }} className="sm:kpi-grid">
        {/* 카드 1: 운용 계좌 */}
        <div style={{ background: 'var(--card)', borderRadius: 14, padding: 18, boxShadow: 'var(--sh-card)', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)', fontWeight: 600, marginBottom: 8 }}>운용 계좌</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 30, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{accounts.length}</span>
            <span style={{ fontSize: 14, color: 'var(--muted-foreground)', fontWeight: 600 }}>개</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)', marginTop: 4 }}>
            <span style={{ color: 'var(--status-ok)', fontWeight: 700 }}>● {activeCount} 운영중</span>
            <span style={{ marginLeft: 8 }}>· {pausedCount} 일시중지</span>
          </div>
        </div>

        {/* 카드 2: 오늘의 손익 */}
        <div style={{ background: 'var(--card)', borderRadius: 14, padding: 18, boxShadow: 'var(--sh-card)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)', fontWeight: 600, marginBottom: 8 }}>오늘의 손익</div>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>계좌 상세에서<br/>확인하세요</div>
        </div>

        {/* 카드 3: 총 자산 */}
        <div style={{ background: 'var(--brand-soft-bg)', borderRadius: 14, padding: 18, boxShadow: 'var(--sh-card)', border: '1px solid var(--rose-100)' }}>
          <div style={{ fontSize: 12.5, color: 'var(--brand-fg-soft)', fontWeight: 700, marginBottom: 8 }}>총 자산 (USD)</div>
          <div style={{ fontSize: 13, color: 'var(--brand-fg-soft)', lineHeight: 1.5 }}>계좌 상세에서<br/>확인하세요</div>
        </div>
      </div>

      {/* 계좌 목록 or 빈 상태 */}
      {accounts.length === 0 ? (
        <>
          {/* Welcome hero */}
          <div style={{
            background: 'var(--brand-soft-bg)', borderRadius: 14, border: '1px solid var(--rose-100)',
            padding: 36, display: 'flex', alignItems: 'center', gap: 28,
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: 18, background: 'var(--card)',
              boxShadow: '0 8px 24px rgba(143,68,48,.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <img src="/logo.png" alt="" style={{ width: 64, height: 64, borderRadius: 14 }}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--rose-500)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Welcome to KISTA</div>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
                한국투자증권 KIS API 키만 입력하면 분할매매 자동화가 시작됩니다.<br/>
                계좌 한 개당 INFINITE 또는 PRIVACY 전략을 선택할 수 있어요.
              </p>
            </div>
            <Link href="/accounts/new" className={cn(buttonVariants(), 'shrink-0')}>
              <PlusCircle className="h-4 w-4 mr-1.5" />첫 계좌 등록하기
            </Link>
          </div>

          {/* Onboarding steps */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            {[
              { n: 1, title: 'KIS API 키 발급', desc: '한국투자증권 Open API에서 실전 계좌용 APP KEY / SECRET을 발급받으세요.', cta: '발급 페이지 열기 ↗', url: 'https://securities.koreainvestment.com/main/member/login/login.jsp?returnUrl=%2Fmain%2Fcustomer%2Fsystemdown%2FRestAPIService.jsp&isXecurePass=Y' },
              { n: 2, title: '계좌 등록', desc: '발급받은 키와 계좌번호를 입력하고 전략을 선택합니다.', cta: '계좌 등록 →', url: '/accounts/new' },
              { n: 3, title: '텔레그램 연동', desc: '봇과 대화를 시작하면 매매 알림을 실시간으로 받을 수 있어요.', cta: '봇 연결하기 →', url: '/settings' },
            ].map(s => (
              <div key={s.n} style={{ background: 'var(--card)', borderRadius: 14, padding: 22, boxShadow: 'var(--sh-card)', border: '1px solid var(--border)' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'var(--rose-50)', color: 'var(--rose-500)',
                  display: 'grid', placeItems: 'center',
                  fontWeight: 800, fontSize: 16, marginBottom: 14,
                  border: '1px solid var(--rose-100)',
                }}>{s.n}</div>
                <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 6 }}>{s.title}</div>
                <p style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>{s.desc}</p>
                <a href={s.url} target={s.url.startsWith('http') ? '_blank' : '_self'} rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--rose-500)', textDecoration: 'none' }}>{s.cta}</a>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>계좌 목록</h2>
            <Link href="/accounts" style={{ fontSize: 12.5, color: 'var(--rose-500)', textDecoration: 'none', fontWeight: 600 }}>전체 보기 →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <Link key={account.id} href={`/accounts/${account.id}`}>
                <AccountCard account={account} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
