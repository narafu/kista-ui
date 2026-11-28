// 촬영 시나리오. 뮤테이션 금지: 제출/저장 버튼은 누르지 않는다 — 열기·탭 전환·선택만.
// { name, path(문자열 또는 실행 시 조회값 ctx를 받는 함수), admin?, steps?, mode?(trading fixture 모드, 기본 real=실데이터), clock?(평일 시계 고정 — 휴장일 배너가 부족 배너를 가리는 것 방지),
//   guest?(kista-token 없이 비회원으로), cookies?({ 이름: 값 } 추가 쿠키), setup?(page => goto 전에 실행 — 브라우저 요청을 page.route로 덮을 때) }
import { fill, findRow } from '../shared/routes.mjs'
import { seed, stubSeedCash } from '../shared/seed.mjs'

const clickText = (t) => async (p) => { await p.getByText(t, { exact: true }).first().click(); await p.waitForTimeout(800) }
const clickRole = (role, name) => async (p) => { await p.getByRole(role, { name }).first().click(); await p.waitForTimeout(800) }

const scrollToBottom = async (p) => { await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(500) }
// PC 표와 모바일 카드가 함께 렌더되고 한쪽은 CSS로 숨겨져 있다 — 보이는 펼치기 버튼만 누른다
const expandPrivacyBase = async (p) => { await p.locator('button[aria-label$="주문 명세"]:visible, article h3 button[aria-expanded]:visible').first().click(); await p.waitForTimeout(800) }
// 전략 유형 버튼 라벨은 meta API의 한글 이름이다("VR" 텍스트는 없다)
const pickVr = clickRole('button', /밸류리밸런싱/)
const openAdvanced = async (p) => { await p.locator('summary', { hasText: '고급 설정' }).first().click(); await p.waitForTimeout(800) }
// 사용자 → 증권사 → 계좌 → 전략 cascading Select(Base UI)를 시드/테스트 항목 우선으로 끝까지 고른다
const adminCascade = async (p) => {
  const triggers = p.locator('section[aria-label="거래 내역 필터"] [role="combobox"]')
  for (let i = 0; i < 4; i++) {
    const trigger = triggers.nth(i)
    // 앞 선택의 조회가 끝나야 활성화된다 — 끝내 비활성이면 고를 항목이 없는 것으로 보고 멈춘다
    const enabled = await trigger.evaluate((el) => new Promise((resolve) => {
      const ready = () => !el.disabled && !el.hasAttribute('data-disabled')
      if (ready()) return resolve(true)
      const timer = setInterval(() => { if (ready()) { clearInterval(timer); resolve(true) } }, 200)
      setTimeout(() => { clearInterval(timer); resolve(false) }, 8000)
    })).catch(() => false)
    if (!enabled) break
    await trigger.click()
    const options = p.getByRole('option')
    await options.first().waitFor({ timeout: 8000 }).catch(() => {})
    const texts = await options.allTextContents()
    if (!texts.length) { await p.keyboard.press('Escape'); break }
    const pick = texts.findIndex((t) => /시드|dev|테스트|SOXL|INFINITE/i.test(t))
    await options.nth(Math.max(pick, 0)).click()
    await p.waitForTimeout(1500)
  }
}

// 화면 경로·쿠키·준비 함수는 shared/routes.mjs 표에서 가져온다 — 여기는 상태 변형(mode·steps·clock)만 더한다
const screen = (path, seedKey, params) => {
  const row = findRow(path, seedKey)
  return { path: fill(row, { seed }, params), cookies: row.cookies, setup: row.setup }
}
// 실행 시 조회한 id(ctx)가 필요한 화면 — path를 함수로 둔다
const screenWith = (path) => ({ path: (ctx) => fill(findRow(path), { seed, ...ctx }) })
const at = (...args) => screen(...args).path
const STRATEGY = '/accounts/[id]/strategies/[sid]'
const INF = at(STRATEGY, 'infinite')
const VR = at(STRATEGY, 'vr')
const PAUSED = at(STRATEGY, 'infinite', { id: seed.paused.accountId, sid: seed.paused.strategyId }) // paused는 일부러 표 밖 — a11y 대상이 아니다(TOSS 전략, preview 503)
const ACCT = at('/accounts/[id]', 'infinite')
const NEW_STRATEGY = at('/accounts/[id]/strategies/new', 'infinite')
// MOCK 계좌는 잔고 확인이 강제로 꺼져 예수금 입력칸만 나온다 — 사용 비율 게이지는 TOSS 계좌로 연다
const TOSS_NEW_STRATEGY = at('/accounts/[id]/strategies/new', 'toss')

const modes = (prefix, path, list, extra = {}) => list.map((mode) => ({ name: `${prefix}-${mode}`, path, mode, ...extra }))

