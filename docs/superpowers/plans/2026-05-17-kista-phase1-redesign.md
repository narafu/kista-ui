# KISTA Phase 1 — 디자인 정밀화 + 매매 SSE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** kista-ui 사용자 화면 11종을 Claude Design 핸드오프와 픽셀 단위로 일치시키고, 실시간 매매 알림 SSE 채널을 추가한다. kista-api 변경은 SSE + StatisticsController normalizer 최소 범위로 한정.

**Architecture:**
- kista-ui: Next.js 16 App Router + Tailwind v4 (config-in-CSS, tailwind.config.ts 없음) + shadcn v4 (@base-ui/react, asChild 없음). 인라인 `style={{ display/gridTemplateColumns/flexDirection }}` 절대 금지 (CLAUDE.md quirk: Tailwind 반응형 클래스 무효화).
- kista-api: Java 21 + Spring Boot 3.4 Hexagonal Architecture. ArchUnit 빌드타임 레이어 검증. 새 Trade SSE는 status SSE와 완전 분리된 Map으로 관리.
- SSE 인증: EventSource 커스텀 헤더 미지원 → Next.js Route Handler가 Bearer 토큰 첨부 후 kista-api로 중계.

**Tech Stack:** Next.js 16, Tailwind v4, shadcn v4, next-themes, Sonner (toasts), Recharts, Pretendard Variable, Cormorant Garamond, Java 21, Spring Boot 3.4, PostgreSQL, Flyway V16+, SseEmitter

**디자인 소스:** `/tmp/kista-design/extracted/design-system/project/` — `tokens.css`, `shared.jsx`, `screens.jsx`

---

## 파일 구조 맵

### 신설 (kista-ui)
```
components/common/StatusDot.tsx           # ACTIVE/PAUSED dot+label 통합 (TradingStatusIndicator 대체)
components/common/KpiCard.tsx             # variant: default | accent (rose gradient)
components/common/PageHeader.tsx          # eyebrow + h1 26/800 + actions slot
components/common/GlassCard.tsx           # Login/Pending/Rejected 공용 글래스 카드
components/common/Stepper.tsx             # 4단계 가로 스테퍼
components/common/Timeline.tsx            # Pending 4단계 수직 타임라인
components/layout/MobileHeader.tsx        # sticky 상단 (main layout inline → 분리)
components/accounts/NewAccountStepper.tsx # 4단계 state machine (useReducer)
components/accounts/steps/ApiStep.tsx
components/accounts/steps/AccountInfoStep.tsx
components/accounts/steps/StrategyStep.tsx
components/accounts/steps/ConfirmStep.tsx
components/accounts/DeleteAccountDialog.tsx
components/trading/TradeNotificationProvider.tsx
components/trading/TradeToast.tsx
app/api/trades/stream/route.ts             # SSE Route Handler (Bearer 중계)
types/trade-event.ts
```

### 수정 (kista-ui)
```
app/globals.css                             # 토큰 보강 (glass-card, border-strong, r-sm/md/lg/xl, dark rose alpha)
components/layout/DesktopSidebar.tsx        # 재작성 (인라인 style 제거, ThemeToggle 통합)
components/layout/MobileBottomNav.tsx       # 재작성 (4탭 rose dot)
components/common/AccountCard.tsx           # group hover: 패턴
components/common/ProfitDisplay.tsx         # full prop 추가
components/common/ThemeToggle.tsx           # sun/moon 트랙형
components/common/StrategyBadge.tsx         # height 22, radius 999
app/(main)/layout.tsx                       # MobileHeader 컴포넌트화 + TradeNotificationProvider + Toaster
app/(auth)/page.tsx                         # GlassCard + 정밀화
app/pending/page.tsx                        # GlassCard + Timeline
app/rejected/page.tsx                       # GlassCard + 반려사유
app/(main)/dashboard/page.tsx               # KpiCard + AccountCard 그리드
app/(main)/accounts/[id]/page.tsx           # 5섹션 layout
app/(main)/statistics/page.tsx              # 7-KPI + 계좌별 손익
app/(main)/settings/page.tsx                # sticky nav + 5섹션 + Danger zone
app/(main)/accounts/new/page.tsx            # NewAccountStepper 호출
app/(main)/accounts/[id]/edit/page.tsx      # AccountEditForm + DeleteAccountDialog
```

### 삭제 (kista-ui)
```
components/common/TradingStatusIndicator.tsx  # StatusDot으로 통합
```

### 신설 (kista-api)
```
src/main/java/com/kista/adapter/out/sse/TradeSseEmitterRegistry.java
src/main/java/com/kista/adapter/in/web/TradeStreamController.java
src/main/java/com/kista/adapter/in/web/dto/TradeEventDto.java
src/main/java/com/kista/adapter/in/web/dto/PortfolioSummaryResponse.java
```

### 수정 (kista-api)
```
src/main/java/com/kista/domain/port/out/RealtimeNotificationPort.java  # notifyTrade() 추가
src/main/java/com/kista/adapter/out/sse/SseEmitterRegistry.java        # trade Map 분리
src/main/java/com/kista/application/service/TradingService.java         # notifyTrade 호출
src/main/java/com/kista/adapter/in/web/security/SecurityConfig.java     # /api/trades/stream 등록
src/main/java/com/kista/adapter/in/web/StatisticsController.java        # PortfolioSummaryResponse 적용
src/test/java/com/kista/application/service/TradingServiceTest.java     # @Mock RealtimeNotificationPort
```

---

## Task 1: globals.css 디자인 토큰 보강

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: 현재 파일 읽기**

```bash
grep -n "glass\|border-strong\|--r-sm\|--r-md\|--r-lg\|--r-xl\|dark alpha\|rose-100.*rgba" app/globals.css
```

Expected: 해당 토큰 없음 (아직 미정의)

- [ ] **Step 2: 토큰 추가**

`app/globals.css`의 `:root { ... }` 블록 끝 (기존 `--sidebar-bg` 이후)에 추가:

```css
  /* Border & radius tokens */
  --border-strong: oklch(0.86 0.018 50);
  --r-sm: 8px;
  --r-md: 12px;
  --r-lg: 16px;
  --r-xl: 22px;
  --gold: #B68A4A;
```

`.dark { ... }` 블록 끝에 추가:

```css
  /* Dark mode border & alpha rose */
  --border-strong: rgba(232, 230, 227, 0.14);
  --rose-100: rgba(214, 169, 142, 0.10);
  --rose-200: rgba(214, 169, 142, 0.18);
```

`.glass-card` utility 클래스를 globals.css 마지막에 추가:

```css
/* ── Glass Card ───────────────────────────────────────────── */
.glass-card {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(199, 123, 102, 0.22);
  border-radius: var(--r-xl);
}

.dark .glass-card {
  background: rgba(24, 22, 20, 0.82);
  border-color: rgba(199, 123, 102, 0.14);
}
```

- [ ] **Step 3: 빌드 확인**

```bash
cd /Users/phs/workspace/kista/kista-ui && npm run typecheck 2>&1 | tail -5
```

Expected: `Found 0 errors.`

- [ ] **Step 4: Commit**

```bash
cd /Users/phs/workspace/kista/kista-ui
git add app/globals.css
git commit -m "style: add glass-card utility and design token boosts (border-strong, r-sm/md/lg/xl, dark rose alpha)"
```

---

## Task 2: 신규 공통 컴포넌트 — StatusDot, KpiCard, PageHeader, GlassCard

**Files:**
- Create: `components/common/StatusDot.tsx`
- Create: `components/common/KpiCard.tsx`
- Create: `components/common/PageHeader.tsx`
- Create: `components/common/GlassCard.tsx`
- Delete: `components/common/TradingStatusIndicator.tsx`

- [ ] **Step 1: StatusDot 작성**

```tsx
// components/common/StatusDot.tsx
import { cn } from '@/lib/utils'

type Status = 'ACTIVE' | 'PAUSED' | 'PENDING' | 'UNKNOWN'

const STATUS_CONFIG: Record<Status, { dot: string; label: string; text: string }> = {
  ACTIVE:  { dot: 'bg-status-ok',   label: '운영중', text: 'text-status-ok'  },
  PAUSED:  { dot: 'bg-warn',        label: '일시중지', text: 'text-warn'     },
  PENDING: { dot: 'bg-rose-400',    label: '대기중', text: 'text-rose-400'  },
  UNKNOWN: { dot: 'bg-muted-foreground', label: '알 수 없음', text: 'text-muted-foreground' },
}

interface Props {
  status: Status
  className?: string
  hideLabel?: boolean
}

export function StatusDot({ status, className, hideLabel }: Props) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.UNKNOWN
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn('size-2 rounded-full shrink-0', cfg.dot)} />
      {!hideLabel && <span className={cn('text-xs font-medium', cfg.text)}>{cfg.label}</span>}
    </span>
  )
}
```

- [ ] **Step 2: TradingStatusIndicator 사용처 검색**

```bash
grep -rn "TradingStatusIndicator" /Users/phs/workspace/kista/kista-ui --include="*.tsx" --include="*.ts"
```

Expected: 임포트 사용 파일 목록 (보통 1~3개)

- [ ] **Step 3: 사용처 모두 StatusDot으로 교체**

각 파일에서 `TradingStatusIndicator` 임포트 → `StatusDot` 임포트, `strategyStatus` prop → `status` prop으로 교체.
예시 (AccountCard.tsx):
```tsx
// Before
import { TradingStatusIndicator } from '@/components/common/TradingStatusIndicator'
<TradingStatusIndicator strategyStatus={account.strategyStatus} />
// After
import { StatusDot } from '@/components/common/StatusDot'
<StatusDot status={account.strategyStatus as 'ACTIVE' | 'PAUSED'} />
```

