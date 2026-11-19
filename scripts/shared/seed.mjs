// 로컬 dev 시드(kista-api scripts/dev-seed/seed.sh)의 계좌·전략 ID. visual-diff(시나리오·trading fixture)와 a11y-check가 함께 참조한다.
// 로컬 API(8080·8081)가 떠 있으면 MOCK·TOSS 시드 계좌·전략 ID를 실행 시 조회해 덮는다. KISTA_DEV_SEED=<json 경로>를 주면 조회 대신 그 파일로 최상위 키 단위 덮어쓰기
import { readFileSync } from 'node:fs'

// MOCK 계좌: ACTIVE 전략, preview·prices 등 trading API가 실제로 200
const MOCK = 'a24b77e4-4b7e-42bc-9a4d-b52a7a686c7f'
const MOCK_INF = '07302a81-3628-4c3c-a17d-7658d1afe58f'
const MOCK_VR = '4141787f-ec49-436a-8e92-f74f01df644d'
// TOSS 시드 계좌: 전략 PAUSED, preview·margin 503
const TOSS = '935104dd-b978-95b0-17d4-63129de26126'
const TOSS_PAUSED = 'c0ac1a34-9ee3-3e83-70fc-7cfc9a78a354'

// 로컬 API에서 찾지 못한 시드 키 — e2e가 시드 없는 화면 점검을 실패 대신 건너뛰게 한다
const missing = new Set()

const defaults = {
  // 계좌 → 전략 ID → ticker. preview 모드 fixture가 previews 응답을 만들 때 사용
  accounts: { [MOCK]: { [MOCK_INF]: 'SOXL', [MOCK_VR]: 'TQQQ' } },
  // 시나리오가 여는 대표 전략 상세
  infinite: { accountId: MOCK, strategyId: MOCK_INF },
  vr: { accountId: MOCK, strategyId: MOCK_VR },
  // 투자금 추가·인출 버튼이 보이는 전략(진행 중 사이클 + 장부 예수금 > 0). infinite는 사이클 대기 중일 수 있어 따로 고른다
  capital: { accountId: MOCK, strategyId: MOCK_INF },
  paused: { accountId: TOSS, strategyId: TOSS_PAUSED },
  // 잔고 확인 화면용 실계좌(MOCK은 잔고 확인이 강제로 꺼진다)
  toss: { accountId: TOSS },
}

