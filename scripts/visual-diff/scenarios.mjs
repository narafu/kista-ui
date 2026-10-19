// 촬영 시나리오. 뮤테이션 금지: 제출/저장 버튼은 누르지 않는다 — 열기·탭 전환·선택만.
// { name, path(문자열 또는 실행 시 조회값 ctx를 받는 함수), admin?, steps?, mode?(trading fixture 모드, 기본 real=실데이터), clock?(평일 시계 고정 — 휴장일 배너가 부족 배너를 가리는 것 방지),
//   guest?(kista-token 없이 비회원으로), cookies?({ 이름: 값 } 추가 쿠키), setup?(page => goto 전에 실행 — 브라우저 요청을 page.route로 덮을 때) }
import { seed } from '../shared/seed.mjs'

const clickText = (t) => async (p) => { await p.getByText(t, { exact: true }).first().click(); await p.waitForTimeout(800) }
const clickRole = (role, name) => async (p) => { await p.getByRole(role, { name }).first().click(); await p.waitForTimeout(800) }

const dragGauge = async (p) => {
  const s = p.getByRole('slider').first()
  await s.scrollIntoViewIfNeeded()
  const b = await s.boundingBox()
  await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await p.mouse.down()
  const track = await s.locator('xpath=..').boundingBox()
  await p.mouse.move(track.x + track.width * 0.4, b.y + b.height / 2, { steps: 8 })
  await p.mouse.up()
  await p.waitForTimeout(500)
}
const gaugeKeys = async (p) => {
  const s = p.getByRole('slider').first()
  await s.focus()
  for (let i = 0; i < 3; i++) await s.press('ArrowLeft')
  await p.waitForTimeout(500)
}
// PC 표와 모바일 카드가 함께 렌더되고 한쪽은 CSS로 숨겨져 있다 — 보이는 펼치기 버튼만 누른다
const expandPrivacyBase = async (p) => { await p.locator('button[aria-label$="주문 명세"]:visible, article h3 button[aria-expanded]:visible').first().click(); await p.waitForTimeout(800) }
const openAdvanced = async (p) => { await p.locator('summary', { hasText: '고급 설정' }).first().click(); await p.waitForTimeout(800) }
// 계좌 → 전략 → 주문 cascading select를 시드/테스트 항목 우선으로 끝까지 고른다
const adminCascade = async (p) => {
  const sel = p.locator('section[aria-label="재주문 대상 선택"] select')
  for (let i = 0; i < 4; i++) {
    const el = sel.nth(i)
    await p.waitForFunction((e) => e && !e.disabled && e.options.length > 1, await el.elementHandle(), { timeout: 8000 }).catch(() => {})
    const opts = await el.locator('option').allTextContents()
    if (opts.length < 2) break
    const pick = opts.findIndex((t, k) => k > 0 && /시드|dev|테스트|SOXL|INFINITE/i.test(t))
    await el.selectOption({ index: pick > 0 ? pick : 1 })
    await p.waitForTimeout(1500)
  }
}

const detail = ({ accountId, strategyId }) => `/accounts/${accountId}/strategies/${strategyId}`
const INF = detail(seed.infinite)
const VR = detail(seed.vr)
const PAUSED = detail(seed.paused)
const ACCT = `/accounts/${seed.infinite.accountId}`
const NEW_STRATEGY = `${ACCT}/strategies/new`
// MOCK 계좌는 잔고 확인이 강제로 꺼져 예수금 입력칸만 나온다 — 사용 비율 게이지는 KIS 계좌로 연다
const KIS_NEW_STRATEGY = `/accounts/${seed.kis.accountId}/strategies/new`
// KIS 시드 계좌의 예수금 조회는 503이고 브라우저에서만 부른다 — page.route로 USD 예수금을 채운다
const stubMargin = (p) => p.route(`**/api/accounts/${seed.kis.accountId}/margin`, (r) => r.fulfill({ json: [{ currency: 'USD', integratedOrderableAmount: 5000, foreignOrderableAmount: 5000, purchasableAmount: 5000 }] }))
// 사용자 상태는 proxy.ts가 상태·역할 쿠키가 있으면 /me 대신 그 값을 쓴다 — dev 사용자(ACTIVE)로 대기·반려 화면을 연다
const statusCookies = (status) => ({ 'kista-user-status': status, 'kista-user-role': 'USER' })
// 대기 화면의 상태 SSE가 ACTIVE를 보내면 /dashboard로 이동한다 — 204로 닫아 재연결도 막는다
const stubStatusStream = (p) => p.route('**/api/auth/status-stream', (r) => r.fulfill({ status: 204 }))