- [ ] **Step 4: TradingStatusIndicator 삭제**

```bash
rm /Users/phs/workspace/kista/kista-ui/components/common/TradingStatusIndicator.tsx
```

- [ ] **Step 5: KpiCard 작성**

```tsx
// components/common/KpiCard.tsx
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface Props {
  label: string
  value: ReactNode
  sub?: ReactNode
  variant?: 'default' | 'accent'
  className?: string
}

export function KpiCard({ label, value, sub, variant = 'default', className }: Props) {
  return (
    <div
      className={cn(
        'rounded-[var(--r-lg)] p-5 flex flex-col gap-1',
        variant === 'default' && 'bg-card border border-border shadow-[var(--sh-card)]',
        variant === 'accent' && [
          'text-white',
          'bg-[linear-gradient(135deg,var(--rose-600)_0%,var(--rose-400)_100%)]',
          'shadow-[var(--sh-rose)]',
        ],
        className,
      )}
    >
      <span
        className={cn(
          'text-[11px] font-semibold tracking-widest uppercase',
          variant === 'default' ? 'text-rose-500' : 'text-white/80',
        )}
      >
        {label}
      </span>
      <div className={cn('text-2xl font-bold leading-tight', variant === 'default' ? 'text-foreground' : 'text-white')}>
        {value}
      </div>
      {sub && (
        <div className={cn('text-xs', variant === 'default' ? 'text-muted-foreground' : 'text-white/70')}>
          {sub}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: PageHeader 작성**

```tsx
// components/common/PageHeader.tsx
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface Props {
  eyebrow?: string
  title: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ eyebrow, title, actions, className }: Props) {
  return (
    <div className={cn('flex items-end justify-between gap-4 mb-8', className)}>
      <div>
        {eyebrow && (
          <p className="text-[11.5px] font-semibold tracking-[0.12em] uppercase text-rose-500 mb-1">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[26px] font-[800] leading-tight text-foreground">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
```

- [ ] **Step 7: GlassCard 작성**

```tsx
// components/common/GlassCard.tsx
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  maxWidth?: string
}

export function GlassCard({ children, className, maxWidth = '440px' }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
      <div className={cn('glass-card w-full p-8 sm:p-10', className)} style={{ maxWidth }}>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 8: 타입 체크**

```bash
cd /Users/phs/workspace/kista/kista-ui && npm run typecheck 2>&1 | tail -10
```

Expected: `Found 0 errors.`

- [ ] **Step 9: Commit**

```bash
cd /Users/phs/workspace/kista/kista-ui
git add components/common/StatusDot.tsx components/common/KpiCard.tsx \
  components/common/PageHeader.tsx components/common/GlassCard.tsx
git rm components/common/TradingStatusIndicator.tsx
git commit -m "feat: add StatusDot, KpiCard, PageHeader, GlassCard; remove TradingStatusIndicator"
```

---

## Task 3: 신규 공통 컴포넌트 — Stepper, Timeline, MobileHeader

**Files:**
- Create: `components/common/Stepper.tsx`
- Create: `components/common/Timeline.tsx`
- Create: `components/layout/MobileHeader.tsx`

- [ ] **Step 1: Stepper 작성**

```tsx
// components/common/Stepper.tsx
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepperProps {
  steps: string[]
  current: number  // 1-based
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((label, i) => {
        const idx = i + 1
        const done = idx < current
        const active = idx === current
        return (
          <div key={idx} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'size-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors',
                  done  && 'bg-rose-600 border-rose-600 text-white',
                  active && 'bg-white border-rose-600 text-rose-600',
                  !done && !active && 'bg-muted border-border text-muted-foreground',
                )}
              >
                {done ? <Check className="size-4" /> : idx}
              </div>
              <span className={cn('text-[11px] font-medium text-center leading-none',
                active ? 'text-rose-600' : done ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn('h-px flex-1 mx-2 -mt-4', done ? 'bg-rose-600' : 'bg-border')} />
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Timeline 작성**

```tsx
// components/common/Timeline.tsx
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimelineStep {
  label: string
  description?: string
  done?: boolean
}

interface TimelineProps {
  steps: TimelineStep[]
}

export function Timeline({ steps }: TimelineProps) {
  return (
    <div className="flex flex-col gap-0">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className={cn(
              'size-7 rounded-full border-2 flex items-center justify-center shrink-0',
              step.done
                ? 'bg-status-ok border-status-ok text-white'
                : 'bg-background border-border text-muted-foreground',
            )}>
              {step.done ? <Check className="size-3.5" /> : (
                <span className="text-xs font-semibold">{i + 1}</span>
              )}
            </div>
            {i < steps.length - 1 && (
              <div className={cn('w-px flex-1 my-1', step.done ? 'bg-status-ok/30' : 'bg-border')} />
            )}
          </div>
          <div className="pb-6">
            <p className={cn('text-sm font-semibold', step.done ? 'text-foreground' : 'text-muted-foreground')}>
              {step.label}
            </p>
            {step.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: MobileHeader 작성**

```tsx
// components/layout/MobileHeader.tsx
import Link from 'next/link'
import Image from 'next/image'
import type { ReactNode } from 'react'

interface Props {
  trailing?: ReactNode
}

export function MobileHeader({ trailing }: Props) {
  return (
    <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 border-b border-border" style={{ background: 'var(--sidebar-bg)' }}>
      <Link href="/dashboard" className="flex items-center gap-2.5">
        <Image src="/logo.png" alt="KISTA" width={28} height={28} className="rounded-[6px]" style={{ boxShadow: '0 2px 6px rgba(143,68,48,.22)' }} />
        <span className="font-[800] text-[17px] tracking-wide text-brand-fg">KISTA</span>
      </Link>
      {trailing && <div>{trailing}</div>}
    </header>
  )
}
```

- [ ] **Step 4: 타입 체크**

```bash
cd /Users/phs/workspace/kista/kista-ui && npm run typecheck 2>&1 | tail -5
```

Expected: `Found 0 errors.`

- [ ] **Step 5: Commit**

```bash
cd /Users/phs/workspace/kista/kista-ui
git add components/common/Stepper.tsx components/common/Timeline.tsx components/layout/MobileHeader.tsx
git commit -m "feat: add Stepper, Timeline, MobileHeader components"
```

---

## Task 4: 레이아웃 컴포넌트 재작성 — DesktopSidebar, MobileBottomNav, layout.tsx

**Files:**
- Modify: `components/layout/DesktopSidebar.tsx`
- Modify: `components/layout/MobileBottomNav.tsx`
- Modify: `app/(main)/layout.tsx`

- [ ] **Step 1: DesktopSidebar 재작성 (인라인 style 제거 + ThemeToggle 통합)**

```tsx
// components/layout/DesktopSidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { LayoutDashboard, CreditCard, BarChart2, Settings, LogOut } from 'lucide-react'
import { ThemeToggle } from '@/components/common/ThemeToggle'

const NAV_ITEMS = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/accounts',  label: '계좌 관리', icon: CreditCard },
  { href: '/statistics', label: '통계',     icon: BarChart2 },
  { href: '/settings',  label: '설정',      icon: Settings },
]

export function DesktopSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  return (
    <aside className="hidden lg:flex flex-col w-[232px] min-h-screen shrink-0 border-r border-border px-4 py-6" style={{ background: 'var(--sidebar-bg)' }}>
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5 px-2.5 pb-6">
        <Image src="/logo.png" alt="KISTA" width={32} height={32} className="rounded-[7px]" style={{ boxShadow: '0 2px 8px rgba(143,68,48,.22)' }} />
        <span className="font-[800] text-xl tracking-[1.2px] text-brand-fg">KISTA</span>
      </Link>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--r-md)] text-sm font-medium transition-colors ${
                active
                  ? 'bg-rose-50 text-rose-600'
                  : 'text-muted-foreground hover:bg-rose-50/60 hover:text-foreground'
              }`}
            >
              <Icon className="size-[18px] shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer: ThemeToggle + Logout */}
      <div className="flex flex-col gap-1 pt-4 border-t border-border">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs text-muted-foreground">테마</span>
          <ThemeToggle />
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--r-md)] text-sm font-medium text-muted-foreground hover:bg-rose-50/60 hover:text-foreground transition-colors w-full text-left"
        >
          <LogOut className="size-[18px] shrink-0" />
          로그아웃
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: MobileBottomNav 재작성 (4탭 + rose dot 활성 표시)**

```tsx
// components/layout/MobileBottomNav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CreditCard, BarChart2, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/dashboard',  label: '대시보드', icon: LayoutDashboard },
  { href: '/accounts',   label: '계좌',     icon: CreditCard },
  { href: '/statistics', label: '통계',     icon: BarChart2 },
  { href: '/settings',   label: '설정',     icon: Settings },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border flex" style={{ background: 'var(--sidebar-bg)' }}>
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link key={href} href={href} className="flex-1 flex flex-col items-center gap-1 py-2.5 relative">
            {active && (
              <span className="absolute top-1.5 left-1/2 -translate-x-1/2 size-1.5 rounded-full bg-rose-500" />
            )}
            <Icon className={cn('size-5', active ? 'text-rose-600' : 'text-muted-foreground')} />
            <span className={cn('text-[10px] font-medium', active ? 'text-rose-600' : 'text-muted-foreground')}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 3: app/(main)/layout.tsx 수정 (MobileHeader 분리 + Toaster)**

현재 `layout.tsx`의 inline header를 `MobileHeader` 컴포넌트로 교체하고 Sonner Toaster 추가:

```tsx
// app/(main)/layout.tsx
import { DesktopSidebar } from '@/components/layout/DesktopSidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { Toaster } from 'sonner'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <DesktopSidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <MobileHeader />
        <main className="flex-1 p-4 lg:p-9 pb-24 lg:pb-9">{children}</main>
        <MobileBottomNav />
      </div>
      <Toaster richColors position="top-right" />
    </div>
  )
}
```

- [ ] **Step 4: sonner 설치 확인**

```bash
cd /Users/phs/workspace/kista/kista-ui && grep '"sonner"' package.json
```

없으면: `npm install sonner`

- [ ] **Step 5: 타입 체크**

```bash
cd /Users/phs/workspace/kista/kista-ui && npm run typecheck 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
cd /Users/phs/workspace/kista/kista-ui
git add components/layout/DesktopSidebar.tsx components/layout/MobileBottomNav.tsx \
  "app/(main)/layout.tsx"
git commit -m "refactor: rewrite DesktopSidebar/MobileBottomNav (remove inline style), split MobileHeader, add Toaster"
```

---

## Task 5: 공통 컴포넌트 수정 — ProfitDisplay, ThemeToggle, StrategyBadge, AccountCard

**Files:**
- Modify: `components/common/ProfitDisplay.tsx`
- Modify: `components/common/ThemeToggle.tsx`
- Modify: `components/common/StrategyBadge.tsx`
- Modify: `components/common/AccountCard.tsx`

- [ ] **Step 1: ProfitDisplay — `full` prop 추가**

```tsx
// components/common/ProfitDisplay.tsx
import { cn } from '@/lib/utils'

interface Props {
  amount?: number
  rate?: number
  size?: 'sm' | 'md' | 'lg'
  full?: boolean  // 금액+수익률 모두 표시
  className?: string
}

export function ProfitDisplay({ amount, rate, size = 'md', full, className }: Props) {
  const isPos = (rate ?? amount ?? 0) >= 0
  const color = isPos ? 'text-pos' : 'text-neg'
  const sizeMap = { sm: 'text-sm', md: 'text-base', lg: 'text-xl font-bold' }
  const sign = isPos ? '+' : ''

  return (
    <span className={cn('inline-flex items-baseline gap-1', sizeMap[size], color, className)}>
      {full && amount !== undefined && (
        <span>{sign}{amount.toLocaleString('ko-KR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })}</span>
      )}
      {rate !== undefined && (
        <span className={full ? 'text-[0.85em] opacity-80' : ''}>
          {sign}{rate.toFixed(2)}%
        </span>
      )}
      {!full && amount !== undefined && rate === undefined && (
        <span>{sign}{amount.toLocaleString()}</span>
      )}
    </span>
  )
}
```

- [ ] **Step 2: ThemeToggle — sun/moon 트랙형**

```tsx
// components/common/ThemeToggle.tsx
'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="테마 전환"
      className={cn(
        'relative flex items-center w-11 h-6 rounded-full border border-border transition-colors',
        isDark ? 'bg-rose-600' : 'bg-muted',
        className,
      )}
    >
      <span className={cn(
        'absolute size-4 rounded-full bg-white shadow flex items-center justify-center transition-transform',
        isDark ? 'translate-x-5.5' : 'translate-x-0.5',
      )}>
        {isDark
          ? <Moon className="size-2.5 text-rose-600" />
          : <Sun className="size-2.5 text-amber-500" />
        }
      </span>
    </button>
  )
}
```

- [ ] **Step 3: StrategyBadge — height 22, radius 999**

현재 `StrategyBadge.tsx`를 읽고 `rounded-full h-[22px] text-[11px]` 로 확인/수정:

```tsx
// components/common/StrategyBadge.tsx
import { cn } from '@/lib/utils'

type Strategy = 'INFINITE' | 'PRIVACY'

const CONFIG = {
  INFINITE: { label: '인피니트', bg: 'bg-rose-50', text: 'text-rose-600' },
  PRIVACY:  { label: '프라이버시', bg: 'bg-muted', text: 'text-muted-foreground' },
}

export function StrategyBadge({ strategy, className }: { strategy: Strategy; className?: string }) {
  const { label, bg, text } = CONFIG[strategy] ?? CONFIG.INFINITE
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 h-[22px] rounded-full text-[11px] font-semibold',
      bg, text, className,
    )}>
      {label}
    </span>
  )
}
```

- [ ] **Step 4: AccountCard — group hover: 패턴 (인라인 style 제거)**

```tsx
// components/common/AccountCard.tsx
'use client'

