// 로컬 dev 시드(kista-api scripts/dev-seed/seed.sh)의 계좌·전략 ID. visual-diff(시나리오·trading fixture)와 a11y-check가 함께 참조한다.
// 로컬 API(8080·8081)가 떠 있으면 MOCK·KIS 시드 계좌·전략 ID를 실행 시 조회해 덮는다. KISTA_DEV_SEED=<json 경로>를 주면 조회 대신 그 파일로 최상위 키 단위 덮어쓰기
import { readFileSync } from 'node:fs'

// MOCK 계좌: ACTIVE 전략, preview·prices 등 trading API가 실제로 200
const MOCK = 'a24b77e4-4b7e-42bc-9a4d-b52a7a686c7f'
const MOCK_INF = '07302a81-3628-4c3c-a17d-7658d1afe58f'
const MOCK_VR = '4141787f-ec49-436a-8e92-f74f01df644d'
// KIS 시드 계좌: 전략 PAUSED, preview·margin 503
const KIS = '0a37eaa5-2b60-50c9-d45c-e1a5ae2f984a'
const KIS_PAUSED = '5e4856a3-e121-52bd-a9bf-8025b19911cf'

const defaults = {
  // 계좌 → 전략 ID → ticker. preview 모드 fixture가 previews 응답을 만들 때 사용
  accounts: { [MOCK]: { [MOCK_INF]: 'SOXL', [MOCK_VR]: 'TQQQ' } },
  // 시나리오가 여는 대표 전략 상세
  infinite: { accountId: MOCK, strategyId: MOCK_INF },
  vr: { accountId: MOCK, strategyId: MOCK_VR },
  paused: { accountId: KIS, strategyId: KIS_PAUSED },
  // 잔고 확인 화면용 실계좌(MOCK은 잔고 확인이 강제로 꺼진다)
  kis: { accountId: KIS },
}

// seed.sh는 MOCK·KIS 계좌·전략을 API로 등록해 ID가 DB마다 달라진다 — 로컬 API에서 닉네임·type·ticker로 찾아 기본값을 덮는다.
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
    // KIS 시드 계좌는 MOCK과 따로 찾는다 — 한쪽이 없어도 다른 쪽은 조회값을 쓴다
    const kisResolved = { accounts: {} }
    const kis = accounts.find((a) => a.broker === 'KIS' && a.nickname === '[시드] KIS 계좌')
    if (kis) {
      const kisStrategies = await get(`/api/accounts/${kis.id}/trading-cycles`)
      kisResolved.kis = { accountId: kis.id }
      kisResolved.accounts[kis.id] = Object.fromEntries(kisStrategies.map((s) => [s.id, s.ticker]))
      const paused = kisStrategies.find((s) => s.status === 'PAUSED')
      if (paused) kisResolved.paused = { accountId: kis.id, strategyId: paused.id }
    } else console.warn('[seed] KIS 시드 계좌 없음 — kis·paused는 기본 ID 사용')
    const account = accounts.find((a) => a.broker === 'MOCK' && a.nickname === '[시드] 모의계좌')
    if (!account) {
      console.warn('[seed] MOCK 시드 계좌 없음 — 기본 ID 사용(kista-api scripts/dev-seed/seed.sh 확인)')
      return { ...kisResolved, accounts: { ...defaults.accounts, ...kisResolved.accounts } }
    }
    const strategies = await get(`/api/accounts/${account.id}/trading-cycles`)
    // seed.sh 기준 ticker(SOXL·TQQQ)의 ACTIVE를 우선하고, 없으면 같은 type의 ACTIVE, 그다음 아무 상태
    const pick = (type, ticker) =>
      [(s) => s.ticker === ticker && s.status === 'ACTIVE', (s) => s.status === 'ACTIVE', () => true]
        .map((cond) => strategies.find((s) => s.type === type && cond(s)))
        .find(Boolean)
    // 기본값 계좌 맵에 합친다 — 못 찾은 키가 기본 ID로 남아도 tickerOf가 그 ID의 ticker를 계속 찾도록
    const resolved = { accounts: { ...defaults.accounts, [account.id]: Object.fromEntries(strategies.map((s) => [s.id, s.ticker])) } }
    for (const [key, type, ticker] of [['infinite', 'INFINITE', 'SOXL'], ['vr', 'VR', 'TQQQ']]) {
      const s = pick(type, ticker)
      if (s) resolved[key] = { accountId: account.id, strategyId: s.id }
      else console.warn(`[seed] MOCK 계좌에 ${type} 전략 없음 — ${key}는 기본 ID 사용(해당 화면 점검 실패 예상, kista-api scripts/dev-seed/seed.sh 확인)`)
    }
    return { ...resolved, ...kisResolved, accounts: { ...resolved.accounts, ...kisResolved.accounts } }
  } catch (error) {
    console.warn(`[seed] 로컬 API 조회 실패 — 기본 ID 사용: ${error.message}`)
    return {}
  }
}

const override = process.env.KISTA_DEV_SEED ? JSON.parse(readFileSync(process.env.KISTA_DEV_SEED, 'utf8')) : await resolveFromApi()

export const seed = { ...defaults, ...override }

export const tickerOf = (strategyId) =>
  Object.values(seed.accounts).map((s) => s[strategyId]).find(Boolean) ?? 'SOXL'

// KIS 시드 계좌의 예수금 조회는 503이고 브라우저에서만 부른다 — page.route로 USD 예수금을 채워 전략 등록 폼의 사용 비율 게이지를 띄운다
export const stubMargin = (p) => p.route(`**/api/accounts/${seed.kis.accountId}/margin`, (r) => r.fulfill({ json: [{ currency: 'USD', integratedOrderableAmount: 5000, foreignOrderableAmount: 5000, purchasableAmount: 5000 }] }))
