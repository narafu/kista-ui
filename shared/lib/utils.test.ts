import { describe, expect, it } from 'vitest'
import { groupConsecutiveBy, toSelectValue } from './utils'

describe('toSelectValue', () => {
  const items = [{ value: 'a' }, { value: 'b' }]

  it('목록에 있는 값은 그대로 돌려준다', () => {
    expect(toSelectValue(items, 'b')).toBe('b')
  })

  it('목록에 없거나 비어 있는 값은 null로 바꾼다', () => {
    expect(toSelectValue(items, 'z')).toBeNull()
    expect(toSelectValue(items, '')).toBeNull()
    expect(toSelectValue(items, null)).toBeNull()
    expect(toSelectValue(items, undefined)).toBeNull()
    expect(toSelectValue([], 'a')).toBeNull()
  })
})

describe('groupConsecutiveBy', () => {
  it('연속된 같은 키끼리 묶고 떨어진 같은 키는 별도 그룹으로 둔다', () => {
    expect(groupConsecutiveBy(['a1', 'a2', 'b1', 'a3'], (s) => s[0])).toEqual([
      { key: 'a', items: ['a1', 'a2'] },
      { key: 'b', items: ['b1'] },
      { key: 'a', items: ['a3'] },
    ])
    expect(groupConsecutiveBy([], (s: string) => s)).toEqual([])
  })
})
