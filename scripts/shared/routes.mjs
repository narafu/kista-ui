// 화면 경로 표 — a11y-check가 전부 돌고, visual-diff 시나리오가 경로를 여기서 가져간다. 앱 화면과의 일치는 check-routes.mjs가 lint에서 검사한다.
// 이 파일은 import가 없다(seed.mjs를 읽지 않는다 — 정적 검사가 네트워크를 타면 안 된다). 시드 값 해석은 fill()을 부르는 쪽이 한다.
// 행: { path(앱 라우트 모양), role('guest'|'user'|'admin'), seed?(시드 키 — [id]=accountId, [sid]=strategyId),
//       params?({ 세그먼트: 값 또는 ctx => 값 }), cookies?(추가 쿠키), setup?(page => 준비), redirect?(항상 다른 화면으로 가 점검 대상 아님),
//       dialogs?(트리거 다이얼로그 점검), formDialog?([이름, 트리거 셀렉터] — 열림 상태를 부모가 쥐는 FormDialog) }

// 사용자 상태는 proxy.ts가 상태·역할 쿠키가 있으면 /me 대신 그 값을 쓴다 — dev 사용자(ACTIVE)로 대기·반려 화면을 연다
const statusCookies = (status) => ({ 'kista-user-status': status, 'kista-user-role': 'USER' })
// 대기 화면의 상태 SSE가 ACTIVE를 보내면 /dashboard로 이동한다 — 204로 닫아 재연결도 막는다
const stubStatusStream = (p) => p.route('**/api/auth/status-stream', (r) => r.fulfill({ status: 204 }))

const ACCT = '/accounts/[id]'
const STRATEGY = `${ACCT}/strategies/[sid]`
const snapshot = { id: (ctx) => ctx.assetSnapshotId } // 가계부 자산 스냅샷 id는 월이 바뀌면 달라져 실행 시 조회한다

export const ROUTES = [
  { path: '/', role: 'guest', redirect: true },
  { path: '/login', role: 'guest' },
  { path: '/dashboard', role: 'guest' },
  { path: '/pending', role: 'user', cookies: statusCookies('PENDING'), setup: stubStatusStream },
  { path: '/rejected', role: 'user', cookies: statusCookies('REJECTED') },
  { path: '/dashboard', role: 'user' },
  { path: '/strategies', role: 'user' },
  { path: '/accounts', role: 'user' },
  { path: '/accounts/new', role: 'user' },
  { path: ACCT, role: 'user', seed: 'infinite', dialogs: true },
  { path: `${ACCT}/edit`, role: 'user', seed: 'infinite', dialogs: true },
  { path: `${ACCT}/strategies/new`, role: 'user', seed: 'infinite' },
  // 가용 예수금 힌트·채우기 버튼은 availableCash가 있어야 뜬다 — TOSS 시드 계좌로 열고 stubSeedCash로 채운다
  { path: `${ACCT}/strategies/new`, role: 'user', seed: 'toss' },
  { path: STRATEGY, role: 'user', seed: 'infinite', dialogs: true },
  { path: STRATEGY, role: 'user', seed: 'vr' },
  { path: STRATEGY, role: 'user', seed: 'capital', formDialog: ['투자금 추가', 'button:has-text("투자금 추가"):visible'] },
  { path: `${STRATEGY}/edit`, role: 'user', seed: 'infinite' },
  { path: `${STRATEGY}/reconfigure-vr`, role: 'user', seed: 'vr' },
  { path: '/stats', role: 'user' },
  { path: '/stats/benchmark', role: 'user' },
  { path: '/stats/backtest', role: 'user' },
  { path: '/finance', role: 'user', dialogs: true },
  { path: '/finance/income', role: 'user' },
  { path: '/finance/expense', role: 'user' },
  { path: '/finance/saving', role: 'user' },
  { path: '/finance/new', role: 'user' },
  { path: '/finance/[id]/edit', role: 'user', params: snapshot },
  { path: '/finance/bulk-register', role: 'user' },
  { path: '/finance/budgets/[type]', role: 'user', params: { type: 'expense' }, formDialog: ['예산 추가', 'button:has-text("예산 추가"):visible'] },
  { path: '/finance/settings', role: 'user', dialogs: true },
  { path: '/settings', role: 'user', dialogs: true },
  { path: '/admin', role: 'admin' },
  ...['users', 'pending', 'accounts', 'privacy-trades', 'settings', 'logs'].map((p) => ({ path: `/admin/${p}`, role: 'admin', dialogs: true })),
  { path: '/admin/trades', role: 'admin' },
]

export const findRow = (path, seed, role) => {
  const row = ROUTES.find((r) => r.path === path && r.seed === seed && (!role || r.role === role))
  if (!row) throw new Error(`경로 표에 없는 행: ${path} seed=${seed}`)
  return row
}

/** 행의 경로 틀을 실제 경로로. 채울 값이 없으면 null(시드·데이터 없음). ctx: { seed, assetSnapshotId } */
export function fill(row, ctx, overrides = {}) {
  const s = row.seed && ctx.seed[row.seed]
  const values = { ...(s && { id: s.accountId, sid: s.strategyId }), ...row.params, ...overrides }
  let missing = false
  const path = row.path.replace(/\[(\w+)\]/g, (_, key) => {
    const v = typeof values[key] === 'function' ? values[key](ctx) : values[key]
    missing ||= v == null
    return v
  })
  return missing ? null : path
}
