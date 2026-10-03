// 로컬 dev 시드(kista-api scripts/dev-seed/seed.sh)의 계좌·전략 ID. visual-diff(시나리오·trading fixture)와 a11y-check가 함께 참조한다.
// 로컬 DB 시드가 다르면 KISTA_DEV_SEED=<json 경로>로 최상위 키 단위 덮어쓰기
import { readFileSync } from 'node:fs'

// MOCK 계좌: ACTIVE 전략, preview·prices 등 trading API가 실제로 200
const MOCK = 'a24b77e4-4b7e-42bc-9a4d-b52a7a686c7f'
const MOCK_INF = '07302a81-3628-4c3c-a17d-7658d1afe58f'
const MOCK_VR = '4141787f-ec49-436a-8e92-f74f01df644d'
// KIS 시드 계좌: 전략 PAUSED, preview 503
const KIS1 = '5eed0000-0000-0000-0000-00000000a001'
const KIS2 = '5eed0000-0000-0000-0000-00000000a002'

const defaults = {
  // 계좌 → 전략 ID → ticker. preview 모드 fixture가 previews 응답을 만들 때 사용
  accounts: { [MOCK]: { [MOCK_INF]: 'SOXL', [MOCK_VR]: 'TQQQ' } },
  // 시나리오가 여는 대표 전략 상세
  infinite: { accountId: MOCK, strategyId: MOCK_INF },
  vr: { accountId: MOCK, strategyId: MOCK_VR },
  paused: { accountId: KIS1, strategyId: '5eed0000-0000-0000-0000-000000000001' },
  privacy: { accountId: KIS2, strategyId: '5eed0000-0000-0000-0000-000000000004' },
}

const override = process.env.KISTA_DEV_SEED ? JSON.parse(readFileSync(process.env.KISTA_DEV_SEED, 'utf8')) : {}

export const seed = { ...defaults, ...override }

export const tickerOf = (strategyId) =>
  Object.values(seed.accounts).map((s) => s[strategyId]).find(Boolean) ?? 'SOXL'