const modes = (prefix, path, list, extra = {}) => list.map((mode) => ({ name: `${prefix}-${mode}`, path, mode, ...extra }))

export const scenarios = [
  { name: 'strategies', path: '/strategies' },
  { name: 'detail-infinite', path: INF },
  { name: 'detail-vr', path: VR },
  { name: 'detail-paused', path: PAUSED },
  { name: 'account-detail', path: ACCT },
  { name: 'account-new', path: '/accounts/new' },
  { name: 'account-new-kis', path: '/accounts/new', steps: [clickRole('button', /한국투자|KIS/)] },
  { name: 'account-new-mock', path: '/accounts/new', steps: [clickRole('button', /모의|MOCK|Mock/)] },
  { name: 'create-strategy', path: NEW_STRATEGY },
  { name: 'create-strategy-vr', path: NEW_STRATEGY, steps: [clickText('VR')] },
  { name: 'create-strategy-vr-advanced', path: NEW_STRATEGY, steps: [clickText('VR'), openAdvanced] },
  { name: 'create-strategy-gauge-drag', path: NEW_STRATEGY, steps: [clickText('VR'), dragGauge] },
  { name: 'create-strategy-gauge-keys', path: NEW_STRATEGY, steps: [clickText('VR'), gaugeKeys] },
  { name: 'create-strategy-balance', path: KIS_NEW_STRATEGY, setup: stubMargin },
  { name: 'create-strategy-balance-max', path: KIS_NEW_STRATEGY, setup: stubMargin, steps: [clickRole('button', /^MAX$/)] },
  { name: 'reconfigure-vr', path: `${VR}/reconfigure-vr` },
  { name: 'finance', path: '/finance' },
  { name: 'finance-month-popover', path: '/finance', steps: [clickRole('button', /^기준 연월/)] },
  { name: 'finance-expense', path: '/finance/expense' },
  { name: 'finance-expense-annual', path: '/finance/expense', steps: [clickText('연간')] },
  { name: 'finance-expense-tx-dialog', path: '/finance/expense', steps: [clickText('내역 등록')] },
  { name: 'finance-income', path: '/finance/income' },
  { name: 'finance-saving', path: '/finance/saving' },
  { name: 'finance-new', path: '/finance/new' },
  // 시드 자산 스냅샷 id는 월이 바뀌면 달라져 실행 시 조회한다(run.mjs)
  { name: 'finance-asset-edit', path: (ctx) => `/finance/${ctx.assetSnapshotId}/edit` },
  { name: 'finance-asset-dup', path: (ctx) => `/finance/new?duplicateFrom=${ctx.assetSnapshotId}` },
  { name: 'finance-settings', path: '/finance/settings' },
  { name: 'finance-settings-category-dialog', path: '/finance/settings', steps: [clickText('카테고리 추가')] },
  { name: 'stats', path: '/stats' },
  { name: 'benchmark-etf', path: '/stats/benchmark' },
  { name: 'benchmark-apt', path: '/stats/benchmark', steps: [clickText('아파트')] },
  { name: 'admin-trades', path: '/admin/trades', admin: true },
  { name: 'admin-accounts', path: '/admin/accounts', admin: true },
  // P 매매표는 로컬 DB에 없어 fixtures/api.mjs가 채운다
  { name: 'admin-privacy-trades', path: '/admin/privacy-trades', admin: true },
  { name: 'admin-privacy-trades-expanded', path: '/admin/privacy-trades', admin: true, steps: [expandPrivacyBase] },
  { name: 'pending', path: '/pending', cookies: statusCookies('PENDING'), setup: stubStatusStream },
  { name: 'rejected', path: '/rejected', cookies: statusCookies('REJECTED') },
  { name: 'dashboard-guest', path: '/dashboard', guest: true },
  { name: 'not-found', path: '/visual-diff-not-found' },
  { name: 'admin-trades-select', path: '/admin/trades', admin: true, steps: [adminCascade] },
  // 실데이터로 못 만드는 preview 분기 — 실데이터(real) 화면은 위 기본 시나리오가 담당
  ...modes('m-inf', INF, ['deficit', 'uncertain', 'executed', 'skip', 'empty']),
  ...modes('m-vr', VR, ['executed']),
  ...modes('m-list', '/strategies', ['deficit', 'executed']),
  ...modes('m-acct', ACCT, ['executed']),
  ...modes('w-inf', INF, ['real', 'deficit', 'uncertain', 'executed'], { clock: true }),
  ...modes('w-list', '/strategies', ['deficit', 'executed'], { clock: true }),
]
