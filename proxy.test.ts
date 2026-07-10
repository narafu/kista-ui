import { describe, expect, it } from 'vitest'
import { isJwtExpired } from './proxy'

function makeJwt(payload: object): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `header.${encoded}.signature`
}

const nowSec = () => Math.floor(Date.now() / 1000)

describe('isJwtExpired', () => {
  it('만료까지 충분히 남은 토큰은 false', () => {
    expect(isJwtExpired(makeJwt({ exp: nowSec() + 3600 }))).toBe(false)
  })
  it('이미 만료된 토큰은 true', () => {
    expect(isJwtExpired(makeJwt({ exp: nowSec() - 10 }))).toBe(true)
  })
  it('버퍼(30초) 이내에 만료될 토큰은 true', () => {
    expect(isJwtExpired(makeJwt({ exp: nowSec() + 10 }))).toBe(true)
  })
  it('세그먼트가 3개가 아니면 true', () => {
    expect(isJwtExpired('not-a-jwt')).toBe(true)
  })
  it('exp 클레임이 없으면 true', () => {
    expect(isJwtExpired(makeJwt({})))
      .toBe(true)
  })
  it('payload가 JSON이 아니면 true', () => {
    expect(isJwtExpired('h.%%%.s')).toBe(true)
  })
})