import Link from 'next/link'
import { StrategyBadge } from './StrategyBadge'
import { StatusDot } from './StatusDot'
import { ProfitDisplay } from './ProfitDisplay'
import type { Account } from '@/types/account'

interface Props {
  account: Account
}

export function AccountCard({ account }: Props) {
  return (
    <Link
      href={`/accounts/${account.id}`}
      className="group block rounded-[var(--r-lg)] border border-border bg-card p-5 shadow-[var(--sh-card)] hover:border-rose-300 hover:shadow-[var(--sh-rose)] transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-semibold text-base text-foreground leading-snug">{account.nickname}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{account.accountNoMasked}</p>
        </div>
        <StatusDot status={account.strategyStatus as 'ACTIVE' | 'PAUSED'} />
      </div>
      <div className="flex items-center gap-2 mb-3">
        <StrategyBadge strategy={account.strategyType} />
        <span className="text-xs text-muted-foreground">{account.ticker}</span>
      </div>
      {account.totalProfit !== undefined && (
        <div className="pt-3 border-t border-border">
          <p className="text-[11px] text-muted-foreground mb-0.5">누적 수익</p>
          <ProfitDisplay amount={account.totalProfit} rate={account.totalProfitRate} size="lg" full />
        </div>
      )}
    </Link>
  )
}
```

- [ ] **Step 5: 타입 체크**

```bash
cd /Users/phs/workspace/kista/kista-ui && npm run typecheck 2>&1 | tail -10
```

- [ ] **Step 6: Commit**

```bash
cd /Users/phs/workspace/kista/kista-ui
git add components/common/ProfitDisplay.tsx components/common/ThemeToggle.tsx \
  components/common/StrategyBadge.tsx components/common/AccountCard.tsx
git commit -m "refactor: update ProfitDisplay(full prop), ThemeToggle(track), StrategyBadge(h-22), AccountCard(group hover)"
```

---

## Task 6: 인증 화면 정밀화 — Login, Pending, Rejected

**Files:**
- Modify: `app/(auth)/page.tsx`
- Modify: `app/pending/page.tsx`
- Modify: `app/rejected/page.tsx`

- [ ] **Step 1: Login 페이지 — GlassCard + 카카오 버튼**

```tsx
// app/(auth)/page.tsx
import Image from 'next/image'
import Link from 'next/link'
import { GlassCard } from '@/components/common/GlassCard'

export default function LoginPage() {
  const kakaoLoginUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/auth/callback`)}&response_type=code`

  return (
    <GlassCard>
      {/* Logo + Wordmark */}
      <div className="flex flex-col items-center gap-3 mb-10">
        <Image src="/logo.png" alt="KISTA" width={56} height={56} className="rounded-[12px]" style={{ boxShadow: '0 4px 16px rgba(143,68,48,.25)' }} />
        <h1 className="text-[32px] font-[800] tracking-[2px] bg-[linear-gradient(135deg,var(--rose-600)_0%,var(--rose-400)_100%)] bg-clip-text text-transparent">
          KISTA
        </h1>
        <p className="text-sm text-muted-foreground text-center leading-snug">
          한국투자증권 자동 분할매매<br />초대제 서비스
        </p>
      </div>

      {/* 카카오 로그인 */}
      <Link
        href={kakaoLoginUrl}
        className="flex items-center justify-center gap-3 w-full h-12 rounded-[var(--r-md)] font-semibold text-sm transition-opacity hover:opacity-90"
        style={{ background: '#FEE500', color: '#191919' }}
      >
        <svg width="18" height="17" viewBox="0 0 18 17" fill="none">
          <path fillRule="evenodd" clipRule="evenodd" d="M9 0C4.02944 0 0 3.13144 0 6.99456C0 9.35487 1.44904 11.4313 3.67192 12.6938L2.74892 16.3098C2.67449 16.5968 2.99653 16.8269 3.24836 16.6619L7.57148 13.9386C8.03835 13.9785 8.51551 13.9988 9 13.9988C13.9706 13.9988 18 10.8674 18 7.00427C18 3.13144 13.9706 0 9 0Z" fill="#191919"/>
        </svg>
        카카오로 시작하기
      </Link>

      <p className="text-[11px] text-muted-foreground text-center mt-6">
        초대를 받은 사용자만 가입할 수 있습니다
      </p>
    </GlassCard>
  )
}
```

- [ ] **Step 2: Pending 페이지 — GlassCard + Timeline**

현재 `app/pending/page.tsx`를 읽고 ReapplyButton 컴포넌트 임포트 유지하면서 레이아웃 교체:

```tsx
// app/pending/page.tsx
'use client'

import Image from 'next/image'
import { Clock } from 'lucide-react'
import { GlassCard } from '@/components/common/GlassCard'
import { Timeline } from '@/components/common/Timeline'
import { ReapplyButton } from './ReapplyButton'  // 기존 유지

const STEPS = [
  { label: '신청 완료', description: '관리자 검토 대기 중', done: true },
  { label: '관리자 검토', description: '영업일 기준 1-2일 소요', done: false },
  { label: '계좌 연동', description: 'KIS API 자격증명 입력', done: false },
  { label: '운영 시작', description: '자동 매매 활성화', done: false },
]

