import { describe, expect, it } from 'vitest'
import { toSelectValue } from './utils'

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
