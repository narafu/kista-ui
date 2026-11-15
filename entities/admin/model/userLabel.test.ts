import { describe, expect, it } from 'vitest'
import { userLabel } from './userLabel'

describe('userLabel', () => {
  it('닉네임이 있으면 그대로 쓴다', () => {
    expect(userLabel('홍길동', 'abcdef123456')).toBe('홍길동')
  })

  it('닉네임이 null이면 ID 앞 8자로 대신한다', () => {
    expect(userLabel(null, 'abcdef123456')).toBe('ID abcdef12')
  })
})