export default function PendingPage() {
  return (
    <GlassCard maxWidth="480px">
      <div className="flex flex-col items-center gap-2 mb-8">
        <Image src="/logo.png" alt="KISTA" width={44} height={44} className="rounded-[10px] mb-2" />
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-warn-bg">
          <Clock className="size-3.5 text-warn" />
          <span className="text-xs font-semibold text-warn">검토 대기중</span>
        </div>
        <h1 className="text-xl font-bold text-foreground mt-1">승인 대기 중입니다</h1>
        <p className="text-sm text-muted-foreground text-center">
          관리자가 신청을 검토하고 있습니다.<br />승인 후 자동으로 이동됩니다.
        </p>
      </div>

      <Timeline steps={STEPS} />

      <div className="mt-6 pt-6 border-t border-border">
        <ReapplyButton />
      </div>
    </GlassCard>
  )
}
```

- [ ] **Step 3: Rejected 페이지 — GlassCard + 반려사유**

현재 `app/rejected/page.tsx`를 읽고 ReapplyButton 유지하면서 레이아웃 교체:

```tsx
// app/rejected/page.tsx
'use client'

import Image from 'next/image'
import { XCircle } from 'lucide-react'
import { GlassCard } from '@/components/common/GlassCard'
import { ReapplyButton } from '../pending/ReapplyButton'  // 경로 확인 필요