// seed.sh는 MOCK·TOSS 계좌·전략을 API로 등록해 ID가 DB마다 달라진다 — 로컬 API에서 닉네임·type·ticker로 찾아 기본값을 덮는다.
// API가 응답하지 않으면 기본값 그대로(조회만 하고 dev 토큰 외 쓰기 없음)
async function resolveFromApi() {
  try {
    // 요청마다 타임아웃을 따로 둔다 — 하나로 묶으면 앞 요청이 느릴 때 뒤 요청까지 중단돼 조용히 기본값으로 떨어진다
    const { accessToken } = await (await fetch('http://localhost:8080/api/auth/dev-token', { method: 'POST', signal: AbortSignal.timeout(3000) })).json()
    const get = async (path) => {
      const r = await fetch(`http://localhost:8081${path}`, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(3000) })
      if (!r.ok) throw new Error(`${path} ${r.status}`)
      return r.json()
    }
    const accounts = await get('/api/accounts')
    // TOSS 시드 계좌는 MOCK과 따로 찾는다 — 한쪽이 없어도 다른 쪽은 조회값을 쓴다
    const tossResolved = { accounts: {} }
    const toss = accounts.find((a) => a.broker === 'TOSS' && a.nickname === '[시드] 토스 계좌')
    if (toss) {
      const tossStrategies = await get(`/api/accounts/${toss.id}/trading-cycles`)
      tossResolved.toss = { accountId: toss.id }
      tossResolved.accounts[toss.id] = Object.fromEntries(tossStrategies.map((s) => [s.id, s.ticker]))
      const paused = tossStrategies.find((s) => s.status === 'PAUSED')
      if (paused) tossResolved.paused = { accountId: toss.id, strategyId: paused.id }
    } else console.warn('[seed] TOSS 시드 계좌 없음 — toss·paused는 기본 ID 사용')
    const account = accounts.find((a) => a.broker === 'MOCK' && a.nickname === '[시드] 모의계좌')
    if (!account) {
      missing.add('infinite').add('vr').add('capital')
      console.warn('[seed] MOCK 시드 계좌 없음 — 기본 ID 사용(kista-api scripts/dev-seed/seed.sh 확인)')
      return { ...tossResolved, accounts: { ...defaults.accounts, ...tossResolved.accounts } }
    }
    const strategies = await get(`/api/accounts/${account.id}/trading-cycles`)
    // seed.sh 기준 ticker(SOXL·TQQQ)의 ACTIVE를 우선하고, 없으면 같은 type의 ACTIVE, 그다음 아무 상태
    const pick = (match, ticker) =>
      [(s) => s.ticker === ticker && s.status === 'ACTIVE', (s) => s.status === 'ACTIVE', () => true]
        .map((cond) => strategies.find((s) => match(s) && cond(s)))
        .find(Boolean)
    // entities/strategy capitalAdjustment의 supportsCapitalAdjustment·canWithdrawCapital(floorToCents) 조건 — 서버도 진행 중 사이클에서만 허용한다
    const adjustable = (s) =>
      ['PRIVACY', 'INFINITE', 'DCA'].includes(s.type) && s.cycleInProgress &&
      (s.ledgerDeposit == null || Math.floor(Number((s.ledgerDeposit * 100).toFixed(6))) > 0)
    // 기본값 계좌 맵에 합친다 — 못 찾은 키가 기본 ID로 남아도 tickerOf가 그 ID의 ticker를 계속 찾도록
    const resolved = { accounts: { ...defaults.accounts, [account.id]: Object.fromEntries(strategies.map((s) => [s.id, s.ticker])) } }
    for (const [key, type, ticker] of [
      ['infinite', 'INFINITE', 'SOXL'],
      ['vr', 'VR', 'TQQQ'],
      ['capital', 'PRIVACY·INFINITE·DCA(진행 중 사이클)', 'SOXL'],
    ]) {
      const s = pick(key === 'capital' ? adjustable : (x) => x.type === type, ticker)
      if (s) resolved[key] = { accountId: account.id, strategyId: s.id }
      else {
        missing.add(key)
        console.warn(`[seed] MOCK 계좌에 ${type} 전략 없음 — ${key}는 기본 ID 사용(해당 화면 점검 실패 예상, kista-api scripts/dev-seed/seed.sh 확인)`)
      }
    }
    return { ...resolved, ...tossResolved, accounts: { ...resolved.accounts, ...tossResolved.accounts } }
  } catch (error) {
    console.warn(`[seed] 로컬 API 조회 실패 — 기본 ID 사용: ${error.message}`)
    return {}
  }
}

const override = process.env.KISTA_DEV_SEED ? JSON.parse(readFileSync(process.env.KISTA_DEV_SEED, 'utf8')) : await resolveFromApi()
// capital 기본 ID(MOCK_INF)는 사이클 대기 중일 수 있어 믿지 않는다 — 조회·override로 정해지지 않았으면 건너뛰게 한다
if (!override.capital) missing.add('capital')

export const seed = { ...defaults, ...override }

/** 로컬 API에서 그 시드 전략을 찾았는지 — 없으면 기본 ID라 화면이 404다(MOCK 시세 Toss 허용 IP 미등록 등) */
export const hasSeed = (key) => !missing.has(key)

export const tickerOf = (strategyId) =>
  Object.values(seed.accounts).map((s) => s[strategyId]).find(Boolean) ?? 'SOXL'

// 로컬 시드 미리보기의 availableCash는 항상 null이고 브라우저에서만 부른다 — 실제 응답에 가용 예수금 5000을 덮어
// 전략 등록 폼의 가용 예수금 힌트와 25·50·75·100% 채우기 버튼을 띄운다
export const stubSeedCash = (p) => p.route(`**/api/accounts/${seed.toss.accountId}/strategy-seed-preview**`, async (r) => {
  const res = await r.fetch()
  // 원본 헤더(content-length·content-encoding)를 넘기면 바뀐 본문과 어긋난다 — 상태 코드만 옮긴다
  r.fulfill({ status: res.status(), json: { ...(await res.json()), availableCash: 5000 } })
})
