import { describe, it, expect } from 'vitest'
import { compareAssetDetail, compareCategoryPath } from './assetSort'

// 문자열 순서와 다르게 둬서 enum 선언 순서를 쓰는지 확인한다
const order = { assetClasses: ['EQUITY', 'CASH'], markets: ['GLOBAL', 'DOMESTIC'] }

const base = {
  id: 'id-1',
  amount: 100,
  accountOwner: '나',
  strategy: '배당',
  accountInstitution: '한투',
  accountName: '연금',
  assetClass: 'EQUITY',
  market: 'GLOBAL',
}

function sortIds(items: (typeof base)[]) {
  return [...items].sort((a, b) => compareAssetDetail(a, b, order)).map((i) => i.id)
}

describe('compareAssetDetail', () => {
  it('키 우선순위: 소유자 → 전략 → 기관 → 계좌명 → 자산군 → 시장 → 금액 큰 순 → id', () => {
    const items = [
      { ...base, id: 'owner', accountOwner: '아내', strategy: '가' },
      { ...base, id: 'strategy', strategy: '성장', accountInstitution: '가' },
      { ...base, id: 'institution', accountInstitution: '현대', accountName: '가' },
      { ...base, id: 'account', accountName: '일반', assetClass: 'EQUITY' },
      { ...base, id: 'assetClass', assetClass: 'CASH', market: 'GLOBAL' },
      { ...base, id: 'market', market: 'DOMESTIC', amount: 999 },
      { ...base, id: 'small', amount: 50 },
      { ...base, id: 'b-tie' },
      { ...base, id: 'a-tie' },
    ]
    // 나 < 아내, 배당 < 성장, 한투 < 현대, 연금 < 일반, EQUITY < CASH, GLOBAL < DOMESTIC, 100 > 50, a < b
    expect(sortIds(items)).toEqual(['a-tie', 'b-tie', 'small', 'market', 'assetClass', 'account', 'institution', 'strategy', 'owner'])
  })

  it('빈 값(null·undefined·빈 문자열)과 순서에 없는 enum은 맨 뒤', () => {
    const items = [
      { ...base, id: 'null', accountOwner: null as unknown as string },
      { ...base, id: 'empty', accountOwner: '' },
      { ...base, id: 'undef', accountOwner: undefined as unknown as string },
      { ...base, id: 'filled' },
    ]
    expect(sortIds(items)[0]).toBe('filled')

    const enums = [
      { ...base, id: 'unknown', assetClass: 'REAL_ESTATE' },
      { ...base, id: 'cash', assetClass: 'CASH' },
      { ...base, id: 'equity', assetClass: 'EQUITY' },
    ]
    expect(sortIds(enums)).toEqual(['equity', 'cash', 'unknown'])
  })
})

describe('compareCategoryPath', () => {
  const seg = (id: string, name: string, sortOrder: number) => ({ id, name, sortOrder })

  it('단계마다 sortOrder 오름차순, 같으면 이름 가나다순, 상위 경로가 먼저, 삭제(경로 없음)는 맨 뒤', () => {
    const paths = {
      deleted: undefined,
      invest2: [seg('l1b', '투자', 1)],
      saveB: [seg('l1a', '예적금', 0), seg('l2b', '적금', 0)],
      saveA: [seg('l1a', '예적금', 0), seg('l2a', '예금', 0)],
      saveFirst: [seg('l1a', '예적금', 0), seg('l2c', '파킹', -1)],
      saveRoot: [seg('l1a', '예적금', 0)],
    }
    const sorted = (Object.keys(paths) as (keyof typeof paths)[]).sort((a, b) => compareCategoryPath(paths[a], paths[b]))
    expect(sorted).toEqual(['saveRoot', 'saveFirst', 'saveA', 'saveB', 'invest2', 'deleted'])
  })
})
