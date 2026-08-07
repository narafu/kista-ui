import { describe, expect, it } from 'vitest'
import { safeRedirectPath } from './redirectPath'

describe('safeRedirectPath', () => {
  it('내부 상대 경로는 그대로 반환한다', () => {
    expect(safeRedirectPath('/accounts/new')).toBe('/accounts/new')
  })

  it('쿼리스트링을 보존한다', () => {
    expect(safeRedirectPath('/strategies?tab=all')).toBe('/strategies?tab=all')
  })

  it('null/undefined/빈 문자열은 null', () => {
    expect(safeRedirectPath(null)).toBeNull()
    expect(safeRedirectPath(undefined)).toBeNull()
    expect(safeRedirectPath('')).toBeNull()
  })

  it('절대 URL(외부 도메인)은 거부한다', () => {
    expect(safeRedirectPath('https://evil.com')).toBeNull()
    expect(safeRedirectPath('http://evil.com/phish')).toBeNull()
  })

  it('프로토콜 상대 URL(//evil.com)은 거부한다', () => {
    expect(safeRedirectPath('//evil.com')).toBeNull()
  })

  it('백슬래시로 //evil.com처럼 정규화되는 값은 거부한다', () => {
    expect(safeRedirectPath('/\\evil.com')).toBeNull()
    expect(safeRedirectPath('/\t/evil.com')).toBeNull()
  })

  it('dot-segment 정규화로 //evil.com이 되는 값은 거부한다 (재파싱 시 network-path reference로 둔갑)', () => {
    expect(safeRedirectPath('/.//evil.com')).toBeNull()
    expect(safeRedirectPath('/..//evil.com')).toBeNull()
    expect(safeRedirectPath('/./..//evil.com')).toBeNull()
    // 회귀 방지: 반환값을 실제 origin 기준으로 재파싱해도 다른 host가 되면 안 된다
    const result = safeRedirectPath('/.//evil.com')
    expect(result).toBeNull()
  })

  it('URL 인코딩된 슬래시(%2F)는 경로 구분자로 재해석되지 않아 안전하다', () => {
    expect(safeRedirectPath('/%2F%2Fevil.com')).toBe('/%2F%2Fevil.com')
    expect(new URL(safeRedirectPath('/%2F%2Fevil.com')!, 'https://kista-app.com').host).toBe('kista-app.com')
  })

  it('scheme처럼 보이지 않는 값은 sentinel 기준 상대 경로로 안전하게 처리된다', () => {
    expect(safeRedirectPath('::not a url::')).toBe('/::not%20a%20url::')
  })
})