export const scenarios = [
  { name: 'strategies', path: at('/strategies') },
  { name: 'detail-infinite', path: INF },
  { name: 'detail-vr', path: VR },
  { name: 'detail-paused', path: PAUSED },
  { name: 'account-detail', path: ACCT },
  { name: 'account-new', path: at('/accounts/new') },
  { name: 'account-new-toss', path: at('/accounts/new'), steps: [clickRole('button', /토스|TOSS/i)] },
  { name: 'account-new-mock', path: at('/accounts/new'), steps: [clickRole('button', /모의|MOCK|Mock/)] },
  { name: 'create-strategy', path: NEW_STRATEGY },
  { name: 'create-strategy-vr', path: NEW_STRATEGY, steps: [pickVr] },
  { name: 'create-strategy-vr-advanced', path: NEW_STRATEGY, steps: [pickVr, openAdvanced] },
  { name: 'create-strategy-seed-cash', path: TOSS_NEW_STRATEGY, setup: stubSeedCash },
  { name: 'create-strategy-seed-fill', path: TOSS_NEW_STRATEGY, setup: stubSeedCash, steps: [clickRole('button', /^50%$/)] },
  { name: 'reconfigure-vr', path: at(`${STRATEGY}/reconfigure-vr`, 'vr') },
  { name: 'finance', path: at('/finance') },
  { name: 'finance-month-popover', path: at('/finance'), steps: [clickRole('button', /^기준 연월/)] },
  { name: 'finance-expense', path: at('/finance/expense') },
  { name: 'finance-expense-annual', path: at('/finance/expense'), steps: [clickText('연간')] },
  { name: 'finance-expense-tx-dialog', path: at('/finance/expense'), steps: [clickRole('button', '거래내역 등록')] },
  { name: 'finance-income', path: at('/finance/income') },
  { name: 'finance-saving', path: at('/finance/saving') },
  { name: 'finance-new', path: at('/finance/new') },
  // 시드 자산 스냅샷 id는 월이 바뀌면 달라져 실행 시 조회한다(run.mjs)
  { name: 'finance-asset-edit', ...screenWith('/finance/[id]/edit') },
  { name: 'finance-asset-dup', path: (ctx) => `${at('/finance/new')}?duplicateFrom=${ctx.assetSnapshotId}&month=${ctx.assetSnapshotMonth}` },
  { name: 'finance-settings', path: at('/finance/settings') },
  { name: 'finance-settings-category-dialog', path: at('/finance/settings'), steps: [clickText('카테고리 추가')] },
  { name: 'stats', path: at('/stats') },
  { name: 'benchmark-etf', path: at('/stats/benchmark') },
  { name: 'benchmark-apt', path: at('/stats/benchmark'), steps: [clickText('아파트')] },
  { name: 'admin-trades', path: at('/admin/trades'), admin: true },
  { name: 'admin-accounts', path: at('/admin/accounts'), admin: true },
  // P 매매표는 로컬 DB에 없어 fixtures/api.mjs가 채운다
  // 차트 아래 정보 줄이 sticky bottom-0이라 스크롤 0에서는 화면 하단에 붙어 실현손익 차트를 덮는다 — 맨 아래로 내려 제자리에 찍는다
  { name: 'admin-privacy-trades', path: at('/admin/privacy-trades'), admin: true, steps: [scrollToBottom] },
  { name: 'admin-privacy-trades-expanded', path: at('/admin/privacy-trades'), admin: true, steps: [expandPrivacyBase] },
  // 운영 설정의 VR 정기 입출금 방식과 오류 로그는 fixtures/api.mjs가 고정한다
  { name: 'admin-settings', path: at('/admin/settings'), admin: true },
  // 감사·이상 징후 섹션은 실데이터라 오류 로그 섹션만 연다
  { name: 'admin-logs', path: `${at('/admin/logs')}?type=error`, admin: true },
  // 행 하나만 고르면 전체 선택이 indeterminate가 된다 — 클라이언트 상태만 바뀌고 요청은 없다
  { name: 'admin-logs-partial', path: `${at('/admin/logs')}?type=error`, admin: true, steps: [clickRole('checkbox', /^오류 로그 선택/)] },
  { name: 'pending', ...screen('/pending') },
  { name: 'rejected', ...screen('/rejected') },
  { name: 'dashboard-guest', path: at('/dashboard'), guest: true },
  // 404 화면에 초 단위 시계가 있어 시계를 고정한다
  { name: 'not-found', path: '/visual-diff-not-found', clock: true },
  { name: 'admin-trades-select', path: at('/admin/trades'), admin: true, steps: [adminCascade] },
  // 실데이터로 못 만드는 preview 분기 — 실데이터(real) 화면은 위 기본 시나리오가 담당
  ...modes('m-inf', INF, ['deficit', 'trimmed', 'executed', 'skip', 'empty']),
  ...modes('m-vr', VR, ['executed']),
  ...modes('m-list', at('/strategies'), ['deficit', 'executed']),
  ...modes('m-acct', ACCT, ['executed']),
  // dca 모드: 시드 무한매수 계좌에 합성 주식 DCA 전략 1건 — 상세(실행 이력 2건: 현재 규칙·삭제된 규칙)와 목록 규칙 요약 확인용. 메타의 DCA enabled는 fixtures/api.mjs가 보강
  { name: 'stock-dca-strategy', path: at(STRATEGY, 'infinite', { sid: '00000000-0000-4000-8000-0000000c0172' }), mode: 'dca' },
  { name: 'stock-dca-strategies', path: at('/strategies'), mode: 'dca' },
  ...modes('w-inf', INF, ['real', 'deficit', 'trimmed', 'executed'], { clock: true }),
  ...modes('w-list', at('/strategies'), ['deficit', 'executed'], { clock: true }),
]