export default function RejectedPage() {
  return (
    <GlassCard maxWidth="480px">
      <div className="flex flex-col items-center gap-2 mb-8">
        <Image src="/logo.png" alt="KISTA" width={44} height={44} className="rounded-[10px] mb-2" />
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-neg/10">
          <XCircle className="size-3.5 text-neg" />
          <span className="text-xs font-semibold text-neg">신청 반려</span>
        </div>
        <h1 className="text-xl font-bold text-foreground mt-1">신청이 반려되었습니다</h1>
        <p className="text-sm text-muted-foreground text-center">
          관리자가 신청을 검토한 결과<br />현재 서비스 이용이 어렵습니다.
        </p>
      </div>

      <div className="rounded-[var(--r-md)] bg-muted p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-1">반려 사유</p>
        <p className="text-sm text-foreground">초대 코드가 확인되지 않아 승인이 어렵습니다.</p>
      </div>

      <div className="mt-6">
        <ReapplyButton />
      </div>
    </GlassCard>
  )
}
```

**주의:** `ReapplyButton` import 경로가 기존과 다를 수 있음 — 실제 파일 위치 확인 후 조정.

- [ ] **Step 4: 타입 체크**

```bash
cd /Users/phs/workspace/kista/kista-ui && npm run typecheck 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
cd /Users/phs/workspace/kista/kista-ui
git add "app/(auth)/page.tsx" "app/pending/page.tsx" "app/rejected/page.tsx"
git commit -m "feat: redesign Login/Pending/Rejected with GlassCard and Timeline"
```

---

## Task 7: Dashboard 화면 정밀화

**Files:**
- Modify: `app/(main)/dashboard/page.tsx`

- [ ] **Step 1: 현재 Dashboard 페이지 읽기**

```bash
cat /Users/phs/workspace/kista/kista-ui/app/\(main\)/dashboard/page.tsx
```

- [ ] **Step 2: Dashboard 재작성 (빈 상태 + KpiCard 그리드)**

```tsx
// app/(main)/dashboard/page.tsx
import { getAuthToken } from '@/lib/auth/token'
import { getAccounts } from '@/lib/api/accounts'
import { PageHeader } from '@/components/common/PageHeader'
import { KpiCard } from '@/components/common/KpiCard'
import { AccountCard } from '@/components/common/AccountCard'
import { ProfitDisplay } from '@/components/common/ProfitDisplay'
import Link from 'next/link'
import { Plus, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function DashboardPage() {
  const token = await getAuthToken()
  const accounts = token ? await getAccounts(token) : []

  if (accounts.length === 0) {
    return (
      <div>
        <PageHeader eyebrow="대시보드" title="환영합니다" />
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="size-16 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-6">
            <BarChart2 className="size-8 text-rose-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">아직 연결된 계좌가 없습니다</h2>
          <p className="text-sm text-muted-foreground mb-8">
            KIS 계좌를 연결하면 자동 분할매매가 시작됩니다.
          </p>
          <Link
            href="/accounts/new"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--r-md)] bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 transition-colors"
          >
            <Plus className="size-4" />
            첫 계좌 연결하기
          </Link>
        </div>
      </div>
    )
  }

  // KPI 집계
  const totalAssets = accounts.reduce((s, a) => s + (a.totalAssets ?? 0), 0)
  const totalProfit = accounts.reduce((s, a) => s + (a.totalProfit ?? 0), 0)
  const totalProfitRate = totalAssets > 0 ? (totalProfit / (totalAssets - totalProfit)) * 100 : 0
  const activeCount = accounts.filter(a => a.strategyStatus === 'ACTIVE').length

  return (
    <div>
      <PageHeader
        eyebrow="대시보드"
        title="내 계좌 현황"
        actions={
          <Link
            href="/accounts/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--r-md)] bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors"
          >
            <Plus className="size-4" />
            계좌 추가
          </Link>
        }
      />

      {/* KPI 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <KpiCard
          variant="accent"
          label="총 평가 금액"
          value={`$${totalAssets.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
        />
        <KpiCard
          label="누적 실현 손익"
          value={<ProfitDisplay amount={totalProfit} rate={totalProfitRate} full size="lg" />}
        />
        <KpiCard
          label="운영중 계좌"
          value={`${activeCount} / ${accounts.length}`}
          sub="계좌"
        />
      </div>

      {/* 계좌 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {accounts.map(account => (
          <AccountCard key={account.id} account={account} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 타입 확인**

```bash
cd /Users/phs/workspace/kista/kista-ui && npm run typecheck 2>&1 | grep -i "error\|warning" | head -20
```

`Account` 타입에 `totalAssets`, `totalProfit`, `totalProfitRate` 필드가 없으면 `types/account.ts`에 선택적으로 추가:
```ts
totalAssets?: number
totalProfit?: number
totalProfitRate?: number
```

- [ ] **Step 4: Commit**

```bash
cd /Users/phs/workspace/kista/kista-ui
git add "app/(main)/dashboard/page.tsx"
git commit -m "feat: redesign dashboard with KpiCard grid and empty-state welcome"
```

---

## Task 8: Statistics 화면 정밀화

**Files:**
- Modify: `app/(main)/statistics/page.tsx`

- [ ] **Step 1: 현재 Statistics 페이지 읽기**

```bash
wc -l /Users/phs/workspace/kista/kista-ui/app/\(main\)/statistics/page.tsx
cat /Users/phs/workspace/kista/kista-ui/app/\(main\)/statistics/page.tsx | head -60
```

- [ ] **Step 2: Statistics 화면 재작성 (7-KPI + 계좌별 손익 2col)**

이 페이지는 현재 구현이 상당하므로, 디자인 토큰·레이아웃 클래스만 보강:
- `PageHeader` 추가 (eyebrow="통계", title="포트폴리오 분석")
- KPI 섹션: 기존 KpiCard 없이 inline인 부분 → `KpiCard` 컴포넌트로 교체
- 계좌별 손익: 2col 그리드 (`grid-cols-1 lg:grid-cols-2 gap-4`)
- 전체 거래 테이블: 헤더 `text-[11px] uppercase tracking-widest text-rose-500`

수정 방향은 실제 파일 내용 확인 후 반영. 공통 원칙:
1. 모든 `style={{ gridTemplateColumns }}` → `globals.css` 커스텀 클래스로
2. `class="bg-[...]"` 임시 색상 → 디자인 토큰(`bg-card`, `bg-muted`, `text-muted-foreground`)
3. PageHeader + KpiCard 적용

- [ ] **Step 3: Commit**

```bash
cd /Users/phs/workspace/kista/kista-ui
git add "app/(main)/statistics/page.tsx"
git commit -m "feat: redesign statistics with PageHeader, KpiCard, 2-col account profit grid"
```

---

## Task 9: Settings 화면 정밀화

**Files:**
- Modify: `app/(main)/settings/page.tsx`

- [ ] **Step 1: 현재 Settings 페이지 읽기**

```bash
cat /Users/phs/workspace/kista/kista-ui/app/\(main\)/settings/page.tsx
```

- [ ] **Step 2: Settings sticky nav + Danger zone 추가**

디자인 명세:
- `sticky` nav 200px (데스크탑): 섹션 앵커 링크 (프로필, 알림, 보안, 환경설정, 계정)
- 섹션들: `<section id="profile">`, `<section id="notifications">`, `<section id="security">`, `<section id="preferences">`, `<section id="danger">`
- Danger zone: 회원탈퇴 버튼 disabled + tooltip "곧 제공됩니다 (Phase 2)"
- 환경설정 섹션: ThemeToggle 배치

```tsx
// app/(main)/settings/page.tsx — 핵심 구조
export default async function SettingsPage() {
  // ... 기존 data fetch 유지
  return (
    <div>
      <PageHeader eyebrow="설정" title="계정 설정" />
      <div className="flex gap-8">
        {/* sticky nav (desktop only) */}
        <nav className="hidden lg:block w-[200px] shrink-0">
          <div className="sticky top-24 flex flex-col gap-1">
            {SECTIONS.map(s => (
              <a key={s.id} href={`#${s.id}`} className="text-sm text-muted-foreground hover:text-foreground py-1.5 px-3 rounded-[var(--r-sm)] hover:bg-rose-50 transition-colors">
                {s.label}
              </a>
            ))}
          </div>
        </nav>

        {/* 섹션들 */}
        <div className="flex-1 flex flex-col gap-8 min-w-0">
          {/* ... 기존 섹션 유지 + Danger zone 추가 */}
          <section id="danger" className="rounded-[var(--r-lg)] border border-neg/30 p-6">
            <h2 className="font-bold text-base text-neg mb-1">위험 구역</h2>
            <p className="text-sm text-muted-foreground mb-4">되돌릴 수 없는 작업입니다.</p>
            <button
              disabled
              title="곧 제공됩니다 (Phase 2)"
              className="px-4 py-2 rounded-[var(--r-md)] border border-neg/50 text-neg text-sm font-semibold opacity-40 cursor-not-allowed"
            >
              회원 탈퇴
            </button>
            <p className="text-[11px] text-muted-foreground mt-2">곧 제공됩니다</p>
          </section>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 타입 체크 + Commit**

```bash
cd /Users/phs/workspace/kista/kista-ui && npm run typecheck 2>&1 | tail -5
git add "app/(main)/settings/page.tsx"
git commit -m "feat: redesign settings with sticky nav, PageHeader, Danger zone (disabled)"
```

---

## Task 10: NewAccount 4단계 스테퍼

**Files:**
- Create: `components/accounts/NewAccountStepper.tsx`
- Create: `components/accounts/steps/ApiStep.tsx`
- Create: `components/accounts/steps/AccountInfoStep.tsx`
- Create: `components/accounts/steps/StrategyStep.tsx`
- Create: `components/accounts/steps/ConfirmStep.tsx`
- Modify: `app/(main)/accounts/new/page.tsx`

- [ ] **Step 1: 타입 정의 (NewAccountStepper.tsx 내부)**

```tsx
// components/accounts/NewAccountStepper.tsx
'use client'

import { useReducer } from 'react'
import { Stepper } from '@/components/common/Stepper'
import { ApiStep } from './steps/ApiStep'
import { AccountInfoStep } from './steps/AccountInfoStep'
import { StrategyStep } from './steps/StrategyStep'
import { ConfirmStep } from './steps/ConfirmStep'

export type StepData = {
  apiKey: string
  apiSecret: string
  accountNo: string       // 8자리
  kisAccountType: string  // '01'
  nickname: string
  strategyType: 'INFINITE' | 'PRIVACY' | ''
  ticker: 'TQQQ' | 'SOXL' | 'USD' | ''
}

type State = { step: 1 | 2 | 3 | 4; data: StepData }
type Action =
  | { type: 'NEXT'; payload: Partial<StepData> }
  | { type: 'BACK' }

const initialState: State = {
  step: 1,
  data: { apiKey: '', apiSecret: '', accountNo: '', kisAccountType: '01', nickname: '', strategyType: '', ticker: '' },
}

function reducer(state: State, action: Action): State {
  if (action.type === 'BACK') {
    return { ...state, step: Math.max(1, state.step - 1) as 1 | 2 | 3 | 4 }
  }
  const newData = { ...state.data, ...action.payload }
  return { step: Math.min(4, state.step + 1) as 1 | 2 | 3 | 4, data: newData }
}

const STEPS = ['API 키', '계좌 정보', '전략 선택', '확인']

export function NewAccountStepper() {
  const [{ step, data }, dispatch] = useReducer(reducer, initialState)
  const next = (payload: Partial<StepData>) => dispatch({ type: 'NEXT', payload })
  const back = () => dispatch({ type: 'BACK' })

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <Stepper steps={STEPS} current={step} />
      </div>
      {step === 1 && <ApiStep data={data} onNext={next} />}
      {step === 2 && <AccountInfoStep data={data} onNext={next} onBack={back} />}
      {step === 3 && <StrategyStep data={data} onNext={next} onBack={back} />}
      {step === 4 && <ConfirmStep data={data} onBack={back} />}
    </div>
  )
}
```

- [ ] **Step 2: ApiStep**

```tsx
// components/accounts/steps/ApiStep.tsx
'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { StepData } from '../NewAccountStepper'

interface Props {
  data: StepData
  onNext: (payload: Partial<StepData>) => void
}

export function ApiStep({ data, onNext }: Props) {
  const [apiKey, setApiKey] = useState(data.apiKey)
  const [apiSecret, setApiSecret] = useState(data.apiSecret)
  const [showSecret, setShowSecret] = useState(false)

  const valid = apiKey.length >= 10 && apiSecret.length >= 10

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold mb-1">KIS API 키 입력</h2>
        <p className="text-sm text-muted-foreground">한국투자증권 Open API 자격증명을 입력하세요.</p>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-semibold mb-1.5 block">App Key</label>
          <input
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="발급받은 App Key"
            className="w-full px-3 py-2.5 rounded-[var(--r-md)] border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>
        <div>
          <label className="text-sm font-semibold mb-1.5 block">App Secret</label>
          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'}
              value={apiSecret}
              onChange={e => setApiSecret(e.target.value)}
              placeholder="발급받은 App Secret"
              className="w-full px-3 py-2.5 pr-10 rounded-[var(--r-md)] border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
            <button type="button" onClick={() => setShowSecret(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
      </div>

      <button
        disabled={!valid}
        onClick={() => onNext({ apiKey, apiSecret })}
        className="w-full h-11 rounded-[var(--r-md)] bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        다음
      </button>
    </div>
  )
}
```

- [ ] **Step 3: AccountInfoStep**

```tsx
// components/accounts/steps/AccountInfoStep.tsx
'use client'

import { useState } from 'react'
import type { StepData } from '../NewAccountStepper'

interface Props {
  data: StepData
  onNext: (payload: Partial<StepData>) => void
  onBack: () => void
}

export function AccountInfoStep({ data, onNext, onBack }: Props) {
  const [nickname, setNickname] = useState(data.nickname)
  const [accountNo, setAccountNo] = useState(data.accountNo)

  const valid = nickname.trim().length >= 1 && /^\d{8}$/.test(accountNo)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold mb-1">계좌 정보</h2>
        <p className="text-sm text-muted-foreground">계좌 별칭과 계좌번호를 입력하세요.</p>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-semibold mb-1.5 block">계좌 별칭</label>
          <input
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="예: 메인 계좌"
            className="w-full px-3 py-2.5 rounded-[var(--r-md)] border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>
        <div>
          <label className="text-sm font-semibold mb-1.5 block">계좌번호 (8자리)</label>
          <div className="flex items-center gap-2">
            <input
              value={accountNo}
              onChange={e => setAccountNo(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="74420614"
              maxLength={8}
              className="flex-1 px-3 py-2.5 rounded-[var(--r-md)] border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
            <span className="text-muted-foreground text-sm font-mono">- 01</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">상품 코드(01)는 자동 설정됩니다</p>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 h-11 rounded-[var(--r-md)] border border-border text-sm font-semibold hover:bg-muted transition-colors">
          이전
        </button>
        <button
          disabled={!valid}
          onClick={() => onNext({ nickname: nickname.trim(), accountNo, kisAccountType: '01' })}
          className="flex-1 h-11 rounded-[var(--r-md)] bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          다음
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: StrategyStep**

```tsx
// components/accounts/steps/StrategyStep.tsx
'use client'

import { useState } from 'react'
import type { StepData } from '../NewAccountStepper'

interface Props {
  data: StepData
  onNext: (payload: Partial<StepData>) => void
  onBack: () => void
}

const STRATEGIES = [
  {
    id: 'INFINITE' as const,
    name: '인피니트',
    desc: '무한매수법 — TQQQ/SOXL 분할매매',
    tickers: ['TQQQ', 'SOXL'] as const,
  },
  {
    id: 'PRIVACY' as const,
    name: '프라이버시',
    desc: 'SOXL 고정 분할매매 (전략 노출 최소화)',
    tickers: ['SOXL'] as const,
  },
]

export function StrategyStep({ data, onNext, onBack }: Props) {
  const [strategyType, setStrategyType] = useState<'INFINITE' | 'PRIVACY' | ''>(data.strategyType)
  const [ticker, setTicker] = useState<'TQQQ' | 'SOXL' | 'USD' | ''>(data.ticker)

  const selected = STRATEGIES.find(s => s.id === strategyType)
  const valid = !!strategyType && (strategyType === 'PRIVACY' || !!ticker)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold mb-1">전략 선택</h2>
        <p className="text-sm text-muted-foreground">운영할 매매 전략을 선택하세요.</p>
      </div>

      <div className="flex flex-col gap-3">
        {STRATEGIES.map(s => (
          <button
            key={s.id}
            onClick={() => { setStrategyType(s.id); if (s.id === 'PRIVACY') setTicker('SOXL') }}
            className={`w-full text-left p-4 rounded-[var(--r-lg)] border-2 transition-colors ${
              strategyType === s.id ? 'border-rose-500 bg-rose-50' : 'border-border bg-card hover:border-rose-300'
            }`}
          >
            <p className="font-semibold text-sm">{s.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
          </button>
        ))}
      </div>

      {strategyType === 'INFINITE' && (
        <div>
          <p className="text-sm font-semibold mb-2">종목 선택</p>
          <div className="flex gap-2">
            {['TQQQ', 'SOXL'].map(t => (
              <button
                key={t}
                onClick={() => setTicker(t as 'TQQQ' | 'SOXL')}
                className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-colors ${
                  ticker === t ? 'border-rose-500 bg-rose-50 text-rose-600' : 'border-border text-muted-foreground hover:border-rose-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 h-11 rounded-[var(--r-md)] border border-border text-sm font-semibold hover:bg-muted transition-colors">
          이전
        </button>
        <button
          disabled={!valid}
          onClick={() => onNext({ strategyType, ticker: strategyType === 'PRIVACY' ? 'SOXL' : ticker })}
          className="flex-1 h-11 rounded-[var(--r-md)] bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          다음
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: ConfirmStep**

```tsx
// components/accounts/steps/ConfirmStep.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createAccount } from '@/lib/api/accounts'
import { StrategyBadge } from '@/components/common/StrategyBadge'
import type { StepData } from '../NewAccountStepper'

interface Props {
  data: StepData
  onBack: () => void
}

export function ConfirmStep({ data, onBack }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      await createAccount({
        nickname: data.nickname,
        kisAppKey: data.apiKey,
        kisSecretKey: data.apiSecret,
        accountNo: data.accountNo,
        kisAccountType: data.kisAccountType,
        strategyType: data.strategyType as 'INFINITE' | 'PRIVACY',
        ticker: data.ticker as 'TQQQ' | 'SOXL',
      })
      router.push('/dashboard')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '계좌 연결에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const rows = [
    { label: '별칭', value: data.nickname },
    { label: '계좌번호', value: `${data.accountNo}-${data.kisAccountType}` },
    { label: '전략', value: <StrategyBadge strategy={data.strategyType as 'INFINITE' | 'PRIVACY'} /> },
    { label: '종목', value: data.ticker },
    { label: 'API Key', value: `${data.apiKey.slice(0, 6)}...` },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold mb-1">입력 확인</h2>
        <p className="text-sm text-muted-foreground">아래 정보로 계좌를 연결합니다.</p>
      </div>

      <div className="rounded-[var(--r-lg)] border border-border bg-card divide-y divide-border">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-semibold">{value}</span>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-neg">{error}</p>}

      <div className="flex gap-3">
        <button onClick={onBack} disabled={loading} className="flex-1 h-11 rounded-[var(--r-md)] border border-border text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-40">
          이전
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 h-11 rounded-[var(--r-md)] bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 disabled:opacity-60 transition-colors"
        >
          {loading ? '연결 중...' : '계좌 연결'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: page.tsx 업데이트**

```tsx
// app/(main)/accounts/new/page.tsx
import { PageHeader } from '@/components/common/PageHeader'
import { NewAccountStepper } from '@/components/accounts/NewAccountStepper'

export default function NewAccountPage() {
  return (
    <div>
      <PageHeader eyebrow="계좌 관리" title="새 계좌 연결" />
      <NewAccountStepper />
    </div>
  )
}
```

- [ ] **Step 7: 타입 체크**

```bash
cd /Users/phs/workspace/kista/kista-ui && npm run typecheck 2>&1 | tail -15
```

`createAccount` 파라미터 타입 오류 시 `lib/api/accounts.ts` 확인 후 맞는 필드명 사용.

- [ ] **Step 8: Commit**

```bash
cd /Users/phs/workspace/kista/kista-ui
mkdir -p components/accounts/steps
git add components/accounts/NewAccountStepper.tsx \
  components/accounts/steps/ApiStep.tsx \
  components/accounts/steps/AccountInfoStep.tsx \
  components/accounts/steps/StrategyStep.tsx \
  components/accounts/steps/ConfirmStep.tsx \
  "app/(main)/accounts/new/page.tsx"
git commit -m "feat: NewAccount 4-step stepper with useReducer state machine"
```

---

## Task 11: AccountEdit + DeleteAccountDialog

**Files:**
- Create: `components/accounts/DeleteAccountDialog.tsx`
- Modify: `app/(main)/accounts/[id]/edit/page.tsx`

- [ ] **Step 1: DeleteAccountDialog 작성 (type-to-confirm 패턴)**

```tsx
// components/accounts/DeleteAccountDialog.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteAccount } from '@/lib/api/accounts'

interface Props {
  accountId: string
  nickname: string
  onClose: () => void
}

export function DeleteAccountDialog({ accountId, nickname, onClose }: Props) {
  const router = useRouter()
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canDelete = confirm === nickname

  async function handleDelete() {
    setLoading(true)
    setError('')
    try {
      await deleteAccount(accountId)
      router.push('/dashboard')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '삭제에 실패했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-card rounded-[var(--r-xl)] border border-border p-6 shadow-[var(--sh-pop)]">
        <h2 className="font-bold text-lg text-neg mb-1">계좌 삭제</h2>
        <p className="text-sm text-muted-foreground mb-5">
          삭제하면 모든 거래 내역이 함께 삭제됩니다. 되돌릴 수 없습니다.
        </p>
        <p className="text-sm mb-2">
          계속하려면 계좌 별칭 <strong className="text-foreground">{nickname}</strong>을 입력하세요.
        </p>
        <input
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder={nickname}
          className="w-full px-3 py-2.5 rounded-[var(--r-md)] border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-neg mb-4"
        />
        {error && <p className="text-sm text-neg mb-3">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading} className="flex-1 h-10 rounded-[var(--r-md)] border border-border text-sm font-semibold hover:bg-muted transition-colors">
            취소
          </button>
          <button
            disabled={!canDelete || loading}
            onClick={handleDelete}
            className="flex-1 h-10 rounded-[var(--r-md)] bg-neg text-white text-sm font-semibold hover:bg-neg/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: AccountEdit 페이지에 DeleteAccountDialog 연결**

현재 edit page 읽기:
```bash
cat /Users/phs/workspace/kista/kista-ui/app/\(main\)/accounts/\[id\]/edit/page.tsx
```

`'use client'` 선언 + `useState`로 `showDelete` 토글 + PageHeader + DeleteAccountDialog:
```tsx
// edit/page.tsx 핵심 추가 부분 (기존 AccountEditForm 유지)
const [showDelete, setShowDelete] = useState(false)
// PageHeader actions에 삭제 버튼 추가
// showDelete && <DeleteAccountDialog ... />
```

- [ ] **Step 3: 타입 체크 + Commit**

```bash
cd /Users/phs/workspace/kista/kista-ui && npm run typecheck 2>&1 | tail -10
git add components/accounts/DeleteAccountDialog.tsx "app/(main)/accounts/[id]/edit/page.tsx"
git commit -m "feat: add DeleteAccountDialog with type-to-confirm pattern"
```

---

## Task 12: kista-api — Trade SSE 백엔드 신설

**Files (kista-api):**
- Create: `src/main/java/com/kista/adapter/out/sse/TradeSseEmitterRegistry.java`
- Create: `src/main/java/com/kista/adapter/in/web/TradeStreamController.java`
- Create: `src/main/java/com/kista/adapter/in/web/dto/TradeEventDto.java`
- Modify: `src/main/java/com/kista/domain/port/out/RealtimeNotificationPort.java`
- Modify: `src/main/java/com/kista/adapter/out/sse/SseEmitterRegistry.java`
- Modify: `src/main/java/com/kista/application/service/TradingService.java`
- Modify: `src/main/java/com/kista/adapter/in/web/security/SecurityConfig.java`
- Modify: `src/test/java/com/kista/application/service/TradingServiceTest.java`

- [ ] **Step 1: TradeEventDto 신설**

```java
// adapter/in/web/dto/TradeEventDto.java
package com.kista.adapter.in.web.dto;

import java.time.Instant;
import java.util.UUID;

public record TradeEventDto(
    String kind,            // BUY | SELL | INFO | FAIL
    String ticker,
    Integer qty,
    Double price,
    Double amount,
    Instant time,
    String accountNickname,
    String message
) {
    public static TradeEventDto buy(String ticker, int qty, double price, double amount, String nickname) {
        return new TradeEventDto("BUY", ticker, qty, price, amount, Instant.now(), nickname, null);
    }

    public static TradeEventDto sell(String ticker, int qty, double price, double amount, String nickname) {
        return new TradeEventDto("SELL", ticker, qty, price, amount, Instant.now(), nickname, null);
    }

    public static TradeEventDto fail(String ticker, String message, String nickname) {
        return new TradeEventDto("FAIL", ticker, null, null, null, Instant.now(), nickname, message);
    }
}
```

- [ ] **Step 2: RealtimeNotificationPort에 notifyTrade 추가**

```java
// domain/port/out/RealtimeNotificationPort.java
package com.kista.domain.port.out;

import com.kista.adapter.in.web.dto.TradeEventDto;
import com.kista.domain.model.UserStatus;
import java.util.UUID;

public interface RealtimeNotificationPort {
    void notifyStatusChange(UUID userId, UserStatus status);
    void notifyTrade(UUID userId, TradeEventDto event);  // 추가
}
```

**주의:** ArchUnit 규칙 — `domain.port.out`이 `adapter.in.web.dto`를 참조하면 레이어 위반 가능. 대신 `TradeEventDto`를 `domain/model/` 또는 `application/` 패키지로 이동, 또는 domain 전용 record 정의:

```java
// domain/model/TradeEvent.java (대안)
package com.kista.domain.model;

import java.time.Instant;

public record TradeEvent(
    String kind, String ticker, Integer qty, Double price,
    Double amount, Instant time, String accountNickname, String message
) {}
```

그리고 Port 시그니처: `void notifyTrade(UUID userId, TradeEvent event);`
`TradeEventDto`는 Controller 응답용으로만 사용.

- [ ] **Step 3: ArchUnit 확인**

```bash
cd /Users/phs/workspace/kista/kista-api
./gradlew test --tests 'com.kista.architecture.*' 2>&1 | tail -20
```

Expected: BUILD SUCCESS (실패 시 TradeEvent를 domain 패키지로 이동)

- [ ] **Step 4: TradeSseEmitterRegistry 신설**

```java
// adapter/out/sse/TradeSseEmitterRegistry.java
package com.kista.adapter.out.sse;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kista.domain.model.TradeEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Component
@RequiredArgsConstructor
public class TradeSseEmitterRegistry {

    private final Map<UUID, List<SseEmitter>> emitters = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;

    // 30분 timeout (매매 시간 커버)
    public SseEmitter connect(UUID userId) {
        SseEmitter emitter = new SseEmitter(30 * 60 * 1000L);
        emitters.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        Runnable cleanup = () -> emitters.getOrDefault(userId, List.of()).remove(emitter);
        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(e -> cleanup.run());

        // 연결 확인 ping
        try {
            emitter.send(SseEmitter.event().name("ping").data("connected"));
        } catch (IOException e) {
            log.warn("Trade SSE initial ping failed userId={}", userId);
        }
        return emitter;
    }

    public void send(UUID userId, TradeEvent event) {
        List<SseEmitter> userEmitters = emitters.get(userId);
        if (userEmitters == null || userEmitters.isEmpty()) return;

        String payload;
        try {
            payload = objectMapper.writeValueAsString(event);
        } catch (Exception e) {
            log.error("Trade SSE serialize error", e);
            return;
        }

        String finalPayload = payload;
        userEmitters.removeIf(emitter -> {
            try {
                emitter.send(SseEmitter.event().name("trade").data(finalPayload));
                return false;
            } catch (IOException ex) {
                return true; // 실패한 emitter 제거
            }
        });
    }
}
```

- [ ] **Step 5: SseEmitterRegistry에 notifyTrade 위임 구현**

현재 `SseEmitterRegistry.java`를 읽고 `RealtimeNotificationPort`의 `notifyTrade` 구현 추가:

```java
// SseEmitterRegistry.java에 추가 (기존 notifyStatusChange 유지)
private final TradeSseEmitterRegistry tradeSseEmitterRegistry;

@Override
public void notifyTrade(UUID userId, TradeEvent event) {
    tradeSseEmitterRegistry.send(userId, event);
}
```

- [ ] **Step 6: TradeStreamController 신설**

```java
// adapter/in/web/TradeStreamController.java
package com.kista.adapter.in.web;

import com.kista.adapter.out.sse.TradeSseEmitterRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

@RestController
@RequestMapping("/api/trades")
@RequiredArgsConstructor
public class TradeStreamController {

    private final TradeSseEmitterRegistry tradeSseEmitterRegistry;

    @GetMapping(value = "/stream", produces = "text/event-stream")
    public SseEmitter stream(@AuthenticationPrincipal UUID userId) {
        return tradeSseEmitterRegistry.connect(userId);
    }
}
```

- [ ] **Step 7: SecurityConfig 업데이트**

현재 SecurityConfig를 읽고 `.requestMatchers("/api/trades/stream").authenticated()` 추가 또는 기존 authenticated() 패턴에 포함.

- [ ] **Step 8: TradingServiceTest 업데이트**

현재 TradingServiceTest를 읽고 `@Mock RealtimeNotificationPort realtimeNotificationPort` 있는지 확인:

```bash
grep -n "RealtimeNotificationPort" /Users/phs/workspace/kista/kista-api/src/test/java/com/kista/application/service/TradingServiceTest.java
```

없으면 추가:
```java
@Mock
RealtimeNotificationPort realtimeNotificationPort;
```

- [ ] **Step 9: 컴파일 + 테스트**

```bash
cd /Users/phs/workspace/kista/kista-api
./gradlew compileJava 2>&1 | tail -20
./gradlew test --tests 'com.kista.architecture.*' 2>&1 | tail -10
./gradlew test --tests 'com.kista.application.service.TradingServiceTest' 2>&1 | tail -10
```

Expected: BUILD SUCCESS

- [ ] **Step 10: Commit (kista-api)**

```bash
cd /Users/phs/workspace/kista/kista-api
git add src/main/java/com/kista/domain/model/TradeEvent.java \
  src/main/java/com/kista/domain/port/out/RealtimeNotificationPort.java \
  src/main/java/com/kista/adapter/out/sse/TradeSseEmitterRegistry.java \
  src/main/java/com/kista/adapter/out/sse/SseEmitterRegistry.java \
  src/main/java/com/kista/adapter/in/web/TradeStreamController.java \
  src/main/java/com/kista/adapter/in/web/dto/TradeEventDto.java \
  src/main/java/com/kista/adapter/in/web/security/SecurityConfig.java \
  src/test/java/com/kista/application/service/TradingServiceTest.java
git commit -m "feat: add Trade SSE emitter registry and stream endpoint"
```

---

## Task 13: TradingService notifyTrade 연동

**Files (kista-api):**
- Modify: `src/main/java/com/kista/application/service/TradingService.java`

- [ ] **Step 1: TradingService 읽기**

```bash
grep -n "execute\|saveAndNotify\|notify\|Execution\|place" /Users/phs/workspace/kista/kista-api/src/main/java/com/kista/application/service/TradingService.java | head -30
```

- [ ] **Step 2: executePlannedOrders 또는 saveAndNotify 직후 notifyTrade 호출**

ArchUnit 제약 (외부 시스템 호출은 @Transactional 외부):
- `realtimeNotificationPort.notifyTrade()` 호출은 KIS 체결 조회 후, 트랜잭션이 완료된 시점에서 호출
- `@TransactionalEventListener(AFTER_COMMIT)` 패턴 사용 또는 트랜잭션 외부 메서드에서 직접 호출

간단한 패턴 (트랜잭션 외부에서 직접):
```java
// executePlannedOrders() 직후 (non-@Transactional 메서드에서)
for (Execution execution : executions) {
    TradeEvent event = new TradeEvent(
        execution.side().equals("BUY") ? "BUY" : "SELL",
        account.ticker().name(),
        execution.qty(),
        execution.price(),
        execution.amount(),
        Instant.now(),
        account.nickname(),
        null
    );
    realtimeNotificationPort.notifyTrade(user.id(), event);
}
```

- [ ] **Step 3: 전체 테스트**

```bash
cd /Users/phs/workspace/kista/kista-api
./gradlew test 2>&1 | tail -20
```

- [ ] **Step 4: Commit (kista-api)**

```bash
cd /Users/phs/workspace/kista/kista-api
git add src/main/java/com/kista/application/service/TradingService.java
git commit -m "feat: notify trade SSE after order execution in TradingService"
```

---

## Task 14: kista-ui — Trade SSE 프론트엔드

**Files:**
- Create: `types/trade-event.ts`
- Create: `app/api/trades/stream/route.ts`
- Create: `components/trading/TradeNotificationProvider.tsx`
- Create: `components/trading/TradeToast.tsx`

- [ ] **Step 1: 타입 정의**

```ts
// types/trade-event.ts
export interface TradeEvent {
  kind: 'BUY' | 'SELL' | 'INFO' | 'FAIL'
  ticker: string
  qty?: number
  price?: number
  amount?: number
  time: string
  accountNickname: string
  message?: string
}
```

- [ ] **Step 2: SSE Route Handler**

```ts
// app/api/trades/stream/route.ts
import { getAuthToken } from '@/lib/auth/token'

export const dynamic = 'force-dynamic'

export async function GET() {
  const token = await getAuthToken()
  if (!token) {
    return new Response('Unauthorized', { status: 401 })
  }

  const apiUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL
  const upstream = await fetch(`${apiUrl}/api/trades/stream`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
    // @ts-expect-error Next.js streaming
    duplex: 'half',
  })

  if (!upstream.ok) {
    return new Response('Upstream error', { status: upstream.status })
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
```

- [ ] **Step 3: TradeToast 컴포넌트**

```tsx
// components/trading/TradeToast.tsx
import { TrendingUp, TrendingDown, Info, AlertCircle } from 'lucide-react'
import type { TradeEvent } from '@/types/trade-event'

interface Props {
  event: TradeEvent
}

const KIND_CONFIG = {
  BUY:  { icon: TrendingUp,    color: 'text-pos', bg: 'bg-pos/10',  label: '매수' },
  SELL: { icon: TrendingDown,  color: 'text-neg', bg: 'bg-neg/10',  label: '매도' },
  INFO: { icon: Info,          color: 'text-rose-500', bg: 'bg-rose-50', label: '알림' },
  FAIL: { icon: AlertCircle,   color: 'text-warn', bg: 'bg-warn-bg', label: '실패' },
}

export function TradeToast({ event }: Props) {
  const cfg = KIND_CONFIG[event.kind] ?? KIND_CONFIG.INFO
  const Icon = cfg.icon

  return (
    <div className="flex items-start gap-3 p-1">
      <div className={`size-8 rounded-full ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
        <Icon className={`size-4 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
          <span className="text-xs text-muted-foreground">{event.accountNickname}</span>
        </div>
        <p className="text-sm font-semibold text-foreground">
          {event.ticker} {event.qty && `${event.qty}주`}
          {event.price && ` @ $${event.price.toFixed(2)}`}
        </p>
        {event.message && <p className="text-xs text-muted-foreground">{event.message}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: TradeNotificationProvider 작성**

```tsx
// components/trading/TradeNotificationProvider.tsx
'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { TradeToast } from './TradeToast'
import type { TradeEvent } from '@/types/trade-event'

const RECONNECT_DELAY_MS = 5000

export function TradeNotificationProvider() {
  const router = useRouter()
  const esRef = useRef<EventSource | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function connect() {
      esRef.current?.close()
      const es = new EventSource('/api/trades/stream')
      esRef.current = es

      es.addEventListener('trade', (e: MessageEvent) => {
        try {
          const event: TradeEvent = JSON.parse(e.data)
          toast.custom(() => <TradeToast event={event} />, { duration: 6000 })
          // Dashboard/Statistics 페이지이면 Server Component 재실행
          router.refresh()
        } catch {
          // ignore parse error
        }
      })

      es.onerror = () => {
        es.close()
        retryRef.current = setTimeout(connect, RECONNECT_DELAY_MS)
      }
    }

    connect()

    return () => {
      esRef.current?.close()
      if (retryRef.current) clearTimeout(retryRef.current)
    }
  }, [router])

  return null
}
```

- [ ] **Step 5: layout.tsx에 Provider 마운트**

```tsx
// app/(main)/layout.tsx에 추가
import { TradeNotificationProvider } from '@/components/trading/TradeNotificationProvider'

// main 태그 밖에 추가:
<TradeNotificationProvider />
```

- [ ] **Step 6: 타입 체크**

```bash
cd /Users/phs/workspace/kista/kista-ui && npm run typecheck 2>&1 | tail -10
```

- [ ] **Step 7: Commit**

```bash
cd /Users/phs/workspace/kista/kista-ui
mkdir -p components/trading
git add types/trade-event.ts app/api/trades/stream/route.ts \
  components/trading/TradeNotificationProvider.tsx components/trading/TradeToast.tsx \
  "app/(main)/layout.tsx"
git commit -m "feat: Trade SSE frontend — route handler, TradeNotificationProvider, TradeToast"
```

---

## Task 15: StatisticsController KIS 응답 Normalizer

**Files (kista-api):**
- Create: `src/main/java/com/kista/adapter/in/web/dto/PortfolioSummaryResponse.java`
- Modify: `src/main/java/com/kista/adapter/in/web/StatisticsController.java`

- [ ] **Step 1: StatisticsController 현재 읽기**

```bash
cat /Users/phs/workspace/kista/kista-api/src/main/java/com/kista/adapter/in/web/StatisticsController.java
```

- [ ] **Step 2: PortfolioSummaryResponse DTO 신설**

KIS `CTRP6504R` 응답 → kista-ui 기대 형태로 매핑:

```java
// adapter/in/web/dto/PortfolioSummaryResponse.java
package com.kista.adapter.in.web.dto;

import java.util.List;

public record PortfolioSummaryResponse(
    List<PositionDto> positions,
    SummaryDto summary
) {
    public record PositionDto(
        String ticker,          // pdno
        int quantity,           // cblc_qty13
        double avgPrice,        // avg_unpr3
        double currentPrice,    // ovrs_now_pric1
        double evalAmount,      // frcr_evlu_amt2
        double profitAmount,    // evlu_pfls_amt2
        double profitRate       // evlu_pfls_rt1
    ) {}

    public record SummaryDto(
        double totalAssets,     // tot_asst_amt
        double totalProfit,     // tot_evlu_pfls_amt
        double totalProfitRate  // evlu_erng_rt1
    ) {}
}
```

- [ ] **Step 3: StatisticsController에 normalizer 적용**

`/api/accounts/{id}/portfolio` 엔드포인트가 `PresentBalanceResult`를 직접 반환하던 것 → `PortfolioSummaryResponse`로 변환:

```java
// StatisticsController.java의 해당 메서드 (실제 코드 확인 후 적용)
@GetMapping("/{id}/portfolio")
public PortfolioSummaryResponse getPortfolio(
    @PathVariable UUID id,
    @AuthenticationPrincipal UUID userId
) {
    PresentBalanceResult result = getPortfolioUseCase.getPortfolio(id, userId);
    return normalizePortfolio(result);
}

private PortfolioSummaryResponse normalizePortfolio(PresentBalanceResult result) {
    List<PortfolioSummaryResponse.PositionDto> positions = result.items().stream()
        .map(item -> new PortfolioSummaryResponse.PositionDto(
            item.pdno(),
            (int) item.cblcQty13(),
            item.avgUnpr3(),
            item.ovrsNowPric1(),
            item.frcrEvluAmt2(),
            item.evluPflsAmt2(),
            item.evluPflsRt1()
        ))
        .toList();

    PortfolioSummaryResponse.SummaryDto summary = new PortfolioSummaryResponse.SummaryDto(
        result.output3().totAsstAmt(),
        result.output3().totEvluPflsAmt(),
        result.output3().evluErngRt1()
    );

    return new PortfolioSummaryResponse(positions, summary);
}
```

**주의:** 실제 `PresentBalanceResult` 필드명은 `kis-api.md` 참조. 필드명이 다를 경우 맞게 조정.

- [ ] **Step 4: 컴파일**

```bash
cd /Users/phs/workspace/kista/kista-api && ./gradlew compileJava 2>&1 | tail -15
```

- [ ] **Step 5: Commit (kista-api)**

```bash
cd /Users/phs/workspace/kista/kista-api
git add src/main/java/com/kista/adapter/in/web/dto/PortfolioSummaryResponse.java \
  src/main/java/com/kista/adapter/in/web/StatisticsController.java
git commit -m "feat: add PortfolioSummaryResponse normalizer to StatisticsController"
```

---

## Task 16: 전체 빌드 + 스크린샷 검증

**Files:** 없음 (검증만)

- [ ] **Step 1: kista-ui 빌드 확인**

```bash
cd /Users/phs/workspace/kista/kista-ui
npm run typecheck 2>&1 | tail -5
npm run lint 2>&1 | tail -10
npm run build 2>&1 | tail -20
```

Expected: 오류 없음

- [ ] **Step 2: kista-api 전체 테스트**

```bash
cd /Users/phs/workspace/kista/kista-api
./gradlew test 2>&1 | tail -20
```

Expected: BUILD SUCCESS

- [ ] **Step 3: dev 서버 기동**

```bash
cd /Users/phs/workspace/kista/kista-ui
npm run dev > /tmp/kista_dev.log 2>&1 &
sleep 5
grep "Local:" /tmp/kista_dev.log
```

- [ ] **Step 4: Playwright 스크린샷 (핵심 화면)**

```bash
# Playwright 설치 (첫 실행 시)
cd /Users/phs/workspace/kista/kista-ui
npx playwright install chromium 2>/dev/null

PORT=$(grep "Local:" /tmp/kista_dev.log | grep -oP ':\K\d+' | head -1)
mkdir -p /tmp/kista-screenshots

# 로그인 화면 (인증 불필요)
npx playwright screenshot --browser chromium --full-page \
  --viewport-size "1440,900" \
  "http://localhost:${PORT}/" \
  /tmp/kista-screenshots/login-desktop.png

npx playwright screenshot --browser chromium --full-page \
  --viewport-size "390,844" \
  "http://localhost:${PORT}/" \
  /tmp/kista-screenshots/login-mobile.png

echo "Screenshots saved to /tmp/kista-screenshots/"
ls /tmp/kista-screenshots/
```

- [ ] **Step 5: 스크린샷 확인 (computer-use)**

스크린샷 결과를 Read 도구로 확인하거나 computer-use로 비교.

- [ ] **Step 6: dev 서버 종료**

```bash
pkill -f "npm run dev" 2>/dev/null || true
```

---

## Task 17: AccountDetail 화면 정밀화

**Files:**
- Modify: `app/(main)/accounts/[id]/page.tsx`

- [ ] **Step 1: 현재 AccountDetail 페이지 읽기**

```bash
wc -l /Users/phs/workspace/kista/kista-ui/app/\(main\)/accounts/\[id\]/page.tsx
head -60 /Users/phs/workspace/kista/kista-ui/app/\(main\)/accounts/\[id\]/page.tsx
```

- [ ] **Step 2: 5섹션 레이아웃 적용**

디자인 명세:
- row1: chart(1.7fr) + summary(1fr) — `globals.css`의 `.account-detail-row1` 커스텀 그리드 사용
- row2: 거래 내역 테이블
- row3: 예약 주문 카드
- row4: 증거금 (USD/KRW 박스)

`globals.css`에 추가:
```css
@media (min-width: 1024px) {
  .account-detail-row1 {
    display: grid;
    grid-template-columns: 1.7fr 1fr;
    gap: 1.5rem;
  }
}
```

페이지:
```tsx
<div>
  <PageHeader ... />
  <div className="account-detail-row1 mb-6">
    <PortfolioChart ... />
    <SummaryPanel ... />
  </div>
  {/* 거래, 예약주문, 증거금 */}
</div>
```

- [ ] **Step 3: 타입 체크 + Commit**

```bash
cd /Users/phs/workspace/kista/kista-ui && npm run typecheck 2>&1 | tail -5
git add "app/(main)/accounts/[id]/page.tsx" app/globals.css
git commit -m "feat: AccountDetail 5-section row layout with custom grid"
```

---

## 완료 체크리스트

모든 태스크 완료 후:

- [ ] `npm run typecheck` → 0 errors
- [ ] `npm run lint` → 0 errors
- [ ] `npm run build` → BUILD SUCCESS
- [ ] `./gradlew test` (kista-api) → BUILD SUCCESS
- [ ] `./gradlew test --tests 'com.kista.architecture.*'` → BUILD SUCCESS (ArchUnit)
- [ ] 로그인 화면 스크린샷 — GlassCard + 카카오 버튼
- [ ] Dashboard 스크린샷 — KpiCard 3개 + AccountCard 그리드
- [ ] Pending 스크린샷 — GlassCard + Timeline 4단계
- [ ] 다크 모드: `localStorage.setItem('theme', 'dark')` 후 스크린샷

---

## 주요 위험 요소

1. **ArchUnit 위반**: `TradeEvent` record를 `adapter` 패키지에 두면 빌드 실패 → `domain/model/`에 배치
2. **`SseEmitterRegistry` 순환 의존**: `TradeSseEmitterRegistry`를 주입받는 구조 유지, `KisHttpClient` 패턴과 동일하게 순환 없음 확인
3. **인라인 style 반응형 충돌**: `account-detail-row1` 등 커스텀 그리드는 반드시 globals.css에서 `@media`로 정의
4. **`createAccount` DTO 필드명 불일치**: `lib/api/accounts.ts`의 실제 파라미터 타입과 ConfirmStep 호출부 일치 필수
5. **`kista-token` 쿠키 SSE Route Handler**: `getAuthToken()`은 server-only — Route Handler에서만 호출 가능 (CLAUDE.md quirk)
